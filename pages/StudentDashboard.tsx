import React, { useState, useEffect } from 'react';
import { User, DailyMenu, MealType, Announcement, Feedback, AppSettings, CanteenItem, AnnouncementType } from '../types';
import { MockDB } from '../services/mockDb';
import { getCurrentDayName, isFeedbackUnlocked, getTodayDateString } from '../services/timeUtils';
import { Button } from '../components/Button';
import { LottiePlayer } from '../components/LottiePlayer'; 
import { Star, MessageSquare, AlertCircle, UtensilsCrossed, Calendar, CheckCircle2, X, Info, AlertTriangle } from 'lucide-react';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/animations/loading.json';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'feedback' | 'suggestions' | 'canteen'>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Data States
  const [menu, setMenu] = useState<DailyMenu[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday'); // Default to Monday if helper fails
  const [settings, setSettings] = useState<AppSettings>({ canteenEnabled: false, splashVideoEnabled: false });
  const [canteenMenu, setCanteenMenu] = useState<CanteenItem[]>([]);
  
  // Feedback States
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, boolean>>({}); 
  const [activeFeedbackDish, setActiveFeedbackDish] = useState<{id: string, name: string, meal: MealType} | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Suggestion States
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState('');

  // Video Splash States
  const [showSplash, setShowSplash] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  
  const desktopVideoUrl = "https://files.catbox.moe/camisw.mp4";
  const mobileVideoUrl = "https://files.catbox.moe/zv8gqr.mp4";

  // Safe Initialization of Day Name
  useEffect(() => {
    try {
      const day = getCurrentDayName();
      setSelectedDay(day);
    } catch (e) {
      console.warn("Could not get current day name, defaulting to Monday");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);

        const [m, a, s, allF, c] = await Promise.all([
          MockDB.getWeeklyMenu(),
          MockDB.getAnnouncements(),
          MockDB.getSettings(),
          MockDB.getAllFeedback(),
          MockDB.getCanteenMenu()
        ]);
        
        setMenu(m || []);
        setAnnouncements(a || []);
        setSettings(s || { canteenEnabled: false, splashVideoEnabled: false });
        setCanteenMenu(c || []);

        if (s?.splashVideoEnabled) {
           setShowSplash(true); 
        } else {
           setShowSplash(false);
        }

        // --- SAFE DATE & FEEDBACK PROCESSING ---
        // On some mobiles, date functions might throw errors. We handle that here.
        let today = new Date().toISOString().split('T')[0];
        try {
           today = getTodayDateString();
        } catch (e) {
           console.warn("Date utility failed, using fallback date.", e);
        }

        const safeAllF = Array.isArray(allF) ? allF : [];
        const userFeedbackHistory = safeAllF
          .filter(f => f && f.userId === user.uid)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        setMyFeedbacks(userFeedbackHistory);

        const myTodayFeedback = userFeedbackHistory.filter(f => f.date === today);
        const map: Record<string, boolean> = {};
        myTodayFeedback.forEach(f => {
          if (f.dishId) map[f.dishId] = true;
        });
        setFeedbackMap(map);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(true);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };

    const hasSeen = localStorage.getItem('introVideoSeen');
    if (hasSeen) {
      setCanSkip(true);
    } else {
      setCanSkip(false);
    }

    fetchData();
  }, [user.uid]);

  useEffect(() => {
    const checkAndNotify = () => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!menu || menu.length === 0) return;

      try {
        const hour = new Date().getHours();
        let todayDate = new Date().toISOString().split('T')[0];
        try { todayDate = getTodayDateString(); } catch (e) {}
        
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
                 new Notification(`Time for ${currentMeal}! 🍽️`, {
                   body: `The menu is live. Rate your food now!`,
                   icon: '/pwa-192x192.png'
                 });
                 localStorage.setItem(notifKey, 'true');
               }
            }
          }
        }
      } catch (e) {
        console.error("Notification logic failed silently", e);
      }
    };

    if ("Notification" in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(e => console.log(e));
    }

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000); 
    return () => clearInterval(interval);
  }, [menu, feedbackMap]);

  const handleVideoEnd = () => {
    localStorage.setItem('introVideoSeen', 'true'); 
    setShowSplash(false); 
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    await MockDB.submitSuggestion({
      id: Date.now().toString(),
      userId: user.uid,
      userName: user.displayName || 'Student',
      text: suggestionText,
      timestamp: Date.now()
    });

    setSuggestionText('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSubmitFeedback = async () => {
    if (!activeFeedbackDish) return;
    
    let today = new Date().toISOString().split('T')[0];
    try { today = getTodayDateString(); } catch(e) {}

    const feedback: Feedback = {
      id: Date.now().toString(),
      dishId: activeFeedbackDish.id,
      dishName: activeFeedbackDish.name,
      mealType: activeFeedbackDish.meal,
      userId: user.uid,
      userName: user.displayName || 'Student',
      rating,
      comment,
      date: today,
      timestamp: Date.now()
    };

    await MockDB.submitFeedback(feedback);
    
    setFeedbackMap(prev => ({ ...prev, [activeFeedbackDish.id]: true }));
    setMyFeedbacks(prev => [feedback, ...prev]);
    
    setActiveFeedbackDish(null);
    setRating(5);
    setComment('');

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
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
  
  // Safe helper for current day check
  const isToday = (() => {
    try {
      return selectedDay === getCurrentDayName();
    } catch {
      return false;
    }
  })();

  const navItems = [
    { id: 'menu', label: 'Menu', icon: Calendar },
    { id: 'feedback', label: 'My Feedback', icon: Star },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
    { id: 'canteen', label: 'Canteen', icon: UtensilsCrossed }
  ];

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-700">
        {canSkip && (
          <button 
            onClick={handleVideoEnd}
            className="absolute top-8 right-8 z-[110] bg-black/20 backdrop-blur-md text-slate-200 px-6 py-2 rounded-full text-sm font-bold border border-white/10 hover:bg-black/40 transition-all flex items-center gap-2"
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
          <source src={mobileVideoUrl} type="video/mp4" media="(max-width: 768px)" />
          <source src={desktopVideoUrl} type="video/mp4" />
        </video>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-950">
        <div className="w-64 h-64 p-8 bg-white/50 dark:bg-slate-900/50 rounded-full backdrop-blur-xl shadow-2xl shadow-orange-500/10 animate-pulse">
           <Lottie animationData={loadingAnimation} loop={true} />
        </div>
        <p className="text-orange-500/80 animate-pulse mt-8 font-bold tracking-widest uppercase text-sm">Preparing Menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
          <LottiePlayer type="404" className="w-64 h-64 mb-4 relative z-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
          Connection Lost
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
          We couldn't fetch the menu. Check your internet or try again later.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-10 rounded-2xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 transform hover:-translate-y-1"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 bg-gradient-to-b from-orange-50/30 via-transparent to-transparent dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 min-h-screen">
      
      {/* Enhanced Greeting Section */}
      <div className="relative pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 z-10 relative">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight drop-shadow-sm">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400">
                {getGreeting()},
              </span> 
              <br className="md:hidden" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 ml-2 md:ml-3">
                {firstName}
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              The kitchen is serving delicious meals today.
            </p>
          </div>
          <div className="text-right hidden md:block bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 dark:border-slate-700 shadow-sm">
             <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </p>
          </div>
        </div>
      </div>

      {/* Modern Announcements */}
      {announcements.length > 0 && (
        <div className="grid gap-4">
            {announcements.map(a => (
              <div key={a.id} className={`
                relative overflow-hidden p-5 rounded-2xl border flex items-start gap-4 shadow-lg transition-transform hover:scale-[1.01] duration-300
                ${a.type === AnnouncementType.WARNING 
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200/50 dark:border-amber-800/50' 
                  : a.type === AnnouncementType.SUCCESS
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-200/50 dark:border-emerald-800/50'
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200/50 dark:border-blue-800/50'}
              `}>
                <div className={`
                  p-3 rounded-xl shadow-inner
                  ${a.type === AnnouncementType.WARNING ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600' :
                    a.type === AnnouncementType.SUCCESS ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' :
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-600'}
                `}>
                  {a.type === AnnouncementType.WARNING ? <AlertTriangle className="w-6 h-6" /> : 
                   a.type === AnnouncementType.SUCCESS ? <CheckCircle2 className="w-6 h-6" /> : 
                   <Info className="w-6 h-6" />}
                </div>
                <div className="flex-1 z-10">
                  <h4 className={`font-bold text-base mb-1
                     ${a.type === AnnouncementType.WARNING ? 'text-amber-900 dark:text-amber-100' :
                       a.type === AnnouncementType.SUCCESS ? 'text-emerald-900 dark:text-emerald-100' :
                       'text-blue-900 dark:text-blue-100'}
                  `}>{a.title}</h4>
                  <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    <FormattedText text={a.message} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[500px]">
      {activeTab === 'menu' && (
        <div className="space-y-8">
           {/* Floating Glass Day Selector - Z-Index: 15 (Between content and header) */}
           <div className="sticky top-20 z-[15] mx-auto max-w-full">
             <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-black/40 p-2 rounded-3xl overflow-x-auto pb-2 scrollbar-hide flex gap-2">
               {days.map(day => (
                 <button
                   key={day}
                   onClick={() => setSelectedDay(day)}
                   className={`
                     px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap relative overflow-hidden group
                     ${selectedDay === day 
                       ? 'text-white shadow-lg shadow-orange-500/30 scale-105' 
                       : 'text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-800'}
                   `}
                 >
                   {selectedDay === day && (
                     <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                   )}
                   <span className="relative z-10 md:hidden">{day.slice(0, 3)}</span>
                   <span className="relative z-10 hidden md:inline">{day}</span>
                 </button>
               ))}
             </div>
           </div>

           {/* Menu Cards Grid */}
           {currentDayMenu ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[MealType.BREAKFAST, MealType.LUNCH, MealType.SNACKS, MealType.DINNER].map((meal, index) => (
                  <div key={meal} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500">
                    
                    {/* Artistic Header */}
                    <div className={`h-24 relative overflow-hidden flex items-center px-8
                      ${index === 0 ? 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30' :
                        index === 1 ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-950/30' :
                        index === 2 ? 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-950/30 dark:to-rose-950/30' :
                        'bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-950/30 dark:to-violet-950/30'}
                    `}>
                       <div className="absolute -right-6 -top-6 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-700">
                          <UtensilsCrossed size={140} className="text-slate-900 dark:text-white" />
                       </div>
                       
                       <div className="relative z-10 w-full flex justify-between items-center">
                          <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{meal}</h4>
                          {isToday && isFeedbackUnlocked(meal) && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm animate-bounce-slow">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Live
                            </span>
                          )}
                       </div>
                    </div>
                    
                    <div className="p-6">
                    {(currentDayMenu[meal] || []).length === 0 ? (
                       <div className="text-center py-10 opacity-50">
                         <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                         <p className="text-slate-400 dark:text-slate-600 font-medium">Kitchen is resting.</p>
                       </div>
                    ) : (
                      <div className="space-y-6">
                    {(currentDayMenu[meal] || []).map(dish => {
                      const isDishVeg = dish.isVeg !== undefined ? dish.isVeg : (dish as any).isveg;
                      return (
                        <div key={dish.id} className="flex gap-5 items-start p-3 -mx-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-300">
                            {/* Dish Image with Pop Effect */}
                            <div className="relative group/img">
                               <div className="absolute inset-0 bg-orange-500 rounded-2xl blur opacity-0 group-hover/img:opacity-20 transition-opacity duration-500"></div>
                               <img src={dish.image} alt={dish.name} className="w-24 h-24 rounded-2xl object-cover shadow-md relative z-0 transform group-hover/img:scale-105 transition-transform duration-500" />
                               {/* FIX: Z-Index to 5 (lowest) so it slides under everything */}
                               <div className="absolute -top-2 -left-2 z-[5]">
                                  {isDishVeg ? (
                                    <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-green-100">
                                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-red-100">
                                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                    </div>
                                  )}
                               </div>
                            </div>

                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{dish.name}</h5>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed opacity-80">{dish.description}</p>
                              
                              <div className="mt-4 flex items-center gap-3">
                                {isToday && isFeedbackUnlocked(meal) && !feedbackMap[dish.id] && (
                                  <button 
                                    onClick={() => setActiveFeedbackDish({ id: dish.id, name: dish.name, meal })}
                                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 hover:bg-orange-600 dark:hover:bg-orange-400 hover:text-white dark:hover:text-slate-900 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                  >
                                    <Star className="w-3.5 h-3.5" fill="currentColor" /> Rate It
                                  </button>
                                )}
                                {feedbackMap[dish.id] && (
                                    <span className="px-3 py-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-200/50 dark:border-emerald-800/30">
                                      <CheckCircle2 className="w-3.5 h-3.5"/> Rated
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
             <div className="flex flex-col items-center justify-center py-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
               <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
               <p className="text-slate-500 dark:text-slate-400 font-medium">Menu loading or unavailable.</p>
             </div>
           )}
        </div>
      )}

      {/* FEEDBACK TAB */}
      {activeTab === 'feedback' && (
        <div className="max-w-3xl mx-auto space-y-8">
           <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 rounded-[2rem] shadow-2xl shadow-orange-500/20 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10">
                 <Star size={200} fill="currentColor" />
              </div>
              <div className="relative z-10">
                 <h3 className="text-3xl font-extrabold mb-2">My Food Journey</h3>
                 <p className="text-orange-100 font-medium max-w-md">Track your ratings and help us improve the taste every single day.</p>
              </div>
           </div>

           {myFeedbacks.length === 0 ? (
              <div className="text-center py-20">
                 <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Star className="w-10 h-10 text-slate-300" />
                 </div>
                 <p className="text-slate-400 italic">No feedback history found.</p>
              </div>
           ) : (
              <div className="grid gap-6">
                 {myFeedbacks.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/50 hover:shadow-xl transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-xl">
                                {item.dishName.charAt(0)}
                             </div>
                             <div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">{item.dishName}</h4>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.date} • {item.mealType}</span>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                             <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                   <Star key={i} size={14} className={i < item.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"} />
                                ))}
                             </div>
                             <span className="text-xs font-bold text-slate-400">Rating: {item.rating}/5</span>
                          </div>
                       </div>
                       {item.comment && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                             <p className="text-slate-600 dark:text-slate-300 italic text-sm leading-relaxed">"{item.comment}"</p>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           )}
        </div>
      )}

      {/* SUGGESTIONS TAB */}
      {activeTab === 'suggestions' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500"></div>
            
            <div className="text-center mb-10">
               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                  <MessageSquare className="w-8 h-8"/>
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white">Voice Box</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-2">Suggest a new dish or report an issue directly to the mess secretary.</p>
            </div>
            
            <form onSubmit={handleSuggestionSubmit} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Your Message</label>
                 <textarea
                   className="w-full bg-slate-50 dark:bg-slate-950 border-0 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all shadow-inner text-base resize-none"
                   rows={6}
                   placeholder="Type your suggestion here..."
                   value={suggestionText}
                   onChange={(e) => setSuggestionText(e.target.value)}
                 ></textarea>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">{suggestionStatus}</span>
                 <Button type="submit" disabled={!suggestionText} className="px-10 py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20">Send Suggestion</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* CANTEEN TAB */}
      {activeTab === 'canteen' && (
        <div className="flex flex-col items-center justify-center py-6">
           {settings.canteenEnabled ? (
             <div className="max-w-5xl w-full">
                <div className="text-center mb-12">
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-3">Canteen</h3>
                  <div className="h-1 w-20 bg-orange-500 mx-auto rounded-full"></div>
                  <p className="text-slate-500 dark:text-slate-400 mt-4">Order extras, drinks, and special treats.</p>
                </div>
                
                {/* UPDATED: 2 columns on mobile, 4 on desktop. Reduced gap. */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                   {canteenMenu.filter(item => item.isAvailable).map(item => (
                      <div key={item.id} className="bg-white dark:bg-slate-900 p-2 md:p-3 rounded-2xl md:rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-800 group">
                         {/* UPDATED: Compact image container */}
                         <div className="relative overflow-hidden rounded-xl md:rounded-2xl aspect-square mb-2 md:mb-3">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                            {/* UPDATED: Smaller category badge */}
                            <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold">
                               {item.category}
                            </div>
                         </div>
                         <div>
                            {/* UPDATED: Responsive text sizes */}
                            <h4 className="font-bold text-sm md:text-lg text-slate-900 dark:text-white mb-1 truncate">{item.name}</h4>
                            <div className="flex items-center justify-between mt-1 md:mt-3">
                               {/* UPDATED: Smaller price font */}
                               <p className="text-base md:text-2xl font-black text-orange-600 dark:text-orange-400">₹{item.price}</p>
                               {/* UPDATED: Smaller button size */}
                               <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:bg-orange-600 dark:hover:bg-orange-400 transition-colors">
                                  <UtensilsCrossed size={14} className="md:w-[18px] md:h-[18px]" />
                               </button>
                            </div>
                         </div>
                      </div>
                   ))}
                   {canteenMenu.filter(item => item.isAvailable).length === 0 && (
                      <div className="col-span-full text-center py-16">
                        <p className="text-slate-400 text-lg font-light">Stocks are empty right now.</p>
                      </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="text-center py-24 px-8 max-w-lg mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/60 dark:border-slate-700 shadow-2xl">
                <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-6 animate-pulse">
                   <UtensilsCrossed size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Currently Closed</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">The canteen is taking a break. Come back later for tasty snacks!</p>
             </div>
           )}
        </div>
      )}
      </div>

      {/* Floating Glass Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[400px] z-40">
        <div className="bg-black/80 dark:bg-white/10 backdrop-blur-xl border border-white/10 dark:border-white/20 rounded-full px-6 py-4 shadow-2xl flex justify-between items-center gap-4 md:gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 w-14 ${
                activeTab === item.id 
                  ? 'text-orange-400 scale-110' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className={`p-2 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-white/10' : 'bg-transparent'}`}>
                <item.icon 
                  size={24} 
                  strokeWidth={activeTab === item.id ? 2.5 : 2} 
                />
              </div>
              {activeTab === item.id && (
                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-orange-400 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Feedback Modal */}
      {activeFeedbackDish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm p-8 border border-slate-200 dark:border-slate-700 relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setActiveFeedbackDish(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="text-center mb-8">
                 <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                    {activeFeedbackDish.meal}
                 </span>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-2">{activeFeedbackDish.name}</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">How was the taste today?</p>
              </div>

              <div className="flex justify-center gap-3 mb-8">
                 {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                       key={star} 
                       onClick={() => setRating(star)}
                       className="group p-1 relative"
                    >
                       <Star 
                         size={36} 
                         className={`transition-all duration-200 ${star <= rating ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-lg' : 'text-slate-200 dark:text-slate-700 group-hover:text-amber-200'}`} 
                       />
                    </button>
                 ))}
              </div>

              <textarea 
                 className="w-full bg-slate-50 dark:bg-slate-950 border-0 ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl p-4 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white text-sm mb-6 resize-none shadow-inner"
                 rows={3}
                 placeholder="Tell the chef what you think... (Optional)"
                 value={comment}
                 onChange={(e) => setComment(e.target.value)}
              ></textarea>

              <Button fullWidth onClick={handleSubmitFeedback} className="py-4 text-base font-bold shadow-xl shadow-orange-500/20 rounded-xl">
                 Submit Review
              </Button>
           </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in zoom-in-50 duration-300 border border-white/20">
            <div className="scale-150 mb-4">
               <LottiePlayer type="success" className="w-32 h-32" loop={false} />
            </div>
            <h3 className="text-2xl font-black mt-4 text-slate-800 dark:text-white">Awesome!</h3>
            <p className="text-slate-500 text-base font-medium">Your feedback has been recorded.</p>
          </div>
        </div>
      )}
    </div>
  );
};

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