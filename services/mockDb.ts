import { User, UserRole, DailyMenu, MealType, Announcement, AnnouncementType, Feedback, Suggestion, AppSettings, CanteenItem, TodoTask, AdminNote, TaskPriority } from '../types';

// Initial Mock Data
// Extended with passwords for demo purposes
const MOCK_USERS = [
  { uid: 'admin1', email: 'admin@hostel.com', displayName: 'Warden Smith', role: UserRole.ADMIN, password: 'password' },
  { uid: 'student1', email: 'student@hostel.com', displayName: 'John Doe', role: UserRole.STUDENT, password: 'password' },
  { uid: 'student2', email: 'jane@hostel.com', displayName: 'Jane Roe', role: UserRole.STUDENT, deactivatedUntil: '2025-01-01', password: 'password' },
];

const INITIAL_MENU: DailyMenu[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
  day,
  [MealType.BREAKFAST]: [{ id: `${day}-b-1`, name: 'Idli Sambar', description: 'Steamed rice cakes with lentil soup', isVeg: true, image: 'https://picsum.photos/100/100' }],
  [MealType.LUNCH]: [{ id: `${day}-l-1`, name: 'Rice & Curry', description: 'Steamed rice with seasonal veg curry', isVeg: true, image: 'https://picsum.photos/100/101' }],
  [MealType.SNACKS]: day === 'Sunday' ? [] : [{ id: `${day}-s-1`, name: 'Samosa', description: 'Fried pastry', isVeg: true, image: 'https://picsum.photos/100/102' }],
  [MealType.DINNER]: [{ id: `${day}-d-1`, name: 'Chapati & Dal', description: 'Wheat flatbread with lentils', isVeg: true, image: 'https://picsum.photos/100/103' }]
}));

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome!',
    message: 'Welcome to the new Hostel Food Tracker app.',
    type: AnnouncementType.INFO,
    isActive: true,
    expiresOn: '2026-01-01',
    createdAt: Date.now()
  }
];

const INITIAL_CANTEEN_MENU: CanteenItem[] = [
  { id: 'c1', name: 'Veg Burger', price: 45, category: 'Snacks', isAvailable: true, image: 'https://picsum.photos/200/200?random=1' },
  { id: 'c2', name: 'Chicken Sandwich', price: 60, category: 'Snacks', isAvailable: true, image: 'https://picsum.photos/200/200?random=2' },
  { id: 'c3', name: 'Cold Coffee', price: 30, category: 'Drinks', isAvailable: true, image: 'https://picsum.photos/200/200?random=3' },
  { id: 'c4', name: 'Fruit Salad', price: 40, category: 'Healthy', isAvailable: false, image: 'https://picsum.photos/200/200?random=4' },
];

const INITIAL_TODOS: TodoTask[] = [
  { id: 't1', text: 'Review next week menu', description: 'Check nutrition balance for the lunch menu.', isCompleted: false, priority: TaskPriority.HIGH, dueDate: '2024-12-31', createdAt: Date.now() },
  { id: 't2', text: 'Call vendor for rice supply', description: 'Need 50kg basmati rice by Monday.', isCompleted: true, priority: TaskPriority.MEDIUM, dueDate: '2024-12-30', createdAt: Date.now() }
];

const INITIAL_NOTES: AdminNote[] = [
  { id: 'n1', title: 'Vendor Contacts', content: 'Vegetables: +91-9876543210\nMilk: +91-1234567890', createdAt: Date.now() }
];

// Mock Feedback to ensure "My Feedback" isn't empty for demo
const INITIAL_FEEDBACK: Feedback[] = [
  {
    id: 'f1',
    dishId: 'Monday-b-1',
    dishName: 'Idli Sambar',
    userId: 'student1',
    userName: 'John Doe',
    rating: 5,
    comment: 'Delicious breakfast!',
    mealType: MealType.BREAKFAST,
    date: '2024-01-01', // Old date, just for history
    timestamp: Date.now() - 86400000
  }
];

// Local Storage Keys
const KEYS = {
  USERS: 'hft_users',
  MENU: 'hft_menu',
  FEEDBACK: 'hft_feedback',
  ANNOUNCEMENTS: 'hft_announcements',
  SUGGESTIONS: 'hft_suggestions',
  SETTINGS: 'hft_settings',
  CURRENT_USER: 'hft_current_user',
  CANTEEN_MENU: 'hft_canteen_menu',
  TODOS: 'hft_todos',
  NOTES: 'hft_notes'
};

// Helpers
const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

export const MockDB = {
  // Auth
  login: async (email: string, password?: string): Promise<User> => {
    // We type cast to any here because 'password' isn't on the public User interface
    const users = getStorage<any[]>(KEYS.USERS, MOCK_USERS);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) throw new Error('User not found');
    
    // Check Password
    if (password && user.password && user.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    // Check deactivation
    if (user.deactivatedUntil) {
      const now = new Date();
      const deactivationEnd = new Date(user.deactivatedUntil);
      if (now < deactivationEnd) {
        throw new Error(`Account deactivated until ${deactivationEnd.toLocaleDateString()}`);
      }
    }

    // Remove password before returning/storing session
    const { password: _, ...userSession } = user;
    setStorage(KEYS.CURRENT_USER, userSession);
    return userSession as User;
  },

  getCurrentUser: (): User | null => {
    return getStorage<User | null>(KEYS.CURRENT_USER, null);
  },

  logout: async () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  // Menu
  getWeeklyMenu: async (): Promise<DailyMenu[]> => {
    return getStorage<DailyMenu[]>(KEYS.MENU, INITIAL_MENU);
  },

  updateMenu: async (updatedMenu: DailyMenu[]): Promise<void> => {
    setStorage(KEYS.MENU, updatedMenu);
  },

  // Canteen
  getCanteenMenu: async (): Promise<CanteenItem[]> => {
    return getStorage<CanteenItem[]>(KEYS.CANTEEN_MENU, INITIAL_CANTEEN_MENU);
  },

  saveCanteenItem: async (item: CanteenItem): Promise<void> => {
    const list = getStorage<CanteenItem[]>(KEYS.CANTEEN_MENU, INITIAL_CANTEEN_MENU);
    const index = list.findIndex(i => i.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.push(item);
    }
    setStorage(KEYS.CANTEEN_MENU, list);
  },

  deleteCanteenItem: async (id: string): Promise<void> => {
    let list = getStorage<CanteenItem[]>(KEYS.CANTEEN_MENU, INITIAL_CANTEEN_MENU);
    list = list.filter(i => i.id !== id);
    setStorage(KEYS.CANTEEN_MENU, list);
  },

  // Feedback
  submitFeedback: async (feedback: Feedback): Promise<void> => {
    const allFeedback = getStorage<Feedback[]>(KEYS.FEEDBACK, INITIAL_FEEDBACK);
    allFeedback.push(feedback);
    setStorage(KEYS.FEEDBACK, allFeedback);
  },

  getAllFeedback: async (): Promise<Feedback[]> => {
    return getStorage<Feedback[]>(KEYS.FEEDBACK, INITIAL_FEEDBACK);
  },

  getFeedbackForDish: async (dishId: string): Promise<Feedback[]> => {
    const all = getStorage<Feedback[]>(KEYS.FEEDBACK, INITIAL_FEEDBACK);
    return all.filter(f => f.dishId === dishId);
  },

  deleteFeedback: async (id: string): Promise<void> => {
    let all = getStorage<Feedback[]>(KEYS.FEEDBACK, INITIAL_FEEDBACK);
    all = all.filter(f => f.id !== id);
    setStorage(KEYS.FEEDBACK, all);
  },

  // Announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    let announcements = getStorage<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    const now = new Date().toISOString();
    return announcements.filter(a => a.isActive && a.expiresOn > now);
  },

  getAllAnnouncementsAdmin: async (): Promise<Announcement[]> => {
    return getStorage<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  },

  saveAnnouncement: async (announcement: Announcement): Promise<void> => {
    const list = getStorage<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    const index = list.findIndex(a => a.id === announcement.id);
    if (index >= 0) {
      list[index] = announcement;
    } else {
      list.unshift(announcement);
    }
    setStorage(KEYS.ANNOUNCEMENTS, list);
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    let list = getStorage<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    list = list.filter(a => a.id !== id);
    setStorage(KEYS.ANNOUNCEMENTS, list);
  },

  // Users (Admin)
  getAllUsers: async (): Promise<User[]> => {
    const users = getStorage<any[]>(KEYS.USERS, MOCK_USERS);
    return users.map(({ password, ...u }) => u as User);
  },

  updateUserStatus: async (uid: string, deactivatedUntil: string | null): Promise<void> => {
    const users = getStorage<User[]>(KEYS.USERS, MOCK_USERS);
    const updatedUsers = users.map(u => u.uid === uid ? { ...u, deactivatedUntil } : u);
    setStorage(KEYS.USERS, updatedUsers);
  },

  updateUserRole: async (uid: string, newRole: UserRole): Promise<void> => {
    const users = getStorage<any[]>(KEYS.USERS, MOCK_USERS);
    const updatedUsers = users.map(u => u.uid === uid ? { ...u, role: newRole } : u);
    setStorage(KEYS.USERS, updatedUsers);
  },

  importUsers: async (newUsers: {email: string, displayName: string, password?: string, role?: string}[]): Promise<void> => {
     const currentUsers = getStorage<any[]>(KEYS.USERS, MOCK_USERS);
     const existingEmails = new Set(currentUsers.map(u => u.email));
     const uniqueNewUsers = newUsers.filter(u => !existingEmails.has(u.email));
     
     const usersToAdd = uniqueNewUsers.map(u => ({
         uid: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         email: u.email,
         displayName: u.displayName,
         role: u.role === 'ADMIN' ? UserRole.ADMIN : UserRole.STUDENT,
         password: u.password || 'password123' 
     }));

     setStorage(KEYS.USERS, [...currentUsers, ...usersToAdd]);
  },

  // Suggestions
  submitSuggestion: async (suggestion: Suggestion): Promise<void> => {
    const list = getStorage<Suggestion[]>(KEYS.SUGGESTIONS, []);
    list.unshift(suggestion);
    setStorage(KEYS.SUGGESTIONS, list);
  },

  getSuggestions: async (): Promise<Suggestion[]> => {
    return getStorage<Suggestion[]>(KEYS.SUGGESTIONS, []);
  },

  deleteSuggestion: async (id: string): Promise<void> => {
    let list = getStorage<Suggestion[]>(KEYS.SUGGESTIONS, []);
    list = list.filter(s => s.id !== id);
    setStorage(KEYS.SUGGESTIONS, list);
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => {
    return getStorage<AppSettings>(KEYS.SETTINGS, { canteenEnabled: false });
  },

  updateSettings: async (settings: AppSettings): Promise<void> => {
    setStorage(KEYS.SETTINGS, settings);
  },

  // Todos
  getTodos: async (): Promise<TodoTask[]> => {
    return getStorage<TodoTask[]>(KEYS.TODOS, INITIAL_TODOS);
  },

  saveTodo: async (task: TodoTask): Promise<void> => {
    const list = getStorage<TodoTask[]>(KEYS.TODOS, INITIAL_TODOS);
    const index = list.findIndex(t => t.id === task.id);
    if (index >= 0) list[index] = task;
    else list.unshift(task);
    setStorage(KEYS.TODOS, list);
  },

  updateAllTodos: async (todos: TodoTask[]): Promise<void> => {
    setStorage(KEYS.TODOS, todos);
  },

  deleteTodo: async (id: string): Promise<void> => {
    let list = getStorage<TodoTask[]>(KEYS.TODOS, INITIAL_TODOS);
    list = list.filter(t => t.id !== id);
    setStorage(KEYS.TODOS, list);
  },

  // Notes
  getNotes: async (): Promise<AdminNote[]> => {
    return getStorage<AdminNote[]>(KEYS.NOTES, INITIAL_NOTES);
  },

  saveNote: async (note: AdminNote): Promise<void> => {
    const list = getStorage<AdminNote[]>(KEYS.NOTES, INITIAL_NOTES);
    const index = list.findIndex(n => n.id === note.id);
    if (index >= 0) list[index] = note;
    else list.unshift(note);
    setStorage(KEYS.NOTES, list);
  },

  deleteNote: async (id: string): Promise<void> => {
    let list = getStorage<AdminNote[]>(KEYS.NOTES, INITIAL_NOTES);
    list = list.filter(n => n.id !== id);
    setStorage(KEYS.NOTES, list);
  }
};