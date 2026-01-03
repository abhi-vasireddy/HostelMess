import React, { useState, useEffect } from 'react';

import { User, DailyMenu, MealType, Announcement, Feedback, AppSettings, CanteenItem, AnnouncementType } from '../types';
import { MockDB } from '../services/mockDb';
import { getCurrentDayName, isFeedbackUnlocked, getTodayDateString } from '../services/timeUtils';
import { Button } from '../components/Button';
import { LottiePlayer } from '../components/LottiePlayer';
import { Star, MessageSquare, AlertCircle, UtensilsCrossed, Calendar, CheckCircle2, X, Info, AlertTriangle } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'feedback' | 'suggestions' | 'canteen'>('menu');
  // ... existing state ...
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  // 👇 PASTE THIS WITH YOUR OTHER STATES
  const [error, setError] = useState(false);
  
  
  // ... inside StudentDashboard component ...

  // 👇 1. UPDATED STATE: Video starts HIDDEN (false) until we check settings
  const [showSplash, setShowSplash] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  
  // 👇 Video Links
  const desktopVideoUrl = "https://files.catbox.moe/camisw.mp4";
  const mobileVideoUrl = "https://files.catbox.moe/zv8gqr.mp4";

  // 👇 2. UPDATED DATA LOADING & VIDEO CHECK
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all data including settings
        const [m, a, s, allF, c] = await Promise.all([
          MockDB.getWeeklyMenu(),
          MockDB.getAnnouncements(),
          MockDB.getSettings(), // 👈 Fetching Admin Settings
          MockDB.getAllFeedback(),
          MockDB.getCanteenMenu()
        ]);
        
        setMenu(m || []);
        setAnnouncements(a || []);
        setSettings(s || { canteenEnabled: false, splashVideoEnabled: false });
        setCanteenMenu(c || []);

        // 👇 CHECK: Turn ON video only if Admin enabled it
        if (s?.splashVideoEnabled) {
           setShowSplash(true); 
        } else {
           setShowSplash(false);
        }

        // Handle User Feedback History
        const today = getTodayDateString();
        const userFeedbackHistory = (allF || [])
          .filter(f => f.userId === user.uid)
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setMyFeedbacks(userFeedbackHistory);

        const myTodayFeedback = userFeedbackHistory.filter(f => f.date === today);
        const map: Record<string, boolean> = {};
        myTodayFeedback.forEach(f => map[f.dishId] = true);
        setFeedbackMap(map);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    // 👇 Check Skip Permission (Run immediately)
    const hasSeen = localStorage.getItem('introVideoSeen');
    if (hasSeen) {
      setCanSkip(true);
    } else {
      setCanSkip(false);
    }

    fetchData();
  }, [user.uid]);

  // 👇 Helper to close video
  const handleVideoEnd = () => {
    localStorage.setItem('introVideoSeen', 'true'); 
    setShowSplash(false); 
  };
  const [menu, setMenu] = useState<DailyMenu[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDayName());
  const [settings, setSettings] = useState<AppSettings>({ canteenEnabled: false });
  const [feedbackMap, setFeedbackMap] = useState<Record<string, boolean>>({}); 
  const [canteenMenu, setCanteenMenu] = useState<CanteenItem[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  
  // Suggestion State
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState('');

  // Feedback Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [activeFeedbackDish, setActiveFeedbackDish] = useState<{id: string, name: string, meal: MealType} | null>(null);

  // --- DATA LOADING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Start Loading
        const [m, a, s, allF, c] = await Promise.all([
          MockDB.getWeeklyMenu(),
          MockDB.getAnnouncements(),
          MockDB.getSettings(),
          MockDB.getAllFeedback(),
          MockDB.getCanteenMenu()
        ]);
        setMenu(m || []);
        setAnnouncements(a || []);
        setSettings(s || { canteenEnabled: false });
        setCanteenMenu(c || []);

        const today = getTodayDateString();
        const userFeedbackHistory = (allF || [])
          .filter(f => f.userId === user.uid)
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setMyFeedbacks(userFeedbackHistory);

        const myTodayFeedback = userFeedbackHistory.filter(f => f.date === today);
        const map: Record<string, boolean> = {};
        myTodayFeedback.forEach(f => map[f.dishId] = true);
        setFeedbackMap(map);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(true); // 👈 ADD THIS LINE: triggers the error screen
      } finally {
        // Stop Loading after a small delay to make it look smooth (optional)
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchData();
  }, [user.uid]);

  // --- SYSTEM NOTIFICATION LOGIC ---
  useEffect(() => {
    const sendSystemNotification = (title: string, body: string) => {
      if (!("Notification" in window)) return;
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: body,
            icon: '/pwa-192x192.png',
            // @ts-ignore
            vibrate: [200, 100, 200],
            tag: 'meal-notification'
          });
        } catch (e) { console.error(e); }
      }
    };

    const checkAndNotify = () => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!menu || menu.length === 0) return;

      const hour = new Date().getHours();
      const todayDate = getTodayDateString();
      
      let currentMeal: MealType | null = null;
      if (hour >= 7 && hour < 10) currentMeal = MealType.BREAKFAST;
      else if (hour >= 12 && hour < 15) currentMeal = MealType.LUNCH;
      else if (hour >= 16 && hour < 18) currentMeal = MealType.SNACKS;
      else if (hour >= 19 && hour < 22) currentMeal = MealType.DINNER;

      if (currentMeal && isFeedbackUnlocked(currentMeal)) {
        const todayDayName = getCurrentDayName(); 
        const todayMenu = menu.find(m => m.day === todayDayName);
        if (todayMenu) {
          const mealDishes = todayMenu[currentMeal] || [];
          if (mealDishes.length > 0) {
             const hasUnratedDishes = mealDishes.some(dish => !feedbackMap[dish.id]);
             const notifKey = `notif-${todayDate}-${currentMeal}`;
             const alreadySent = localStorage.getItem(notifKey);

             if (hasUnratedDishes && !alreadySent) {
               sendSystemNotification(`Time for ${currentMeal}! 🍽️`, `The menu is live. Rate your food now!`);
               localStorage.setItem(notifKey, 'true');
             }
          }
        }
      }
    };

    if ("Notification" in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(e => console.log(e));
    }

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [menu, feedbackMap, user.uid]);


  // --- HANDLERS ---
  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    // 1. Submit to Database
    await MockDB.submitSuggestion({
      id: Date.now().toString(),
      userId: user.uid,
      userName: user.displayName || 'Student',
      text: suggestionText,
      timestamp: Date.now()
    });

    // 2. Clear Input
    setSuggestionText('');

    // 3. Trigger Success Animation
    setShowSuccess(true);
    
    // 4. Hide Animation after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleSubmitFeedback = async () => {
    if (!activeFeedbackDish) return;
    
    const feedback: Feedback = {
      id: Date.now().toString(),
      dishId: activeFeedbackDish.id,
      dishName: activeFeedbackDish.name,
      mealType: activeFeedbackDish.meal,
      userId: user.uid,
      userName: user.displayName || 'Student',
      rating,
      comment,
      date: getTodayDateString(),
      timestamp: Date.now()
    };

    // 1. Submit to Database
    await MockDB.submitFeedback(feedback);
    
    // 2. Update Local State (Mark dish as rated)
    setFeedbackMap(prev => ({ ...prev, [activeFeedbackDish.id]: true }));
    setMyFeedbacks(prev => [feedback, ...prev]);
    
    // 3. Reset and Close Modal
    setActiveFeedbackDish(null);
    setRating(5);
    setComment('');

    // 👇 4. TRIGGER SUCCESS ANIMATION (Added)
    setShowSuccess(true);
    
    // Hide animation after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Student';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDayMenu = menu.find(m => m.day === selectedDay);
  const isToday = selectedDay === getCurrentDayName();

  const navItems = [
    { id: 'menu', label: 'Menu', icon: Calendar },
    { id: 'feedback', label: 'My Feedback', icon: Star },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
    { id: 'canteen', label: 'Canteen', icon: UtensilsCrossed }
  ];

  // 👇 3. RENDER VIDEO PLAYER (High Priority)
  if (showSplash) {
    return (
      // Changed background to white briefly so the fade-out is smoother against light theme, but black is fine too
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-700">
        
        {/* 👇 UPDATED SKIP BUTTON (Black Theme) */}
        {canSkip && (
          <button 
            onClick={handleVideoEnd}
            // New styling: Dark text, semi-transparent black background
            className="absolute top-8 right-8 z-[110] bg-black/20 backdrop-blur-md text-slate-900 px-6 py-2 rounded-full text-sm font-bold border border-black/10 hover:bg-black/30 transition-all flex items-center gap-2 shadow-sm"
          >
            Skip Intro <span className="text-lg">→</span>
          </button>
        )}
        
        <video 
          autoPlay 
          muted 
          playsInline 
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
        >
          {/* 👇 RESPONSIVE VIDEO SOURCES */}
          {/* 1. Mobile Source (Browser checks this first. Runs if screen is narrower than 768px) */}
          <source src={mobileVideoUrl} type="video/mp4" media="(max-width: 768px)" />
          
          {/* 2. Desktop Source (Fallback for larger screens) */}
          <source src={desktopVideoUrl} type="video/mp4" />
        </video>
      </div>
    );
  }

  // --- RENDER LOADING SKELETON ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LottiePlayer type="loading" className="w-48 h-48" />
        <p className="text-slate-500 animate-pulse mt-4">Preparing the kitchen...</p>
      </div>
    );
  }

  // 👇 NEW: RENDER ERROR SCREEN (Network Issues / App Crash)
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center">
        {/* Uses your local 404.json file */}
        <LottiePlayer type="404" className="w-64 h-64 mb-4" />
        
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Oops! Something went wrong.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto">
          We couldn't load the menu. Please check your internet connection and try again.
        </p>
        
        <button 
          onClick={() => window.location.reload()} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            {getGreeting()}, <span className="text-orange-500 dark:text-orange-400">{firstName}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Check out today's menu and share your thoughts.</p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="grid gap-3">
            {announcements.map(a => (
              <div key={a.id} className={`
                p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3
                ${a.type === AnnouncementType.WARNING 
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-900 dark:text-amber-100' 
                  : a.type === AnnouncementType.SUCCESS
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100'}
              `}>
                {a.type === AnnouncementType.WARNING ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : a.type === AnnouncementType.SUCCESS ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{a.title}</h4>
                  <FormattedText text={a.message} />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
      {activeTab === 'menu' && (
        <div className="space-y-6">
           {/* Day Selector */}
           <div className="sticky top-16 md:top-0 z-10 bg-orange-50 dark:bg-slate-950 py-2 -mx-4 px-4 md:mx-0 md:px-0 transition-colors duration-200">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
               {days.map(day => (
                 <button
                   key={day}
                   onClick={() => setSelectedDay(day)}
                   className={`
                     px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
                     ${selectedDay === day 
                       ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                       : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700'}
                   `}
                 >
                   {day}
                 </button>
               ))}
             </div>
           </div>

           {/* Menu Cards */}
           {currentDayMenu ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[MealType.BREAKFAST, MealType.LUNCH, MealType.SNACKS, MealType.DINNER].map((meal) => (
                  <div key={meal} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-orange-200 dark:hover:border-orange-900 transition-colors">
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide text-xs">{meal}</h4>
                      {isToday && isFeedbackUnlocked(meal) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Rate Now
                        </span>
                      )}
                    </div>
                    
                    <div className="p-5">
                    {(currentDayMenu[meal] || []).length === 0 ? (
                       <div className="text-center py-6">
                         <p className="text-slate-400 dark:text-slate-600 text-sm italic">Nothing on the menu.</p>
                       </div>
                    ) : (
                      <div className="space-y-6">
                    {(currentDayMenu[meal] || []).map(dish => {
                      // 👇 FIX: Check both "isVeg" and "isveg" to handle JSON casing errors
                      const isDishVeg = dish.isVeg !== undefined ? dish.isVeg : (dish as any).isveg;

                      return (
                        <div key={dish.id} className="flex gap-4 items-start">
                            <img src={dish.image} alt={dish.name} className="w-20 h-20 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shadow-inner flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-semibold text-slate-900 dark:text-white truncate">{dish.name}</h5>
                                
                                {/* 👇 UPDATED CHECK: Uses the safe 'isDishVeg' variable */}
                                {isDishVeg ? (
                                  <div className="w-4 h-4 rounded border border-green-500 flex items-center justify-center flex-shrink-0" title="Veg">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded border border-red-500 flex items-center justify-center flex-shrink-0" title="Non-Veg">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{dish.description}</p>
                              
                              <div className="mt-3">
                                {isToday && isFeedbackUnlocked(meal) && !feedbackMap[dish.id] && (
                                  <button 
                                    onClick={() => setActiveFeedbackDish({ id: dish.id, name: dish.name, meal })}
                                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 transition-colors"
                                  >
                                    <Star className="w-3.5 h-3.5" /> Rate Dish
                                  </button>
                                )}
                                {feedbackMap[dish.id] && (
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5"/> Feedback Submitted
                                    </span>
                                )}
                                {(!isToday || !isFeedbackUnlocked(meal)) && !feedbackMap[dish.id] && (
                                    <span className="text-xs text-slate-400 dark:text-slate-600 flex items-center gap-1 cursor-not-allowed">
                                      <Star className="w-3.5 h-3.5" /> Locked
                                    </span>
                                )}
                              </div>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                    )}
                    </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
               <p className="text-slate-500 dark:text-slate-400">Menu not available for this day.</p>
             </div>
           )}
        </div>
      )}

      {/* Other Tabs */}
      {activeTab === 'feedback' && (
        <div className="max-w-2xl mx-auto space-y-6">
           <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                 <Star className="w-6 h-6"/>
              </div>
              <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Feedback History</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Past ratings and reviews you've submitted.</p>
              </div>
           </div>

           {myFeedbacks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                 <p className="text-slate-400 italic">You haven't submitted any feedback yet.</p>
              </div>
           ) : (
              <div className="grid gap-4">
                 {myFeedbacks.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                             <h4 className="font-bold text-slate-800 dark:text-white">{item.dishName}</h4>
                             <span className="text-xs text-slate-500 dark:text-slate-400">{item.date} • {item.mealType}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30">
                             <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500"/>
                             <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{item.rating}</span>
                          </div>
                       </div>
                       {item.comment && (
                          <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                             <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{item.comment}"</p>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <MessageSquare className="w-5 h-5"/>
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Make a Suggestion</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Help us improve the menu and service.</p>
               </div>
            </div>
            
            <form onSubmit={handleSuggestionSubmit}>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your Feedback / Request</label>
               <textarea
                 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all dark:text-white resize-none"
                 rows={5}
                 placeholder="e.g. Please increase the spiciness in the curry..."
                 value={suggestionText}
                 onChange={(e) => setSuggestionText(e.target.value)}
               ></textarea>
               <div className="mt-6 flex justify-between items-center">
                 <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">{suggestionStatus}</span>
                 <Button type="submit" disabled={!suggestionText} className="px-8">Submit</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'canteen' && (
        <div className="flex flex-col items-center justify-center py-6">
           {settings.canteenEnabled ? (
             <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Canteen Menu</h3>
                  <p className="text-slate-500 dark:text-slate-400">Order tasty snacks and drinks</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {canteenMenu.filter(item => item.isAvailable).map(item => (
                      <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:border-orange-300 transition-colors">
                         <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                         <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{item.category}</span>
                            <div className="mt-2 flex items-center justify-between">
                               <p className="text-lg font-bold text-orange-600 dark:text-orange-400">₹{item.price}</p>
                               <button className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
                                  View
                               </button>
                            </div>
                         </div>
                      </div>
                   ))}
                   {canteenMenu.filter(item => item.isAvailable).length === 0 && (
                      <div className="col-span-full text-center py-10">
                        <p className="text-slate-400 italic">No items available in canteen right now.</p>
                      </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="text-center py-20 px-6 max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                   <UtensilsCrossed size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Canteen Closed</h3>
                <p className="text-slate-500 dark:text-slate-400">The canteen section is currently disabled by the admin. Please check back later.</p>
             </div>
           )}
        </div>
      )}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[70px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${
              activeTab === item.id 
                ? 'text-orange-500 dark:text-orange-400' 
                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            <item.icon 
              size={24} 
              strokeWidth={activeTab === item.id ? 2.5 : 2} 
              className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'scale-100'}`}
            />
            <span className={`text-[10px] font-bold ${activeTab === item.id ? 'opacity-100' : 'opacity-80'}`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <span className="w-1 h-1 rounded-full bg-orange-500 dark:bg-orange-400 absolute bottom-1"></span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback Modal */}
      {activeFeedbackDish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 relative">
              <button 
                onClick={() => setActiveFeedbackDish(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rate {activeFeedbackDish.name}</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">{activeFeedbackDish.meal}</p>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                 {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                       key={star} 
                       onClick={() => setRating(star)}
                       className="p-1 hover:scale-110 transition-transform"
                    >
                       <Star 
                         size={32} 
                         className={`${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                       />
                    </button>
                 ))}
              </div>

              <textarea 
                 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white text-sm mb-4 resize-none"
                 rows={3}
                 placeholder="Any comments? (Optional)"
                 value={comment}
                 onChange={(e) => setComment(e.target.value)}
              ></textarea>

              <Button fullWidth onClick={handleSubmitFeedback} className="shadow-lg shadow-orange-500/20">
                 Submit Feedback
              </Button>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in-50 duration-300">
            <LottiePlayer type="success" className="w-32 h-32" loop={false} />
            <h3 className="text-xl font-bold mt-4 text-slate-800 dark:text-white">Submitted!</h3>
            <p className="text-slate-500 text-sm">Thanks for your suggestion.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER 1: BOLD TEXT FORMATTER ---
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="text-sm opacity-90">
      {text.split('\n').map((line, i) => (
        <p key={i} className={`min-h-[1.25em] ${i > 0 ? 'mt-1' : ''}`}>
          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      ))}
    </div>
  );
};

// --- HELPER 2: LOADING SKELETON (SHIMMER EFFECT) ---
const LoadingSkeleton = ({ navItems, activeTab, setActiveTab }: any) => {
  return (
    <div className="space-y-6 pb-28">
      {/* Header Skeleton */}
      <div className="flex justify-between items-end animate-pulse">
         <div className="space-y-3">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
         </div>
         <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-lg hidden md:block"></div>
      </div>

      {/* Days Skeleton */}
      <div className="flex gap-2 overflow-hidden py-2 animate-pulse">
         {[1,2,3,4,5].map(i => (
           <div key={i} className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-full flex-shrink-0"></div>
         ))}
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 h-64 animate-pulse p-4 flex flex-col gap-4">
             <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
             </div>
             <div className="flex gap-4">
               <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl flex-shrink-0"></div>
               <div className="flex-1 space-y-2">
                 <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                 <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                 <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav (Static) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[70px]">
        {navItems.map((item: any) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full ${
              activeTab === item.id ? 'text-orange-500' : 'text-slate-400'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};