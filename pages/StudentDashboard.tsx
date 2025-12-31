import React, { useState, useEffect } from 'react';
import { User, DailyMenu, MealType, Announcement, Feedback, AppSettings, CanteenItem, AnnouncementType } from '../types';
import { MockDB } from '../services/mockDb';
import { getCurrentDayName, isFeedbackUnlocked, getTodayDateString } from '../services/timeUtils';
import { Button } from '../components/Button';
import { Star, MessageSquare, AlertCircle, UtensilsCrossed, Calendar, CheckCircle2, X, Info, AlertTriangle } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'feedback' | 'suggestions' | 'canteen'>('menu');
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

  useEffect(() => {
    const fetchData = async () => {
      const [m, a, s, allF, c] = await Promise.all([
        MockDB.getWeeklyMenu(),
        MockDB.getAnnouncements(),
        MockDB.getSettings(),
        MockDB.getAllFeedback(),
        MockDB.getCanteenMenu()
      ]);
      setMenu(m);
      setAnnouncements(a);
      setSettings(s);
      setCanteenMenu(c);

      const today = getTodayDateString();
      // Store all user feedbacks for history tab
      const userFeedbackHistory = allF.filter(f => f.userId === user.uid).sort((a, b) => b.timestamp - a.timestamp);
      setMyFeedbacks(userFeedbackHistory);

      // Map today's feedback for locking UI
      const myTodayFeedback = userFeedbackHistory.filter(f => f.date === today);
      const map: Record<string, boolean> = {};
      myTodayFeedback.forEach(f => map[f.dishId] = true);
      setFeedbackMap(map);
    };
    fetchData();
  }, [user.uid]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;
    
    await MockDB.submitSuggestion({
      id: Date.now().toString(),
      userId: user.uid,
      userName: user.displayName,
      text: suggestionText,
      timestamp: Date.now()
    });
    setSuggestionText('');
    setSuggestionStatus('Suggestion sent!');
    setTimeout(() => setSuggestionStatus(''), 3000);
  };

  const handleSubmitFeedback = async () => {
    if (!activeFeedbackDish) return;
    
    const feedback: Feedback = {
      id: Date.now().toString(),
      dishId: activeFeedbackDish.id,
      dishName: activeFeedbackDish.name,
      mealType: activeFeedbackDish.meal,
      userId: user.uid,
      userName: user.displayName,
      rating,
      comment,
      date: getTodayDateString(),
      timestamp: Date.now()
    };

    await MockDB.submitFeedback(feedback);
    setFeedbackMap(prev => ({ ...prev, [activeFeedbackDish.id]: true }));
    // Update local history immediately
    setMyFeedbacks(prev => [feedback, ...prev]);
    
    setActiveFeedbackDish(null);
    setRating(5);
    setComment('');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDayMenu = menu.find(m => m.day === selectedDay);
  const isToday = selectedDay === getCurrentDayName();

  const navItems = [
    { id: 'menu', label: 'Menu', icon: Calendar },
    { id: 'feedback', label: 'My Feedback', icon: Star },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
    { id: 'canteen', label: 'Canteen', icon: UtensilsCrossed }
  ];

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            {getGreeting()}, <span className="text-orange-500 dark:text-orange-400">{user.displayName.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Check out today's menu and share your thoughts.</p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Announcements Section (UPDATED) */}
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
                  {/* FIX: Use FormattedText here instead of <p> */}
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
                    {currentDayMenu[meal].length === 0 ? (
                       <div className="text-center py-6">
                         <p className="text-slate-400 dark:text-slate-600 text-sm italic">Nothing on the menu.</p>
                       </div>
                    ) : (
                      <div className="space-y-6">
                        {currentDayMenu[meal].map(dish => (
                          <div key={dish.id} className="flex gap-4 items-start">
                             <img src={dish.image} alt={dish.name} className="w-20 h-20 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shadow-inner flex-shrink-0" />
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="font-semibold text-slate-900 dark:text-white truncate">{dish.name}</h5>
                                  {dish.isVeg ? (
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
                                
                                {/* Rate Button Logic */}
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
                        ))}
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

    </div>
    
  );
};

// --- HELPER COMPONENT: Render Bold Text & New Lines ---
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  
  return (
    <div className="text-sm opacity-90">
      {text.split('\n').map((line, i) => (
        <p key={i} className={`min-h-[1.25em] ${i > 0 ? 'mt-1' : ''}`}>
          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
            // Check for **bold** markers
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