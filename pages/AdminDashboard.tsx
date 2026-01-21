import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, DailyMenu, Announcement, AnnouncementType, Feedback, AppSettings, MealType, Dish, CanteenItem, TodoTask, TaskPriority, AdminNote, Suggestion, UserRole } from '../types';
import { MockDB } from '../services/mockDb';
import { generateAIInsights } from '../services/geminiService';
import { Button } from '../components/Button';
import { useAuth } from '../App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Menu as MenuIcon, Sparkles, Trash2, Plus, CheckCircle2, Pencil, X, MessageSquare, Search, UtensilsCrossed, Calendar, Upload, CheckSquare, StickyNote, Clock, Check, Filter, Info, Download, Lightbulb, ChevronDown, GripVertical, Bold, Italic, List, Video, Lock, Settings, ArrowLeft } from 'lucide-react'; // 👈 Added ArrowLeft
import { useNavigate } from 'react-router-dom'; // 👈 Added useNavigate
import { getCurrentDayName, getTodayDateString } from '../services/timeUtils';

// --- ANIMATION IMPORTS ---
import { LottiePlayer } from '../components/LottiePlayer';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/animations/loading.json';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // 👈 Initialize navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'users' | 'announcements' | 'feedback' | 'canteen' | 'todos' | 'notes' | 'suggestions'>(
    user?.role === UserRole.CANTEEN_STAFF ? 'canteen' : 'dashboard'
  );
  
  // --- LOADING & ERROR STATES ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [menu, setMenu] = useState<DailyMenu[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [canteenMenu, setCanteenMenu] = useState<CanteenItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({canteenEnabled: false, splashVideoEnabled: false});
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // UI States
  const [showAddCanteenModal, setShowAddCanteenModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [aiInsights, setAiInsights] = useState<{summary: string, suggestions: string[]} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: AnnouncementType.INFO, expiresOn: '' });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', password: 'password123', role: 'STUDENT' });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [newTodo, setNewTodo] = useState<{text: string, description: string, priority: TaskPriority, dueDate: string}>({text: '', description: '', priority: TaskPriority.MEDIUM, dueDate: ''});
  const [newNote, setNewNote] = useState<{title: string, content: string}>({title: '', content: ''});
  
  // Menu Management State
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [editingDish, setEditingDish] = useState<Partial<Dish> | null>(null);
  const [editingMealType, setEditingMealType] = useState<MealType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Canteen Management State
  const [editingCanteenItem, setEditingCanteenItem] = useState<Partial<CanteenItem> | null>(null);
  const [isCanteenModalOpen, setIsCanteenModalOpen] = useState(false);

  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deactivateModalUser, setDeactivateModalUser] = useState<User | null>(null);
  const [deactivationDate, setDeactivationDate] = useState('');

  // Feedback State
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number | 'all'>('all');
  const [feedbackDishFilter, setFeedbackDishFilter] = useState<string>('all');
  const [showRecentFeedbackOnly, setShowRecentFeedbackOnly] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    setSelectedDay(getCurrentDayName());
    loadData();
  }, []);

  const loadData = async () => {
    try {
        setLoading(true);
        setError(false);

        const [u, m, f, a, s, c, t, n, sugg] = await Promise.all([
            MockDB.getAllUsers(),
            MockDB.getWeeklyMenu(),
            MockDB.getAllFeedback(),
            MockDB.getAllAnnouncementsAdmin(),
            MockDB.getSettings(),
            MockDB.getCanteenMenu(),
            MockDB.getTodos(),
            MockDB.getNotes(),
            MockDB.getSuggestions()
        ]);

        setUsers(u);
        setMenu(m);
        setFeedback(f);
        setAnnouncements(a);
        setSettings(s);
        setCanteenMenu(c);
        setTodos(t);
        setNotes(n);
        setSuggestions(sugg);
    } catch (err) {
        console.error("Failed to load admin data", err);
        setError(true);
    } finally {
        setTimeout(() => setLoading(false), 800);
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    try {
      await MockDB.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to update settings:", error);
      alert("Error saving settings.");
    }
  };

  const handleToggleCanteenAvailability = async (item: CanteenItem) => {
    try {
      await MockDB.updateCanteenItem({ ...item, isAvailable: !item.isAvailable });
      const updated = await MockDB.getCanteenMenu();
      setCanteenMenu(updated);
    } catch (error) { console.error(error); }
  };

  const toggleCanteen = async () => {
    const newS = { ...settings, canteenEnabled: !settings.canteenEnabled };
    await handleUpdateSettings(newS);
  };

  // --- AI & Handlers ---
  const handleGenerateAI = async () => {
    setAiLoading(true);
    const insights = await generateAIInsights(feedback);
    setAiInsights(insights);
    setAiLoading(false);
  };

  // --- Announcement Handlers ---
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await MockDB.saveAnnouncement({
       id: Date.now().toString(),
       title: newAnnouncement.title,
       message: newAnnouncement.message,
       type: newAnnouncement.type,
       expiresOn: newAnnouncement.expiresOn,
       isActive: true,
       createdAt: Date.now()
    });
    setNewAnnouncement({ title: '', message: '', type: AnnouncementType.INFO, expiresOn: '' });
    loadData();
  };
  
  const toggleAnnouncement = async (ann: Announcement) => {
    await MockDB.saveAnnouncement({ ...ann, isActive: !ann.isActive });
    loadData();
  };

  const handleDeleteAnnouncement = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(!window.confirm("Are you sure you want to delete this announcement?")) return;
    await MockDB.deleteAnnouncement(id);
    loadData();
  };

  const insertTextFormat = (format: 'bold' | 'italic' | 'list') => {
    const textarea = document.getElementById('announcementInput') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newAnnouncement.message;
    
    let toInsert = '';
    let newCursorPos = end;

    if (format === 'bold') {
        const selection = text.slice(start, end);
        toInsert = `**${selection}**`;
        newCursorPos = start + toInsert.length;
        if (!selection) newCursorPos -= 2; 
    } else if (format === 'italic') {
        const selection = text.slice(start, end);
        toInsert = `_${selection}_`;
        newCursorPos = start + toInsert.length;
        if (!selection) newCursorPos -= 1;
    } else if (format === 'list') {
        const selection = text.slice(start, end);
        const prefix = text.slice(0, start).endsWith('\n') || start === 0 ? '' : '\n';
        toInsert = `${prefix}- ${selection}`;
        newCursorPos = start + toInsert.length;
    }

    const newText = text.slice(0, start) + toInsert + text.slice(end);
    setNewAnnouncement({ ...newAnnouncement, message: newText });
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleDeleteFeedback = async (id: string, e?: React.MouseEvent) => {
    if(e) { e.stopPropagation(); }
    if (!window.confirm("Are you sure you want to delete this feedback permanently?")) return;
    await MockDB.deleteFeedback(id);
    if(selectedFeedback && selectedFeedback.id === id) setSelectedFeedback(null);
    loadData();
  };

  // --- User Management Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      
      const newUsers = lines.slice(1).map(line => {
        const columns = line.split(',').map(s => s.trim());
        if (columns.length < 2) return null;

        const email = columns[0];
        const displayName = columns[1];
        const password = columns[2] || '123456';
        const role = columns[3] ? columns[3].toUpperCase() : 'STUDENT';
        
        if(email && displayName) return { email, displayName, password, role };
        return null;
      }).filter(u => u !== null) as {email: string, displayName: string, password?: string, role?: string}[];

      if (newUsers.length > 0) {
        if(window.confirm(`Found ${newUsers.length} users. Import them?`)) {
            await MockDB.importUsers(newUsers);
            loadData();
            alert('Users are Loaded');
        }
      } else {
        alert('No valid users found in CSV.\nFormat: email,displayName,password,role');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName) return;
    
    await MockDB.importUsers([{
        email: newUser.email,
        displayName: newUser.displayName,
        password: newUser.password,
        role: newUser.role
    }]);
    
    setIsUserModalOpen(false);
    setNewUser({ email: '', displayName: '', password: 'password123', role: 'STUDENT' });
    alert("User created successfully!");
    loadData();
  };

  const openDeactivateModal = (user: User) => {
    setDeactivateModalUser(user);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setDeactivationDate(defaultDate.toISOString().split('T')[0]);
  };

  const handleConfirmDeactivation = async () => {
     if(!deactivateModalUser || !deactivationDate) return;
     const date = new Date(deactivationDate);
     date.setHours(23, 59, 59, 999);
     await MockDB.updateUserStatus(deactivateModalUser.uid, date.toISOString());
     setDeactivateModalUser(null);
     loadData();
  };
  
  const handleReactivate = async (uid: string) => {
     await MockDB.updateUserStatus(uid, null);
     setDeactivateModalUser(null);
     loadData();
  };

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
     if (uid === 'admin1' && newRole !== UserRole.ADMIN) {
        alert("Cannot change role for the main demo admin.");
        return;
     }
     await MockDB.updateUserRole(uid, newRole);
     loadData();
  };

  // --- Todo & Notes & Suggestions Handlers ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.text) return;
    const newTask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: newTodo.text,
      description: newTodo.description,
      priority: newTodo.priority,
      dueDate: newTodo.dueDate,
      isCompleted: false,
      createdAt: Date.now()
    };
    setTodos([newTask, ...todos]);
    await MockDB.saveTodo(newTask);
    setNewTodo({text: '', description: '', priority: TaskPriority.MEDIUM, dueDate: ''});
  };

  const toggleTodo = async (task: TodoTask) => {
    const updatedTask = { ...task, isCompleted: !task.isCompleted };
    const updatedList = todos.map(t => t.id === task.id ? updatedTask : t);
    setTodos(updatedList);
    await MockDB.saveTodo(updatedTask);
  };

  const handleDeleteTodo = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!window.confirm("Delete this task?")) return;
    const updatedList = todos.filter(t => t.id !== id);
    setTodos(updatedList);
    await MockDB.deleteTodo(id);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string, priority: TaskPriority) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const priorityList = todos.filter(t => !t.isCompleted && t.priority === priority);
    
    const dragIndex = priorityList.findIndex(t => t.id === draggedTaskId);
    const hoverIndex = priorityList.findIndex(t => t.id === targetTaskId);

    if (dragIndex === -1 || hoverIndex === -1) return;

    const newPriorityList = [...priorityList];
    const [removed] = newPriorityList.splice(dragIndex, 1);
    newPriorityList.splice(hoverIndex, 0, removed);

    const high = priority === TaskPriority.HIGH ? newPriorityList : todos.filter(t => !t.isCompleted && t.priority === TaskPriority.HIGH);
    const medium = priority === TaskPriority.MEDIUM ? newPriorityList : todos.filter(t => !t.isCompleted && t.priority === TaskPriority.MEDIUM);
    const low = priority === TaskPriority.LOW ? newPriorityList : todos.filter(t => !t.isCompleted && t.priority === TaskPriority.LOW);
    const completed = todos.filter(t => t.isCompleted);

    const newTodos = [...high, ...medium, ...low, ...completed];
    setTodos(newTodos);
    setDraggedTaskId(null);
    await MockDB.updateAllTodos(newTodos);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title && !newNote.content) return;
    await MockDB.saveNote({
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      createdAt: Date.now()
    });
    setNewNote({title: '', content: ''});
    loadData();
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    await MockDB.deleteNote(id);
    loadData();
  };

  const handleDeleteSuggestion = async (id: string) => {
    if(!window.confirm("Delete this suggestion?")) return;
    await MockDB.deleteSuggestion(id);
    loadData();
  };

  // --- Menu Management Handlers ---
  const handleOpenEditDish = (dish: Dish, mealType: MealType) => {
    setEditingDish({ ...dish });
    setEditingMealType(mealType);
    setIsEditModalOpen(true);
  };

  const handleOpenAddDish = (mealType: MealType) => {
    setEditingDish({
      id: Date.now().toString(),
      name: '',
      description: '',
      isVeg: true,
      image: 'https://picsum.photos/200/200'
    });
    setEditingMealType(mealType);
    setIsEditModalOpen(true);
  };

  const handleSaveDish = async () => {
    if (!editingDish || !editingMealType || !editingDish.name) return;

    const newMenu = [...menu];
    const dayIndex = newMenu.findIndex(m => m.day === selectedDay);
    if (dayIndex === -1) return;

    const currentDishes = newMenu[dayIndex][editingMealType];
    const dishIndex = currentDishes.findIndex(d => d.id === editingDish.id);

    const dishToSave = editingDish as Dish;

    if (dishIndex > -1) {
      currentDishes[dishIndex] = dishToSave;
    } else {
      currentDishes.push(dishToSave);
    }

    setMenu(newMenu);
    await MockDB.updateMenu(newMenu);
    setIsEditModalOpen(false);
    setEditingDish(null);
  };

  const handleDeleteDish = async (dishId: string, mealType: MealType) => {
    if (!window.confirm("Are you sure you want to delete this dish?")) return;

    const newMenu = [...menu];
    const dayIndex = newMenu.findIndex(m => m.day === selectedDay);
    if (dayIndex === -1) return;

    newMenu[dayIndex][mealType] = newMenu[dayIndex][mealType].filter(d => d.id !== dishId);
    
    setMenu(newMenu);
    await MockDB.updateMenu(newMenu);
  };

  // --- Canteen Management Handlers ---
  const handleOpenAddCanteenItem = () => {
    setEditingCanteenItem({
      id: Date.now().toString(),
      name: '',
      price: 0,
      category: 'Snacks',
      image: '',
      isAvailable: true
    });
    setIsCanteenModalOpen(true);
  };

  const handleOpenEditCanteenItem = (item: CanteenItem) => {
    setEditingCanteenItem({ ...item });
    setIsCanteenModalOpen(true);
  };

  const handleSaveCanteenItem = async () => {
    if (!editingCanteenItem || !editingCanteenItem.name) return;
    await MockDB.saveCanteenItem(editingCanteenItem as CanteenItem);
    await loadData();
    setIsCanteenModalOpen(false);
    setEditingCanteenItem(null);
  };

  const handleDeleteCanteenItem = async (id: string) => {
    if(!window.confirm("Delete this item from canteen?")) return;
    await MockDB.deleteCanteenItem(id);
    await loadData();
  };

  // --- Optimized Chart & Filtering Data ---
  const todayStr = getTodayDateString();
  const todayFeedback = feedback.filter(f => f.date === todayStr);
  
  const chartData = [MealType.BREAKFAST, MealType.LUNCH, MealType.SNACKS, MealType.DINNER].map(type => {
    const relevant = todayFeedback.filter(f => f.mealType === type);
    const avg = relevant.length ? relevant.reduce((a, b) => a + b.rating, 0) / relevant.length : 0;
    return { name: type, rating: parseFloat(avg.toFixed(1)) };
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDayMenu = menu.find(m => m.day === selectedDay);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const pendingTodos = todos.filter(t => !t.isCompleted);
  const completedTodos = todos.filter(t => t.isCompleted);

  const filteredFeedback = useMemo(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return feedback.filter(f => {
      if (showRecentFeedbackOnly) {
        if (f.timestamp) {
           if (now - f.timestamp > twentyFourHours) return false;
        } else {
           if (f.date !== todayStr) return false;
        }
      }
      if (feedbackRatingFilter !== 'all' && f.rating !== feedbackRatingFilter) return false;
      if (feedbackDishFilter !== 'all' && f.dishName !== feedbackDishFilter) return false;
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [feedback, showRecentFeedbackOnly, feedbackRatingFilter, feedbackDishFilter, todayStr]);

  const feedbackStats = useMemo(() => {
     const avg = feedback.length 
        ? (feedback.reduce((a,b) => a + b.rating, 0) / feedback.length).toFixed(1) 
        : '0.0';
     
     const counts = [0, 0, 0, 0, 0];
     feedback.forEach(f => {
        if(f.rating >= 1 && f.rating <= 5) counts[f.rating - 1]++;
     });

     return { averageRating: avg, ratingCounts: counts };
  }, [feedback]);

  const uniqueDishes = useMemo(() => {
    return Array.from(new Set(feedback.map(f => f.dishName))).sort();
  }, [feedback]);

  const handleExportFeedback = () => {
    if (filteredFeedback.length === 0) {
      alert("No feedback data to export based on current filters.");
      return;
    }

    const headers = ['Date', 'Meal Type', 'Dish Name', 'Rating', 'Comment', 'User'];
    const csvContent = [
      headers.join(','),
      ...filteredFeedback.map(f => [
        `"${f.date}"`,
        `"${f.mealType}"`,
        `"${f.dishName.replace(/"/g, '""')}"`, 
        f.rating,
        `"${(f.comment || '').replace(/"/g, '""')}"`,
        `"${f.userName.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback_export_${timestamp}.csv`;
    link.click();
  };

  // --- RENDER: LOADING STATE (JSON Animation) ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-64 h-64">
           <Lottie animationData={loadingAnimation} loop={true} />
        </div>
        <p className="text-slate-500 animate-pulse mt-4 font-medium">Loading Admin Dashboard...</p>
      </div>
    );
  }

  // --- RENDER: ERROR STATE (404 Lottie) ---
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <LottiePlayer type="404" className="w-64 h-64 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">System Error</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
          Unable to load administrative data.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // --- RENDER: MAIN DASHBOARD ---
  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar - Collapsible on Mobile, Sticky on Desktop */}
      <aside className="w-full md:w-64 flex-shrink-0 sticky top-2 md:top-24 h-fit z-40 transition-all duration-300">
        
        {/* Mobile Toggle Header (Visible only on mobile) */}
        <div className="md:hidden flex justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-4 transition-all duration-300">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500"/> Admin Panel
            </span>
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
            >
                {isSidebarOpen ? <X size={20}/> : <MenuIcon size={20}/>}
            </button>
        </div>

        {/* Sidebar Content (Hidden on mobile unless open) */}
        <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block space-y-6 animate-in slide-in-from-top-4 duration-300 md:animate-none max-h-[80vh] overflow-y-auto md:max-h-none md:overflow-visible custom-scrollbar`}>
            
            {/* 🔴 NEW BACK BUTTON IS HERE */}
            <div className="px-3 mb-2">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 font-medium"
              >
                <ArrowLeft size={18} /> Back to Hub
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 overflow-hidden">
              <nav className="space-y-1">
                {/* 👇 CHANGED: Filter menu items based on Role */}
                  {[
                  { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
                  { id: 'menu', icon: MenuIcon, label: 'Menu Mgmt' },
                  { id: 'canteen', icon: UtensilsCrossed, label: 'Canteen' },
                  { id: 'users', icon: Users, label: 'Users' },
                  { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
                  { id: 'suggestions', icon: Lightbulb, label: 'Suggestions' },
                  { id: 'announcements', icon: AlertTriangle, label: 'Announcements' },
                  { id: 'todos', icon: CheckSquare, label: 'To-Do List' },
                  { id: 'notes', icon: StickyNote, label: 'Notes' },
                  ].filter(item => {
                  // If user is Canteen Staff, ONLY show the Canteen tab
                  if (user?.role === UserRole.CANTEEN_STAFF) {
                     return item.id === 'canteen';
                  }
                  // Otherwise (Admin), show everything
                  return true;
                  }).map(item => (
                  <button 
                     key={item.id}
                     onClick={() => {
                        setActiveTab(item.id as any);
                        setIsSidebarOpen(false);
                     }} 
                     className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-all ${
                        activeTab === item.id 
                        ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                     }`}
                  >
                     <item.icon size={18} /> {item.label}
                  </button>
                  ))}
              </nav>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Quick Settings</h4>
              {/* 👇 NEW: Splash Video Toggle moved here */}
               <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Splash Video</span>
                  <button 
                     onClick={() => handleUpdateSettings({ ...settings, splashVideoEnabled: !settings.splashVideoEnabled })}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${settings.splashVideoEnabled ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${settings.splashVideoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
               </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        
        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{users.length}</p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Feedback Today</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{todayFeedback.length}</p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Rating Today</p>
                  <div className="flex items-end gap-2 mt-2">
                     <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {(todayFeedback.reduce((a, b) => a + b.rating, 0) / (todayFeedback.length || 1)).toFixed(1)}
                     </p>
                     <span className="text-sm text-slate-400 mb-1">/ 5.0</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Meal Ratings Overview</h3>
                 <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                       <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                       <YAxis domain={[0, 5]} tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                       <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Bar dataKey="rating" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* AI Section */}
              <div className="bg-gradient-to-br from-orange-500 to-yellow-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-200"/> AI Insights</h3>
                        <p className="text-orange-100 text-sm mt-1">Analyze student sentiment instantly.</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleGenerateAI} 
                        disabled={aiLoading}
                        className="bg-white/20 text-white border-none hover:bg-white/30 backdrop-blur-sm"
                      >
                        {aiLoading ? 'Thinking...' : 'Generate Report'}
                      </Button>
                  </div>
                  
                  {aiInsights ? (
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex-1 overflow-y-auto custom-scrollbar">
                       <h4 className="font-bold text-yellow-200 text-xs uppercase tracking-wider mb-2">Summary</h4>
                       <p className="text-sm mb-4 leading-relaxed">{aiInsights.summary}</p>
                       <h4 className="font-bold text-emerald-200 text-xs uppercase tracking-wider mb-2">Suggestions</h4>
                       <ul className="space-y-2">
                         {aiInsights.suggestions.map((s, i) => (
                           <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                             <span className="text-emerald-300 mt-1.5">•</span>
                             <span>{s}</span>
                           </li>
                         ))}
                       </ul>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-orange-100/60 text-sm border-2 border-dashed border-orange-200/30 rounded-xl">
                      No report generated yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 w-full sm:w-auto">
                <Search className="text-slate-400 w-5 h-5 ml-2" />
                <input 
                  type="text"
                  placeholder="Search users by name or email..."
                  className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <button onClick={() => setUserSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileUpload} 
                   accept=".csv" 
                   className="hidden" 
                 />
                 <Button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2">
                     <Plus size={18}/> Add User
                  </Button>
                  <Button 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={async () => {
                     if(confirm("Delete all duplicate users?")) {
                        await MockDB.cleanupDuplicateUsers();
                        loadData(); 
                        alert("Duplicates removed!");
                     }
                  }}
                  >
                  <Trash2 size={16} className="mr-2"/> Fix Duplicates
                  </Button>
                 <Button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                   <Upload size={18}/> Import CSV
                 </Button>
                 
                 <div className="relative group">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-help">?</div>
                    <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                       Format: email, displayName, password, role<br/>
                       Example: john@hostel.com, John Doe, pass123, STUDENT
                    </div>
                 </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                 <thead className="bg-slate-50 dark:bg-slate-800/50">
                   <tr>
                     <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                     <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                     <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                   {filteredUsers.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm italic">
                         No users found matching "{userSearchQuery}"
                       </td>
                     </tr>
                   ) : (
                     filteredUsers.map(u => (
                       <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm font-semibold text-slate-900 dark:text-white">{u.displayName}</div>
                           <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u.uid, e.target.value as UserRole)}
                              className={`px-2 py-1 rounded text-xs font-bold border-none outline-none cursor-pointer focus:ring-2 focus:ring-orange-500/50 ${
                                u.role === UserRole.ADMIN
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              <option value={UserRole.STUDENT}>STUDENT</option>
                              <option value={UserRole.ADMIN}>ADMIN</option>
                              <option value={UserRole.CANTEEN_STAFF}>CANTEEN STAFF</option> {/* 👈 Added missing option */}
                            </select>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           {u.deactivatedUntil ? (
                             <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1">
                               <Lock size={10} /> Deactivated
                             </span>
                           ) : (
                             <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                               Active
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           {u.deactivatedUntil ? (
                             <button 
                               onClick={() => handleReactivate(u.uid)}
                               className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors font-semibold text-xs"
                             >
                               Reactivate
                             </button>
                           ) : (
                             <button 
                               onClick={() => openDeactivateModal(u)}
                               className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-200 transition-colors font-semibold text-xs"
                             >
                               Deactivate
                             </button>
                           )}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
               </div>
            </div>
          </div>
        )}

        {/* --- FEEDBACK TAB --- */}
        {activeTab === 'feedback' && (
           <div className="space-y-6 animate-in fade-in duration-500">
             
             {/* Analytics Summary */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="text-center md:text-left">
                       <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Overall Rating</p>
                       <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white mt-2">{feedbackStats.averageRating}</h2>
                       <div className="flex gap-1 justify-center md:justify-start mt-2 text-amber-400">
                          {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= Math.round(Number(feedbackStats.averageRating))} size={16}/>)}
                       </div>
                       <p className="text-xs text-slate-400 mt-2">{feedback.length} total reviews</p>
                    </div>
                    
                    <div className="flex-1 w-full flex items-end gap-2 h-24">
                       {[1,2,3,4,5].map(i => {
                          const count = feedbackStats.ratingCounts[i-1];
                          const percent = feedback.length ? (count / feedback.length) * 100 : 0;
                          return (
                             <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                <span className="text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-sm h-full relative overflow-hidden">
                                   <div 
                                      className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                                         i >= 4 ? 'bg-emerald-400' : i === 3 ? 'bg-yellow-400' : 'bg-red-400'
                                      }`}
                                      style={{ height: `${percent}%` }}
                                   ></div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">{i}★</span>
                             </div>
                          )
                       })}
                    </div>
                 </div>
             </div>

             {/* UNIFIED FILTER TOOLBAR */}
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
                 <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-1">
                   {/* Dish Filter */}
                   <div className="relative flex-1 min-w-[200px]">
                     <Filter className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/>
                     <select 
                       className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 appearance-none text-slate-700 dark:text-slate-200"
                       value={feedbackDishFilter}
                       onChange={(e) => setFeedbackDishFilter(e.target.value)}
                     >
                       <option value="all">All Menu Items</option>
                       {uniqueDishes.map(dish => <option key={dish} value={dish}>{dish}</option>)}
                     </select>
                     <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                   </div>

                   {/* Rating Filter */}
                   <div className="relative w-full sm:w-48">
                     <select 
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 appearance-none text-slate-700 dark:text-slate-200"
                       value={feedbackRatingFilter}
                       onChange={(e) => setFeedbackRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                     >
                       <option value="all">All Ratings</option>
                       <option value="5">5 Stars Only</option>
                       <option value="4">4 Stars Only</option>
                       <option value="3">3 Stars Only</option>
                       <option value="2">2 Stars Only</option>
                       <option value="1">1 Star Only</option>
                     </select>
                     <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
                   </div>

                   {/* Time Toggle */}
                   <button 
                     onClick={() => setShowRecentFeedbackOnly(!showRecentFeedbackOnly)}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap flex items-center justify-center gap-2 ${
                       showRecentFeedbackOnly 
                       ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' 
                       : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                     }`}
                   >
                     <Clock size={16} />
                     {showRecentFeedbackOnly ? 'Recent (24h)' : 'All Time'}
                   </button>
                 </div>

                 {/* Export Button */}
                 <Button onClick={handleExportFeedback} variant="outline" className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center">
                   <Download size={16}/> Export CSV
                 </Button>
             </div>
             
             {/* Feedback List */}
             {filteredFeedback.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">
                       {showRecentFeedbackOnly 
                          ? "No feedback from the last 24 hours." 
                          : "No matching feedback found."}
                    </p>
                 </div>
             ) : (
                 <div className="grid gap-3">
                    {filteredFeedback.map(item => (
                       <div 
                         key={item.id} 
                         onClick={() => setSelectedFeedback(item)}
                         className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer group relative"
                       >
                          <div className="flex justify-between items-start gap-4">
                             <div className="flex gap-3 items-start flex-1 min-w-0">
                                {/* Rating Badge */}
                                <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg shrink-0 font-bold text-sm ${
                                   item.rating >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                   item.rating === 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                   {item.rating}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate pr-8">{item.dishName}</h4>
                                   <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{item.mealType}</span>
                                      <span>•</span>
                                      <span>{item.date}</span>
                                      <span>•</span>
                                      <span className="font-medium text-slate-600 dark:text-slate-400">{item.userName}</span>
                                   </div>
                                   <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-1">
                                     {item.comment || <span className="italic opacity-50">No comment provided</span>}
                                   </p>
                                </div>
                             </div>
                             
                             <button 
                                onClick={(e) => handleDeleteFeedback(item.id, e)}
                                className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors absolute top-2 right-2"
                                title="Delete Feedback"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
             )}
           </div>
        )}

        {/* --- SUGGESTIONS TAB --- */}
        {activeTab === 'suggestions' && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Lightbulb className="w-5 h-5 text-yellow-500"/>
                 Student Suggestions
             </h3>
             {suggestions.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">No suggestions received yet.</p>
                 </div>
             ) : (
                 <div className="grid gap-4">
                    {suggestions.map(s => (
                       <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <p className="text-slate-800 dark:text-white font-medium text-base mb-3 leading-relaxed">
                            "{s.text}"
                          </p>
                          <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-3">
                             <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.userName}</p>
                                <p className="text-[10px] text-slate-400">{new Date(s.timestamp).toLocaleString()}</p>
                             </div>
                             <button 
                               onClick={() => handleDeleteSuggestion(s.id)}
                               className="text-slate-400 hover:text-red-500 text-xs font-semibold flex items-center gap-1 transition-colors"
                             >
                               <Trash2 size={12}/> Delete
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
             )}
           </div>
        )}

        {activeTab === 'todos' && (
           <div className="flex flex-col h-[calc(100vh-7rem)] space-y-6">
              {/* Add Task Form - Fixed Header */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Task</h3>
                 <form onSubmit={handleAddTodo} className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Task Title</label>
                          <input 
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                            placeholder="What needs to be done?"
                            value={newTodo.text}
                            onChange={e => setNewTodo({...newTodo, text: e.target.value})}
                            required
                          />
                      </div>
                      <div className="w-full md:w-48">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Priority</label>
                          <select
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                            value={newTodo.priority}
                            onChange={e => setNewTodo({...newTodo, priority: e.target.value as TaskPriority})}
                          >
                            <option value={TaskPriority.HIGH}>High</option>
                            <option value={TaskPriority.MEDIUM}>Medium</option>
                            <option value={TaskPriority.LOW}>Low</option>
                          </select>
                      </div>
                      <div className="w-full md:w-48">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Due Date</label>
                          <input 
                            type="date"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                            value={newTodo.dueDate}
                            onChange={e => setNewTodo({...newTodo, dueDate: e.target.value})}
                            required
                          />
                      </div>
                    </div>
                    
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description (Optional)</label>
                       <textarea 
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white resize-none"
                          placeholder="Add details about this task..."
                          rows={2}
                          value={newTodo.description}
                          onChange={e => setNewTodo({...newTodo, description: e.target.value})}
                       />
                    </div>
                    
                    <Button type="submit" className="self-end">Add Task</Button>
                 </form>
              </div>

              {/* Tasks Split View - Scrollable Columns */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8 items-start h-full">
                 {/* Pending Column */}
                 <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                       <h3 className="text-lg font-bold text-slate-800 dark:text-white">Pending Tasks</h3>
                       <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-0.5 rounded-full">{pendingTodos.length}</span>
                    </div>
                    
                    {/* Inner List Container - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 space-y-6">
                      {pendingTodos.length === 0 && <p className="text-slate-400 italic text-sm">No pending tasks.</p>}
                      
                      {/* Group By Priority for Reordering */}
                      {[TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW].map(priority => {
                         const tasks = todos.filter(t => !t.isCompleted && t.priority === priority);
                         if (tasks.length === 0) return null;
                         
                         return (
                           <div key={priority}>
                             <h4 className={`text-xs font-bold uppercase mb-2 ${
                               priority === TaskPriority.HIGH ? 'text-red-500' : 
                               priority === TaskPriority.MEDIUM ? 'text-amber-500' : 
                               'text-blue-500'
                             }`}>{priority} Priority</h4>
                             <div className="space-y-3">
                               {tasks.map(task => (
                                  <div 
                                    key={task.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, task.id, priority)}
                                    className={`
                                      relative p-4 rounded-xl border-l-4 transition-all bg-white dark:bg-slate-900 min-h-[120px] flex flex-col justify-between group cursor-grab active:cursor-grabbing hover:shadow-md
                                      ${task.priority === TaskPriority.HIGH ? 'border-l-red-500 border-t border-r border-b border-slate-200 dark:border-slate-800' : 
                                        task.priority === TaskPriority.MEDIUM ? 'border-l-amber-500 border-t border-r border-b border-slate-200 dark:border-slate-800' : 
                                        'border-l-blue-500 border-t border-r border-b border-slate-200 dark:border-slate-800'}
                                      ${draggedTaskId === task.id ? 'opacity-40' : 'opacity-100'}
                                    `}>
                                       <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                             <GripVertical className="text-slate-300 w-4 h-4 cursor-grab active:cursor-grabbing"/>
                                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                task.priority === TaskPriority.HIGH ? 'bg-red-50 text-red-700' :
                                                task.priority === TaskPriority.MEDIUM ? 'bg-amber-50 text-amber-700' :
                                                'bg-blue-50 text-blue-700'
                                             }`}>{task.priority}</span>
                                          </div>
                                          <div className="flex gap-2">
                                             <button
                                               onClick={() => toggleTodo(task)}
                                               className="text-slate-300 hover:text-emerald-500 transition-colors"
                                               title="Mark Completed"
                                             >
                                                <Check size={18} />
                                             </button>
                                             <button 
                                               onClick={(e) => handleDeleteTodo(task.id, e)}
                                               className="text-slate-300 hover:text-red-500 transition-colors"
                                               title="Delete"
                                             >
                                                <Trash2 size={16} />
                                             </button>
                                          </div>
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{task.text}</h4>
                                          {task.description && (
                                             <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{task.description}</p>
                                          )}
                                       </div>
                                       <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1.5 mt-auto">
                                          <Calendar size={12}/>
                                          {task.dueDate}
                                       </div>
                                  </div>
                               ))}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                 </div>

                 {/* Completed Column */}
                 <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                       <h3 className="text-lg font-bold text-slate-800 dark:text-white">Completed Tasks</h3>
                       <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">{completedTodos.length}</span>
                    </div>
                    {completedTodos.length === 0 && <p className="text-slate-400 italic text-sm">No completed tasks yet.</p>}
                    
                    {/* Inner List Container - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {completedTodos.map(task => (
                             <div key={task.id} className="relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-70 hover:opacity-100 transition-all min-h-[120px] flex flex-col justify-between group">
                                <div className="absolute top-3 right-3">
                                   <div className="bg-emerald-500 text-white rounded-full p-1"><Check size={12}/></div>
                                </div>
                                <div className="flex justify-between items-start mb-2 pr-8">
                                   <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{task.priority}</span>
                                   <div className="flex gap-2">
                                        <button
                                           onClick={() => toggleTodo(task)}
                                           className="text-slate-400 hover:text-orange-500 p-1 transition-colors"
                                           title="Mark Pending"
                                        >
                                           <X size={16}/>
                                        </button>
                                        <button 
                                           onClick={(e) => handleDeleteTodo(task.id, e)}
                                           className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                        >
                                           <Trash2 size={16} />
                                        </button>
                                   </div>
                                </div>
                                <div>
                                   <h4 className="font-bold text-slate-600 dark:text-slate-400 line-through mb-1 line-clamp-1">{task.text}</h4>
                                   {task.description && (
                                      <p className="text-xs text-slate-400 dark:text-slate-500 line-through line-clamp-2 mb-2">{task.description}</p>
                                   )}
                                </div>
                                <div className="flex items-center text-xs text-slate-400 gap-1.5 mt-auto">
                                   <Calendar size={12}/>
                                   {task.dueDate}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'notes' && (
           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {/* Add Note Card */}
                 <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4 min-h-[280px]">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white mb-1">
                       <Plus className="w-5 h-5"/>
                       <h4 className="font-bold">New Note</h4>
                    </div>
                    <input 
                       className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none dark:text-white font-semibold"
                       placeholder="Title"
                       value={newNote.title}
                       onChange={e => setNewNote({...newNote, title: e.target.value})}
                    />
                    <textarea 
                       className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none dark:text-white resize-none flex-1"
                       placeholder="Type your note content here..."
                       value={newNote.content}
                       onChange={e => setNewNote({...newNote, content: e.target.value})}
                    />
                    <Button size="sm" onClick={handleAddNote}>Save Note</Button>
                 </div>

                 {/* Note Cards */}
                 {notes.map(note => (
                    <div key={note.id} className="bg-yellow-100 dark:bg-yellow-900/20 p-5 rounded-tr-3xl rounded-bl-3xl rounded-tl-sm rounded-br-sm shadow-sm border border-yellow-200 dark:border-yellow-900/30 flex flex-col min-h-[280px] relative group transition-all hover:-rotate-1 hover:scale-[1.02]">
                       <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-200 dark:bg-yellow-800/40 rounded-bl-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDeleteNote(note.id)} className="text-yellow-800 dark:text-yellow-400 hover:text-red-600"><Trash2 size={14}/></button>
                       </div>
                       
                       <h4 className="font-bold text-lg text-slate-900 dark:text-yellow-100 mb-4 pb-2 border-b border-yellow-200 dark:border-yellow-800/50 break-words">{note.title}</h4>
                       
                       <div className="flex-1 text-sm text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium font-handwriting">
                          {note.content}
                       </div>
                       
                       <div className="mt-4 pt-2 border-t border-yellow-200 dark:border-yellow-800/50 flex justify-between items-center text-[10px] text-yellow-700 dark:text-yellow-500/70 font-bold uppercase tracking-wider">
                          <span>Note</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'announcements' && (
           <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Announcement</h3>
                 <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Title"
                        required
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-full focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                        value={newAnnouncement.title}
                        onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      />
                      <select
                         className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-full focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                         value={newAnnouncement.type}
                         onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value as AnnouncementType})}
                      >
                         <option value={AnnouncementType.INFO}>Info</option>
                         <option value={AnnouncementType.WARNING}>Warning</option>
                         <option value={AnnouncementType.SUCCESS}>Success</option>
                      </select>
                   </div>
                   
                   <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 transition-all bg-white dark:bg-slate-950">
                        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                            <button type="button" onClick={() => insertTextFormat('bold')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors" title="Bold">
                                <Bold size={16} strokeWidth={2.5} />
                            </button>
                            <button type="button" onClick={() => insertTextFormat('italic')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors" title="Italic">
                                <Italic size={16} strokeWidth={2.5} />
                            </button>
                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                            <button type="button" onClick={() => insertTextFormat('list')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors" title="Bullet List">
                                <List size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        <textarea
                            id="announcementInput"
                            placeholder="Message content..."
                            required
                            className="w-full p-3 bg-transparent border-none outline-none dark:text-white min-h-[100px] resize-y"
                            rows={3}
                            value={newAnnouncement.message}
                            onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                        ></textarea>
                   </div>

                   <div className="flex gap-4 items-center">
                     <div className="flex-1">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Expires On</label>
                       <input 
                          type="datetime-local"
                          required
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-full focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                          value={newAnnouncement.expiresOn}
                          onChange={e => setNewAnnouncement({...newAnnouncement, expiresOn: e.target.value})}
                       />
                     </div>
                     <Button type="submit" className="mt-5">Post Announcement</Button>
                   </div>
                 </form>
              </div>

              <div className="grid gap-4">
                {announcements.map(ann => {
                  const isExpired = new Date(ann.expiresOn).getTime() <= Date.now();
                  
                  return (
                    <div 
                      key={ann.id} 
                      className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                          !ann.isActive 
                            ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60' 
                            : isExpired 
                              ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                      }`}
                    >
                       <div className="flex items-start gap-3">
                          {ann.type === AnnouncementType.WARNING ? <AlertTriangle className={isExpired ? "text-slate-400" : "text-amber-500"} /> : 
                           ann.type === AnnouncementType.SUCCESS ? <CheckCircle2 className={isExpired ? "text-slate-400" : "text-emerald-500"} /> :
                           <Info className={isExpired ? "text-slate-400" : "text-blue-500"} />}
                          
                          <div>
                             <h4 className={`font-bold ${isExpired ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                               {ann.title}
                             </h4>
                             <p className="text-sm text-slate-500 dark:text-slate-400">{ann.message}</p>
                             
                             <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                               {isExpired ? 'Expired on: ' : 'Expires: '} 
                               {new Date(ann.expiresOn).toLocaleString()}
                             </p>
                          </div>
                       </div>

                       <div className="flex items-center gap-2">
                          {isExpired ? (
                             <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                Expired
                             </span>
                          ) : (
                             <span className={`px-2 py-1 rounded text-xs font-bold ${
                                ann.isActive 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                             }`}>
                                {ann.isActive ? 'Active' : 'Inactive'}
                             </span>
                          )}

                          <button 
                             onClick={() => toggleAnnouncement(ann)}
                             className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                             title={ann.isActive ? 'Deactivate' : 'Activate'}
                          >
                             {ann.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          
                          <button
                             onClick={(e) => handleDeleteAnnouncement(ann.id, e)}
                             className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                             title="Delete"
                             type="button"
                          >
                             <Trash2 size={16}/>
                          </button>
                       </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}

        {activeTab === 'menu' && (
           <div className="space-y-6">
              
              {/* --- NEW HEADER & BULK UPLOAD SECTION --- */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="text-orange-500"/> Weekly Menu
                </h3>
                
                <div className="flex gap-2">
                   {/* Hidden File Input */}
                   <input
                     type="file"
                     accept=".json"
                     id="menu-upload"
                     className="hidden"
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;

                       try {
                         const text = await file.text();
                         const jsonData = JSON.parse(text);
                         
                         if (!Array.isArray(jsonData)) {
                           alert("Invalid format: File must be an array of days.");
                           return;
                         }
                         
                         if (confirm(`Upload menu for ${jsonData.length} days? This will overwrite existing data.`)) {
                           await MockDB.bulkUploadMenu(jsonData);
                           loadData(); 
                           alert("Menu updated successfully!");
                         }
                       } catch (err) {
                         alert("Error reading file. Please check the JSON format.");
                         console.error(err);
                       }
                       e.target.value = '';
                     }}
                   />
                   
                   <Button 
                     variant="outline"
                     onClick={() => {
                       const sample = [
                         {
                           "day": "Monday",
                           "breakfast": [{ "id": "101", "name": "Idly", "description": "With chutney", "isVeg": true, "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc" }],
                           "lunch": [], "snacks": [], "dinner": []
                         },
                         { "day": "Tuesday", "breakfast": [], "lunch": [], "snacks": [], "dinner": [] }
                       ];
                       const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
                       const url = URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = 'menu_sample.json';
                       a.click();
                     }}
                   >
                     <span className="text-xs">Download Sample</span>
                   </Button>

                   <Button onClick={() => document.getElementById('menu-upload')?.click()}>
                     Upload JSON
                   </Button>
                </div>
              </div>

              {/* --- EXISTING DAY SELECTOR --- */}
               <div className="flex gap-2 overflow-x-auto pb-2">
                 {days.map(day => (
                   <button
                     key={day}
                     onClick={() => setSelectedDay(day)}
                     className={`
                       px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
                       ${selectedDay === day 
                         ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                         : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-orange-300'}
                     `}
                   >
                     {day}
                   </button>
                 ))}
               </div>

               {/* --- EXISTING MEAL SECTIONS --- */}
               {currentDayMenu && [MealType.BREAKFAST, MealType.LUNCH, MealType.SNACKS, MealType.DINNER].map(meal => (
                  <div key={meal} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide text-sm flex items-center gap-2">
                           <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                           {meal}
                        </h4>
                        <Button size="sm" variant="outline" onClick={() => handleOpenAddDish(meal)} className="flex items-center gap-1">
                           <Plus size={16} /> Add Dish
                        </Button>
                     </div>

                     <div className="space-y-4">
                        {(currentDayMenu[meal] || []).length === 0 && (
                           <p className="text-slate-400 text-sm italic">No dishes added yet.</p>
                        )}
                        
                        {(currentDayMenu[meal] || []).map(dish => {
                           const isDishVeg = dish.isVeg !== undefined ? dish.isVeg : (dish as any).isveg;

                           return (
                              <div key={dish.id} className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                 <img src={dish.image} alt={dish.name} className="w-16 h-16 rounded-lg object-cover bg-slate-200" />
                                 <div className="flex-1">
                                    <div className="flex justify-between">
                                       <h5 className="font-bold text-slate-900 dark:text-white">{dish.name}</h5>
                                       <div className="flex gap-2">
                                          <button onClick={() => handleOpenEditDish(dish, meal)} className="text-slate-400 hover:text-blue-500"><Pencil size={16}/></button>
                                          <button onClick={() => handleDeleteDish(dish.id, meal)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                       </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{dish.description}</p>
                                    <div className="mt-1">
                                       {isDishVeg ? (
                                          <span className="text-[10px] font-bold text-green-600 border border-green-200 px-1 rounded bg-green-50">VEG</span>
                                       ) : (
                                          <span className="text-[10px] font-bold text-red-600 border border-red-200 px-1 rounded bg-red-50">NON-VEG</span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               ))}
           </div>
        )}

        {activeTab === 'canteen' && (
        <div className="max-w-4xl mx-auto space-y-4">
           
           {/* --- 1. CANTEEN TOGGLE --- */}
           <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div>
                 <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UtensilsCrossed size={18} className="text-orange-500" /> Enable Canteen
                 </h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400">
                   Allow students to see and order from the canteen.
                 </p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="sr-only peer"
                   checked={settings.canteenEnabled} 
                   onChange={(e) => handleUpdateSettings({ ...settings, canteenEnabled: e.target.checked })}
                 />
                 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
             </label>
           </div>

           {/* --- 3. CANTEEN ITEMS HEADER --- */}
           <div className="flex justify-between items-center pt-4">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white">Canteen Menu</h3>
             {/* 👇 FIXED: Uses the correct handler function now */}
             <Button onClick={handleOpenAddCanteenItem} className="flex items-center gap-2">
               <Plus size={18}/> Add Item
             </Button>
           </div>

           {/* --- 4. CANTEEN ITEMS LIST --- */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {canteenMenu.map(item => (
                 <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                              <p className="text-xs text-slate-500">{item.category}</p>
                              {/* Moved price here for cleaner layout, or keep it below if you prefer */}
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
                                 ₹{item.price}
                              </p>
                           </div>

                           {/* Right Side: Buttons + Toggle Stacked */}
                           <div className="flex flex-col items-end gap-3">
                              
                              {/* 1. Edit/Delete Buttons */}
                              <div className="flex gap-1">
                                 <button onClick={() => handleOpenEditCanteenItem(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16}/></button>
                                 <button onClick={() => handleDeleteCanteenItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                              </div>

                              {/* 2. Availability Toggle (Below buttons) */}
                              <label className="relative inline-flex items-center cursor-pointer" title={item.isAvailable ? "Mark Unavailable" : "Mark Available"}>
                                 <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={item.isAvailable} 
                                    onChange={() => handleToggleCanteenAvailability(item)}
                                 />
                                 <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                              </label>
                           </div>
                        </div>
                     </div>
                 </div>
              ))}
           </div>
        </div>
        )}
      </main>

      {/* --- Modals --- */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-800 relative flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white pr-8">Feedback Details</h3>
                 <button 
                   onClick={() => setSelectedFeedback(null)}
                   className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                 >
                   <X size={20} />
                 </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar pr-2">
                 <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-xl font-bold text-2xl shadow-sm ${
                       selectedFeedback.rating >= 4 ? 'bg-emerald-500 text-white' :
                       selectedFeedback.rating === 3 ? 'bg-yellow-500 text-white' :
                       'bg-red-500 text-white'
                    }`}>
                       {selectedFeedback.rating}
                    </div>
                    <div>
                       <h4 className="font-bold text-lg text-slate-900 dark:text-white">{selectedFeedback.dishName}</h4>
                       <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs font-semibold bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                             {selectedFeedback.mealType}
                          </span>
                          <span className="text-xs font-semibold bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                             {selectedFeedback.date}
                          </span>
                       </div>
                    </div>
                 </div>

                 <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                       Student Comment
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                       {selectedFeedback.comment || "No written comment provided."}
                    </div>
                 </div>

                 <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-md">
                          {selectedFeedback.userName.charAt(0).toUpperCase()}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedFeedback.userName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
                       </div>
                    </div>
                    <Button 
                       variant="danger" 
                       size="sm" 
                       onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                       className="flex items-center gap-2"
                    >
                       <Trash2 size={14}/> Delete
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isEditModalOpen && editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                 {editingDish.id && menu.some(d => d[editingMealType!]?.some(x => x.id === editingDish.id)) ? 'Edit Dish' : 'Add New Dish'}
              </h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dish Name</label>
                    <input 
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                       value={editingDish.name}
                       onChange={e => setEditingDish({...editingDish, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                    <textarea 
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                       rows={2}
                       value={editingDish.description}
                       onChange={e => setEditingDish({...editingDish, description: e.target.value})}
                    ></textarea>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setEditingDish({...editingDish, isVeg: true})}
                             className={`flex-1 py-2 rounded-lg text-sm font-bold border ${editingDish.isVeg ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                          >
                             Veg
                          </button>
                          <button 
                             onClick={() => setEditingDish({...editingDish, isVeg: false})}
                             className={`flex-1 py-2 rounded-lg text-sm font-bold border ${!editingDish.isVeg ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                          >
                             Non-Veg
                          </button>
                       </div>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Image URL</label>
                    <div className="flex gap-2">
                       <input 
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white text-sm"
                          value={editingDish.image}
                          onChange={e => setEditingDish({...editingDish, image: e.target.value})}
                          placeholder="https://..."
                       />
                       <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          {editingDish.image && <img src={editingDish.image} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />}
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex gap-3 pt-2">
                    <Button variant="outline" fullWidth onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button fullWidth onClick={handleSaveDish}>Save Dish</Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isCanteenModalOpen && editingCanteenItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800">
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  {canteenMenu.some(c => c.id === editingCanteenItem.id) ? 'Edit Item' : 'Add Item'}
               </h3>
               <div className="space-y-4">
                  <input 
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                     placeholder="Item Name"
                     value={editingCanteenItem.name}
                     onChange={e => setEditingCanteenItem({...editingCanteenItem, name: e.target.value})}
                  />
                  <div className="flex gap-4">
                     <input 
                        type="number"
                        className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                        placeholder="Price"
                        value={editingCanteenItem.price || ''}
                        onChange={e => setEditingCanteenItem({...editingCanteenItem, price: Number(e.target.value)})}
                     />
                     <select 
                        className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                        value={editingCanteenItem.category}
                        onChange={e => setEditingCanteenItem({...editingCanteenItem, category: e.target.value})}
                     >
                        <option value="Snacks">Snacks</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Healthy">Healthy</option>
                        <option value="Meals">Meals</option>
                     </select>
                  </div>
                  <input 
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white text-sm"
                     placeholder="Image URL"
                     value={editingCanteenItem.image}
                     onChange={e => setEditingCanteenItem({...editingCanteenItem, image: e.target.value})}
                  />
                  <div className="flex gap-3 pt-2">
                     <Button variant="outline" fullWidth onClick={() => setIsCanteenModalOpen(false)}>Cancel</Button>
                     <Button fullWidth onClick={handleSaveCanteenItem}>Save</Button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {deactivateModalUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Deactivate User</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Select how long <strong>{deactivateModalUser.displayName}</strong> should be deactivated. They will not be able to log in until this date.
               </p>
               
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Deactivated Until</label>
               <input 
                  type="date" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white mb-6"
                  value={deactivationDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDeactivationDate(e.target.value)}
               />
               
               <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setDeactivateModalUser(null)}>Cancel</Button>
                  <Button variant="danger" fullWidth onClick={handleConfirmDeactivation}>Confirm</Button>
               </div>
            </div>
         </div>
      )}
      {/* ADD USER MODAL */}
      {isUserModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800">
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add New User</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input 
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none dark:text-white"
                       required type="email"
                       value={newUser.email}
                       onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                    <input 
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none dark:text-white"
                       required
                       value={newUser.displayName}
                       onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                        <select 
                           className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none dark:text-white"
                           value={newUser.role}
                           onChange={e => setNewUser({...newUser, role: e.target.value})}
                        >
                           <option value="STUDENT">Student</option>
                           <option value="ADMIN">Admin</option>
                           <option value="CANTEEN_STAFF">Canteen Staff</option> {/* 👈 Add this */}
                        </select>
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                    <input 
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none dark:text-white"
                       value={newUser.password}
                       onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <Button type="button" variant="outline" fullWidth onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                     <Button type="submit" fullWidth>Create Account</Button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

// Helper component for Star
const StarIcon: React.FC<{ filled: boolean, size?: number }> = ({ filled, size = 14 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={filled ? "currentColor" : "none"} 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);