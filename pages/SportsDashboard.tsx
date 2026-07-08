import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trophy, Users, Calendar, Plus, Clock, MapPin, Search, 
  Pencil, Trash2, X, LayoutDashboard, Dumbbell, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { User, SportsEquipment, SportsBooking, TeamRequest, UserRole } from '../types';
import { MockDB } from '../services/mockDb';
import { Button } from '../components/Button';
import { getTodayDateString } from '../services/timeUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const SportsDashboard = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const isAdmin = user.role === UserRole.ADMIN;
  const today = getTodayDateString();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'teams'>('overview');
  const [equipment, setEquipment] = useState<SportsEquipment[]>([]);
  const [bookings, setBookings] = useState<SportsBooking[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Theme State
  const [themeGradient, setThemeGradient] = useState('from-orange-500 to-amber-500'); 
  const [themeColorHex, setThemeColorHex] = useState('#f97316'); 

  // Forms
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SportsEquipment | null>(null);
  const [bookingTime, setBookingTime] = useState({ start: '', end: '' });

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ sport: 'Cricket', playersNeeded: 1, time: '', description: '' });

  const [showEquipModal, setShowEquipModal] = useState(false);
  const [equipForm, setEquipForm] = useState<Partial<SportsEquipment>>({ name: '', category: 'Court', total: 1, available: 1 });

  // --- LOAD DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [eq, bk, tr, services] = await Promise.all([
         MockDB.getSportsEquipment(),
         MockDB.getBookings(today),
         MockDB.getTeamRequests(),
         MockDB.getServices() 
      ]);
      setEquipment(eq);
      setBookings(bk);
      setTeamRequests(tr);

      const sportsService = services.find(s => s.id === 'sports' || s.title.toLowerCase().includes('sport'));
      if (sportsService) {
         setThemeGradient(sportsService.color);
         if (sportsService.color.includes('blue')) setThemeColorHex('#3b82f6');
         else if (sportsService.color.includes('red')) setThemeColorHex('#ef4444');
         else if (sportsService.color.includes('green')) setThemeColorHex('#22c55e');
         else if (sportsService.color.includes('purple')) setThemeColorHex('#a855f7');
         else if (sportsService.color.includes('cyan')) setThemeColorHex('#06b6d4');
         else if (sportsService.color.includes('pink')) setThemeColorHex('#ec4899');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- HANDLERS ---
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const booking: SportsBooking = {
       id: '', equipmentId: selectedItem.id, equipmentName: selectedItem.name,
       userId: user.uid, userName: user.displayName || 'Student',
       date: today, startTime: bookingTime.start, endTime: bookingTime.end, status: 'Active'
    };
    await MockDB.bookSportItem(booking);
    setShowBookingModal(false);
    loadData();
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const req: TeamRequest = {
       id: '', sport: newTeam.sport, creatorId: user.uid, creatorName: user.displayName || 'Host',
       date: today, time: newTeam.time, playersNeeded: Number(newTeam.playersNeeded),
       playersJoined: [user.displayName || 'Host'], description: newTeam.description
    };
    await MockDB.createTeamRequest(req);
    setShowTeamModal(false);
    loadData();
  };

  const handleJoinTeam = async (req: TeamRequest) => {
     if (req.playersJoined.includes(user.displayName || '')) return;
     const updatedList = [...req.playersJoined, user.displayName || 'Guest'];
     await MockDB.addPlayerToTeam(req.id, updatedList);
     loadData();
  };

  // Admin Handlers
  const handleSaveEquipment = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!equipForm.name) return;
     const itemToSave = {
        id: equipForm.id || '',
        name: equipForm.name,
        category: equipForm.category || 'Court',
        total: Number(equipForm.total) || 1,
        available: Number(equipForm.total) || 1,
     } as SportsEquipment;
     
     await MockDB.saveSportsEquipment(itemToSave);
     setShowEquipModal(false);
     loadData();
  };

  const handleDeleteEquipment = async (id: string) => {
     if (confirm('Are you sure you want to delete this equipment?')) {
        await MockDB.deleteSportsEquipment(id);
        loadData();
     }
  };

  const openAddEquip = () => { setEquipForm({ name: '', category: 'Court', total: 1, available: 1 }); setShowEquipModal(true); };
  const openEditEquip = (item: SportsEquipment) => { setEquipForm(item); setShowEquipModal(true); };

  // --- NAV ITEMS ---
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'equipment', label: 'Courts & Gear', icon: Dumbbell },
    { id: 'teams', label: 'Teammates', icon: Users }
  ];

  // --- DERIVED DATA ---
  const myBookings = bookings.filter(b => b.userId === user.uid);
  const myTeams = teamRequests.filter(t => t.playersJoined.includes(user.displayName || ''));
  const activeRequestsCount = teamRequests.length;
  
  const chartData = [
    { name: 'Booked', value: bookings.length, color: themeColorHex },
    { name: 'Available', value: Math.max(0, equipment.reduce((a,b) => a + b.total, 0) - bookings.length), color: '#cbd5e1' }
  ];

  // Safe Gradient Logic
  const gradientParts = themeGradient.split(' ');
  const fromColor = gradientParts[0] ? gradientParts[0].replace('from-', '') : 'orange-500';
  const toColor = gradientParts[1] ? gradientParts[1].replace('to-', '') : 'amber-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 animate-in fade-in">
      
      {/* HEADER */}
      <div className="pt-6 px-6 pb-2">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                   {/* Icon with gradient text */}
                   <Trophy className="text-transparent bg-clip-text" style={{ stroke: 'url(#gradient-stroke)' }} /> 
                   <svg width="0" height="0">
                     <linearGradient id="gradient-stroke" x1="100%" y1="100%" x2="0%" y2="0%">
                       <stop stopColor="currentColor" offset="0%" className={`text-${toColor}`} />
                       <stop stopColor="currentColor" offset="100%" className={`text-${fromColor}`} />
                     </linearGradient>
                   </svg>
                   Sports
                   <span className={`bg-gradient-to-r ${themeGradient} bg-clip-text text-transparent`}>Connect</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm ml-1">Gym • Courts • Ground</p>
             </div>
             
             <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</p>
                <p className="font-bold text-slate-800 dark:text-white">{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short'})}</p>
             </div>
         </div>
         
         <button
           onClick={() => navigate('/')}
           className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm mb-4"
         >
           <ArrowLeft size={16} /> Back to Hub
         </button>
      </div>

      <main className="px-4 md:px-8 max-w-7xl mx-auto">
         
         {/* ======================= */}
         {/* TAB: OVERVIEW        */}
         {/* ======================= */}
         {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* ADMIN OVERVIEW */}
               {isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className={`bg-gradient-to-br ${themeGradient} rounded-[2rem] p-6 text-white shadow-lg`}>
                        <p className="text-white/80 font-bold text-xs uppercase tracking-wider">Total Bookings Today</p>
                        <p className="text-4xl font-black mt-2">{bookings.length}</p>
                     </div>
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Team Requests</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{activeRequestsCount}</p>
                     </div>
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm h-48 relative">
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider absolute top-6 left-6">Usage Stats</p>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                 {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                              </Pie>
                              <Tooltip />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               )}

               {/* STUDENT OVERVIEW */}
               {!isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* My Status Card with Dynamic Gradient */}
                     <div className={`bg-gradient-to-r ${themeGradient} rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group`}>
                        <div className="relative z-10">
                           <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">My Activity</p>
                           <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-white/20 rounded-2xl text-white">
                                 <Calendar size={32}/>
                              </div>
                              <div>
                                 <h4 className="text-2xl font-black text-white">
                                    {myBookings.length} Bookings
                                 </h4>
                                 <p className="text-white/80 text-sm">
                                    {myTeams.length > 0 ? `${myTeams.length} Matches Joined` : "No matches joined"}
                                 </p>
                              </div>
                           </div>
                           
                           {/* 🟢 FIXED BUTTON: Slate-900 Background, White Text, Small Width */}
                           <Button 
                              onClick={() => { setActiveTab('equipment'); }}
                              className="bg-slate-900 hover:bg-slate-800 text-white border-none shadow-lg w-fit px-6 justify-between group-hover:scale-[1.02] transition-transform"
                           >
                              Book Now <ChevronRight size={16}/>
                           </Button>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-40px] opacity-10 rotate-12">
                           <Trophy size={200} />
                        </div>
                     </div>

                     {/* Recent List */}
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Your Schedule</h3>
                        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-48">
                           {myBookings.length === 0 && myTeams.length === 0 && <p className="text-slate-400 text-sm italic">Nothing scheduled for today.</p>}
                           
                           {myBookings.map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                 <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-slate-200 dark:bg-slate-700`} style={{ color: themeColorHex }}><Clock size={14}/></div>
                                    <div>
                                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.equipmentName}</p>
                                       <p className="text-[10px] text-slate-500">{b.startTime} - {b.endTime}</p>
                                    </div>
                                 </div>
                                 <div className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Confirmed</div>
                              </div>
                           ))}

                           {myTeams.map(t => (
                              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                 <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700" style={{ color: themeColorHex }}><Users size={14}/></div>
                                    <div>
                                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.sport} Match</p>
                                       <p className="text-[10px] text-slate-500">at {t.time}</p>
                                    </div>
                                 </div>
                                 <div className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Joined</div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         )}

         {/* ======================= */}
         {/* TAB: EQUIPMENT       */}
         {/* ======================= */}
         {activeTab === 'equipment' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Equipment & Courts</h2>
                  {isAdmin && (
                     <Button onClick={openAddEquip} size="sm" className={`flex items-center gap-2 bg-gradient-to-r ${themeGradient} border-none`}><Plus size={16}/> Add Item</Button>
                  )}
               </div>

               {equipment.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                     <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-2"/>
                     <p className="text-slate-500">No equipment added yet.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {equipment.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors group">
                           <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-slate-50 dark:bg-slate-800`} style={{ color: themeColorHex }}>
                                 {item.category === 'Court' ? <MapPin size={24}/> : <Trophy size={24}/>}
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-900 dark:text-white text-lg">{item.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{item.category}</span>
                                    <span className="text-xs text-slate-400">• {item.total} Units</span>
                                 </div>
                              </div>
                           </div>
                           
                           {isAdmin ? (
                              <div className="flex gap-2">
                                 <button onClick={() => openEditEquip(item)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors"><Pencil size={18}/></button>
                                 <button onClick={() => handleDeleteEquipment(item.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors"><Trash2 size={18}/></button>
                              </div>
                           ) : (
                              // 🟢 FIXED: Explicit white text for gradient button
                              <Button size="sm" onClick={() => { setSelectedItem(item); setShowBookingModal(true); }} className={`bg-gradient-to-r ${themeGradient} border-none text-white`}>Book</Button>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* ======================= */}
         {/* TAB: TEAMS           */}
         {/* ======================= */}
         {activeTab === 'teams' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Find Teammates</h2>
                  <Button onClick={() => setShowTeamModal(true)} size="sm" className={`flex items-center gap-2 bg-gradient-to-r ${themeGradient} border-none text-white`}><Plus size={16}/> Create Request</Button>
               </div>

               {teamRequests.length === 0 ? (
                  <div className="text-center py-24 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                     <Users className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                     <p className="text-slate-500 font-medium">No active team requests.</p>
                     <p className="text-slate-400 text-sm mt-1">Be the first to start a match!</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {teamRequests.map(req => {
                        const isFull = req.playersJoined.length >= req.playersNeeded;
                        const joined = req.playersJoined.includes(user.displayName || '');
                        
                        return (
                           <div key={req.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                              <div className="absolute top-0 right-0 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-bl-2xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                 <Calendar size={12}/> {req.time}
                              </div>
                              
                              <div className="mb-4">
                                 <h4 className="text-xl font-black text-slate-900 dark:text-white">{req.sport}</h4>
                                 <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users size={12}/> Host: {req.creatorName}</p>
                              </div>
                              
                              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl leading-relaxed italic">"{req.description}"</p>
                              
                              <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-4">
                                 <div className="flex -space-x-2">
                                    {req.playersJoined.map((p, i) => (
                                       <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${themeGradient} border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-sm`} title={p}>
                                          {p[0]}
                                       </div>
                                    ))}
                                    {Array.from({length: req.playersNeeded - req.playersJoined.length}).map((_, i) => (
                                       <div key={`e-${i}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs text-slate-400 shadow-inner">?</div>
                                    ))}
                                 </div>
                                 
                                 <Button 
                                    disabled={isFull || joined} 
                                    onClick={() => handleJoinTeam(req)}
                                    variant={joined ? 'secondary' : 'primary'}
                                    size="sm"
                                    className={!joined ? `bg-gradient-to-r ${themeGradient} border-none text-white` : ''}
                                 >
                                    {joined ? 'Joined' : isFull ? 'Full' : 'Join Team'}
                                 </Button>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         )}
      </main>

      {/* 🟢 FLOATING BOTTOM NAVIGATION */}
      <div className="fixed bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[320px] z-40">
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
                  ? 'scale-110' 
                  : 'text-slate-400 hover:text-white'
              }`}
              style={{ color: activeTab === item.id ? themeColorHex : undefined }}
            >
              <div className={`p-2 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-white/10' : 'bg-transparent'}`}>
                <item.icon 
                  size={24} 
                  strokeWidth={activeTab === item.id ? 2.5 : 2} 
                />
              </div>
              {activeTab === item.id && (
                <span className="absolute -bottom-2 w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: themeColorHex }}></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Booking Modal */}
      {showBookingModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">Book {selectedItem?.name}</h3>
                  <button onClick={() => setShowBookingModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               <form onSubmit={handleBook} className="space-y-5">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Start Time</label>
                     <input type="time" className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" required onChange={e => setBookingTime({...bookingTime, start: e.target.value})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">End Time</label>
                     <input type="time" className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" required onChange={e => setBookingTime({...bookingTime, end: e.target.value})} />
                  </div>
                  <Button fullWidth type="submit" className={`py-3 rounded-xl bg-gradient-to-r ${themeGradient} border-none text-white`}>Confirm Booking</Button>
               </form>
            </div>
         </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">Find Teammates</h3>
                  <button onClick={() => setShowTeamModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               <form onSubmit={handleCreateTeam} className="space-y-5">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sport</label>
                     <select className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" onChange={e => setNewTeam({...newTeam, sport: e.target.value})}>
                        <option>Cricket</option><option>Football</option><option>Badminton</option><option>Tennis</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Players Needed</label>
                     <input type="number" className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" onChange={e => setNewTeam({...newTeam, playersNeeded: Number(e.target.value)})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Time</label>
                     <input type="time" className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" onChange={e => setNewTeam({...newTeam, time: e.target.value})} />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                     <textarea className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white resize-none h-20" placeholder="e.g. Friendly match" onChange={e => setNewTeam({...newTeam, description: e.target.value})} />
                  </div>
                  <Button fullWidth type="submit" className={`py-3 rounded-xl bg-gradient-to-r ${themeGradient} border-none text-white`}>Post Request</Button>
               </form>
            </div>
         </div>
      )}

      {/* Admin Equipment Modal */}
      {showEquipModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">{equipForm.id ? 'Edit Item' : 'Add Item'}</h3>
                  <button onClick={() => setShowEquipModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               <form onSubmit={handleSaveEquipment} className="space-y-5">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Item Name</label>
                     <input className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" placeholder="e.g. Badminton Court 1" required value={equipForm.name} onChange={e => setEquipForm({...equipForm, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Type</label>
                        <select className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" value={equipForm.category} onChange={e => setEquipForm({...equipForm, category: e.target.value as any})}>
                           <option value="Court">Court</option>
                           <option value="Gear">Gear</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Qty</label>
                        <input type="number" className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 dark:text-white" placeholder="1" required value={equipForm.total} onChange={e => setEquipForm({...equipForm, total: Number(e.target.value)})} />
                     </div>
                  </div>
                  <Button fullWidth type="submit" className={`py-3 rounded-xl bg-gradient-to-r ${themeGradient} border-none text-white`}>Save Equipment</Button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};