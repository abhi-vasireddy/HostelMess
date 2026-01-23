export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  CANTEEN_STAFF = 'CANTEEN_STAFF'
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  deactivatedUntil?: string | null;
}

export enum MealType {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  SNACKS = 'Snacks',
  DINNER = 'Dinner'
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  isVeg: boolean;
  image?: string;
  rating?: number;
  ratingCount?: number;
}

export interface DailyMenu {
  day: string;
  [MealType.BREAKFAST]: Dish[];
  [MealType.LUNCH]: Dish[];
  [MealType.SNACKS]: Dish[];
  [MealType.DINNER]: Dish[];
}

export interface Feedback {
  id: string;
  dishId: string;
  dishName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  mealType: MealType;
  date: string;
  timestamp: number;
}

export enum AnnouncementType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success'
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  expiresOn: string;
  pinned?: boolean; // 👈 Added for Hostel Notices
  createdAt: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface CanteenItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
}

export interface AppSettings {
  canteenEnabled: boolean;
  splashVideoEnabled: boolean;
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface TodoTask {
  id: string;
  text: string;
  description?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  dueDate: string;
  createdAt: number;
}

export interface AdminNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

// --- NEW HOSTEL TYPES ---

export enum ComplaintStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export interface HostelComplaint {
  id: string;
  userId: string;
  userName: string;
  room: string;
  type: string; // Plumbing, Electrical, etc.
  desc: string;
  status: ComplaintStatus;
  createdAt: number;
  dateString: string; // For display (e.g. "2h ago" or ISO date)
}

export interface WashingMachine {
  id: string;
  name: string;
  capacity: string;
}

export interface LaundryBooking {
  id: string;
  machineId: string;
  userId: string;
  userName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  date: string;      // YYYY-MM-DD
  createdAt: number;
}

// --- NEW SERVICE MODULE TYPE ---
export interface ServiceModule {
  id: string;
  title: string;
  description: string;
  iconName: string; // e.g. 'Book', 'Wifi', 'Dumbbell'
  path: string;     // e.g. '/library' or 'https://google.com'
  color: string;    // e.g. 'from-pink-500 to-rose-500'
  isActive: boolean; // true = Clickable, false = Coming Soon (Locked)
  isExternal?: boolean; // true if path is a website URL
  order?: number; // 👈 NEW: Add this line
}

// ... (keep all existing code)

// --- NEW: SPORTS MODULE TYPES ---
export interface SportsEquipment {
  id: string;
  name: string;
  category: 'Court' | 'Gear';
  total: number;
  available: number;
  image?: string; 
}

export interface SportsBooking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'Active' | 'Completed';
}

export interface TeamRequest {
  id: string;
  sport: string; // e.g. "Cricket", "Badminton"
  creatorName: string;
  creatorId: string;
  date: string;
  time: string;
  playersNeeded: number;
  playersJoined: string[]; // List of names
  description: string;
}