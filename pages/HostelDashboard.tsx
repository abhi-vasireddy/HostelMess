import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, History, CheckCircle2, Clock, AlertCircle, Trash2, Megaphone, X, LayoutDashboard, Building, WashingMachine, Calendar, Timer, Pencil, Filter, ArrowUpDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, ComplaintStatus, HostelComplaint, Announcement, LaundryBooking, WashingMachine as MachineType, Gender } from '../types';
import { Button } from '../components/Button';
import { MockDB } from '../services/mockDb';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Helper to get LOCAL date string (YYYY-MM-DD)
const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const HostelDashboard = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const isAdmin = user.role === UserRole.ADMIN;
  const todayDate = getLocalDateString(); 

  // --- REAL DATA STATE ---
  const [complaints, setComplaints] = useState<HostelComplaint[]>([]);
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [laundryBookings, setLaundryBookings] = useState<LaundryBooking[]>([]);
  const [machines, setMachines] = useState<MachineType[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  
  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'laundry' | 'notices'>('overview');
  const [adminSelectedDate, setAdminSelectedDate] = useState<string>(todayDate);
  
  // Filters & Sort States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- FORMS & MODALS ---
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false); 
  const [newComplaint, setNewComplaint] = useState({ type: 'Plumbing', desc: '' });
  const [newNotice, setNewNotice] = useState({ title: '', message: '' });

  // --- LAUNDRY MACHINE MANAGEMENT ---
  const [showMachineModal, setShowMachineModal] = useState(false);
  // 🟢 Updated machine form to include gender
  const [machineForm, setMachineForm] = useState({ id: '', name: '', capacity: '', gender: 'MALE' as Gender });
  const [activeMachineForBooking, setActiveMachineForBooking] = useState<string | null>(null);
  const [bookingTimes, setBookingTimes] = useState({ start: '', end: '' });

  // --- LOAD DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [c, n, m, b, allUsers] = await Promise.all([
        MockDB.getHostelComplaints(),
        MockDB.getHostelNotices(),
        MockDB.getWashingMachines(),
        MockDB.getLaundryBookings(),
        MockDB.getAllUsers()
      ]);
      setComplaints(c);
      setNotices(n);
      setMachines(m);
      setLaundryBookings(b);
      setTotalStudents(allUsers.filter(u => u.role === UserRole.STUDENT).length);
    } catch (e) { console.error("Failed to load dashboard data", e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // --- DERIVED DATA ---
  const statusData = useMemo(() => [
    { name: 'Pending', value: complaints.filter(c => c.status === ComplaintStatus.PENDING).length, color: '#f59e0b' },
    { name: 'In Progress', value: complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'Resolved', value: complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length, color: '#10b981' },
  ].filter(d => d.value > 0), [complaints]);

  const categoryData = useMemo(() => {
    const counts = complaints.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [complaints]);

  const myComplaints = complaints.filter(c => c.userId === user.uid);
  const myPendingIssues = myComplaints.filter(c => c.status !== ComplaintStatus.RESOLVED).length;

  // Apply Filters & Sorting
  const displayedComplaints = (isAdmin ? complaints : myComplaints)
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus)
    .sort((a, b) => {
       if (sortOrder === 'newest') return b.createdAt - a.createdAt;
       return a.createdAt - b.createdAt;
    });

  // 🟢 NEW: Filter Machines by Gender (unless Admin)
  const displayedMachines = isAdmin 
    ? machines 
    : machines.filter(m => m.gender === user.gender);

  // --- HANDLERS ---
  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaint.desc) return;
    const complaint: HostelComplaint = { 
      id: Date.now().toString(), 
      userId: user.uid, 
      userName: user.displayName || 'Student', 
      room: user.roomNumber || 'N/A', // 🟢 Use real room number
      type: newComplaint.type, 
      desc: newComplaint.desc, 
      status: ComplaintStatus.PENDING, 
      createdAt: Date.now(), 
      dateString: new Date().toLocaleDateString() 
    };
    await MockDB.submitHostelComplaint(complaint);
    setNewComplaint({ type: 'Plumbing', desc: '' }); setShowComplaintForm(false); loadData();
  };

  const handleStatusChange = async (id: string, newStatus: ComplaintStatus) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    await MockDB.updateComplaintStatus(id, newStatus);
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.message) return;
    // 🟢 FIXED: Added 'date' property here
    await MockDB.saveAnnouncement({ 
        id: '', 
        title: newNotice.title, 
        message: newNotice.message, 
        type: 'info' as any, 
        isActive: true, 
        expiresOn: '', 
        createdAt: Date.now(), 
        pinned: true,
        date: new Date().toISOString() 
    });
    setNewNotice({ title: '', message: '' }); setShowNoticeForm(false); loadData();
  };

  const handleDeleteNotice = async (id: string) => {
    if (confirm('Delete this notice?')) { await MockDB.deleteHostelNotice(id); loadData(); }
  };

  // --- LAUNDRY HANDLERS ---
  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMachineForBooking || !bookingTimes.start || !bookingTimes.end) return;
    if (bookingTimes.start >= bookingTimes.end) { alert("End time must be after start time."); return; }
    const hasOverlap = laundryBookings.some(b => { if (b.machineId !== activeMachineForBooking) return false; if (b.date !== todayDate) return false; return (bookingTimes.start < b.endTime && bookingTimes.end > b.startTime); });
    if (hasOverlap) { alert("Time slot overlaps with an existing booking today."); return; }
    await MockDB.bookLaundrySlot({ id: '', machineId: activeMachineForBooking, userId: user.uid, userName: user.displayName || 'Student', startTime: bookingTimes.start, endTime: bookingTimes.end, date: todayDate, createdAt: Date.now() });
    setActiveMachineForBooking(null); setBookingTimes({ start: '', end: '' }); loadData();
  };

  const handleCancelBooking = async (id: string) => {
    if (confirm("Cancel this booking?")) { await MockDB.cancelLaundryBooking(id); loadData(); }
  };

  const handleOpenAddMachine = () => { setMachineForm({ id: '', name: '', capacity: '', gender: 'MALE' }); setShowMachineModal(true); };
  const handleOpenEditMachine = (m: MachineType) => { setMachineForm({ id: m.id, name: m.name, capacity: m.capacity, gender: m.gender }); setShowMachineModal(true); };
  
  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault(); if(!machineForm.name) return;
    await MockDB.saveWashingMachine({ id: machineForm.id, name: machineForm.name, capacity: machineForm.capacity || '6kg', gender: machineForm.gender });
    setShowMachineModal(false); loadData();
  };
  const handleDeleteMachine = async (id: string) => { if(confirm("Delete this washing machine?")) { await MockDB.deleteWashingMachine(id); loadData(); } };

  const formatTime = (time: string) => { const [h, m] = time.split(':'); const hour = parseInt(h); const ampm = hour >= 12 ? 'PM' : 'AM'; const hour12 = hour % 12 || 12; return `${hour12}:${m} ${ampm}`; };
  const getStatusColor = (status: string) => { switch(status) { case ComplaintStatus.RESOLVED: return 'bg-emerald-100 text-emerald-700 border-emerald-200'; case ComplaintStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200'; default: return 'bg-amber-100 text-amber-700 border-amber-200'; } };

  const navItems = [
    { id: 'overview', label: isAdmin ? 'Overview' : 'Home', icon: LayoutDashboard },
    { id: 'issues', label: isAdmin ? 'Issues' : 'Help', icon: AlertCircle },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine },
    { id: 'notices', label: 'Notices', icon: Megaphone }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 animate-in fade-in">
      
      {/* 🟢 HEADER */}
      <div className="pt-6 px-6 pb-2">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                   <Building className="text-indigo-600"/> Hostel<span className="text-indigo-600">Connect</span>
                </h1>
                {/* 🟢 Show Real Room Number */}
                <p className="text-slate-500 font-medium text-sm ml-1">
                   {isAdmin ? 'Admin View' : `Room ${user.roomNumber || 'N/A'}`}
                </p>
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
                  
                  {isAdmin && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-6 text-white shadow-lg shadow-orange-500/20">
                           <p className="text-amber-100 font-bold text-xs uppercase tracking-wider">Pending Issues</p>
                           <p className="text-4xl font-black mt-2">{complaints.filter(c => c.status === ComplaintStatus.PENDING).length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                           <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Working On</p>
                           <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                           <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Students</p>
                           <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{totalStudents}</p>
                        </div>
                     </div>
                  )}

                  {!isAdmin && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                           <div className="relative z-10">
                              <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">My Status</p>
                              <div className="flex items-center gap-3 mb-6">
                                 <div className={`p-3 rounded-2xl ${myPendingIssues > 0 ? 'bg-white/20 text-white' : 'bg-emerald-400/20 text-emerald-100'}`}>
                                    {myPendingIssues > 0 ? <AlertCircle size={32}/> : <CheckCircle2 size={32}/>}
                                 </div>
                                 <div>
                                    <h4 className="text-2xl font-black text-white">
                                       {myPendingIssues > 0 ? `${myPendingIssues} Issues` : "All Clear"}
                                    </h4>
                                    <p className="text-indigo-100 text-sm">
                                       {myPendingIssues > 0 ? "Pending resolution" : "No active complaints"}
                                    </p>
                                 </div>
                              </div>
                              <Button 
                                 onClick={() => { setActiveTab('issues'); setShowComplaintForm(true); }}
                                 className="bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-lg w-full justify-between group-hover:scale-[1.02] transition-transform"
                              >
                                 Report New Issue <ChevronRight size={16}/>
                              </Button>
                           </div>
                           <div className="absolute right-[-20px] bottom-[-40px] opacity-10 rotate-12">
                              <History size={200} />
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-sm">
                           <h3 className="font-bold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
                           <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => setActiveTab('laundry')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                 <WashingMachine className="text-blue-500 mb-2" size={24}/>
                                 <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Book Laundry</p>
                              </button>
                              <button onClick={() => setActiveTab('notices')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                 <Megaphone className="text-orange-500 mb-2" size={24}/>
                                 <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Check Notices</p>
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

                  {isAdmin && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                           <h3 className="font-bold text-slate-800 dark:text-white mb-4">Status Distribution</h3>
                           <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                           <h3 className="font-bold text-slate-800 dark:text-white mb-4">Categories</h3>
                           <ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical"><XAxis type="number" hide/><YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}}/><Tooltip/><Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>{categoryData.map((e, i) => <Cell key={i} fill={['#6366f1', '#8b5cf6', '#ec4899'][i%3]}/>)}</Bar></BarChart></ResponsiveContainer>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {/* ======================= */}
            {/* TAB: ISSUES          */}
            {/* ======================= */}
            {activeTab === 'issues' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-black text-slate-900 dark:text-white">Complaints</h2>
                     <Button onClick={() => setShowComplaintForm(true)} size="sm" className="flex items-center gap-2"><Plus size={16}/> Report Issue</Button>
                  </div>
                  
                  {/* Filter Bar */}
                  <div className="flex justify-end gap-3 mb-2">
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                           className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                           value={filterStatus}
                           onChange={(e) => setFilterStatus(e.target.value)}
                        >
                           <option value="ALL">All Status</option>
                           <option value={ComplaintStatus.PENDING}>Pending</option>
                           <option value={ComplaintStatus.IN_PROGRESS}>In Progress</option>
                           <option value={ComplaintStatus.RESOLVED}>Resolved</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <ArrowUpDown size={14} className="text-slate-400" />
                        <select 
                           className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                           value={sortOrder}
                           onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                        >
                           <option value="newest">Newest First</option>
                           <option value="oldest">Oldest First</option>
                        </select>
                     </div>
                  </div>

                  {displayedComplaints.length === 0 ? (
                     <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2"/>
                        <p className="text-slate-500">No issues matching your filters.</p>
                     </div>
                  ) : (
                     displayedComplaints.map(c => (
                        <div key={c.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 hover:border-indigo-300 transition-colors">
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="font-bold text-slate-900 dark:text-white">{c.type}</span>
                                 <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(c.status)}`}>{c.status}</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">{c.desc}</p>
                              <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-medium">
                                 <Clock size={12}/> {c.dateString}
                                 {isAdmin && <span>• {c.userName} ({c.room})</span>}
                              </div>
                           </div>
                           
                           {isAdmin && c.status !== ComplaintStatus.RESOLVED && (
                              <div className="flex flex-row md:flex-col gap-2 min-w-[140px] justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                                 {c.status === ComplaintStatus.PENDING && <button onClick={() => handleStatusChange(c.id, ComplaintStatus.IN_PROGRESS)} className="py-2 px-3 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100">Start Work</button>}
                                 <button onClick={() => handleStatusChange(c.id, ComplaintStatus.RESOLVED)} className="py-2 px-3 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100">Resolve</button>
                              </div>
                           )}
                        </div>
                     ))
                  )}
               </div>
            )}

            {/* ======================= */}
            {/* TAB: LAUNDRY         */}
            {/* ======================= */}
            {activeTab === 'laundry' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* ADMIN CONTROLS */}
                  {isAdmin && (
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50">
                        <div>
                           <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="text-indigo-600"/> Admin View</h3>
                           <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">Date: {adminSelectedDate === todayDate ? 'Today' : adminSelectedDate}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <input type="date" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none text-sm" value={adminSelectedDate} onChange={(e) => setAdminSelectedDate(e.target.value)} />
                           <Button onClick={handleOpenAddMachine} className="flex items-center gap-1.5 whitespace-nowrap"><Plus size={16}/> Add Machine</Button>
                        </div>
                     </div>
                  )}

                  {/* STUDENT HEADER */}
                  {!isAdmin && (
                     <div className="flex items-center justify-between mb-4">
                        <div>
                           <h3 className="font-bold text-2xl text-slate-800 dark:text-white flex items-center gap-2">Laundry Slots</h3>
                           <p className="text-xs text-slate-500">Showing machines for: <strong>{user.gender === Gender.MALE ? 'Boys' : 'Girls'}</strong></p>
                        </div>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">Today</span>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* 🟢 Displaying Filtered Machines */}
                     {displayedMachines.map(machine => {
                        const targetDate = isAdmin ? adminSelectedDate : todayDate;
                        const machineBookings = laundryBookings.filter(b => b.machineId === machine.id && b.date === targetDate).sort((a,b) => a.startTime.localeCompare(b.startTime));
                        
                        return (
                           <div key={machine.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-500"><WashingMachine size={24} /></div>
                                    <div>
                                       <h4 className="font-bold text-slate-900 dark:text-white text-base">{machine.name}</h4>
                                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Capacity: {machine.capacity} • {machine.gender === Gender.MALE ? 'Boys' : 'Girls'}</p>
                                    </div>
                                 </div>
                                 {isAdmin ? (
                                    <div className="flex gap-1">
                                       <button onClick={() => handleOpenEditMachine(machine)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Pencil size={16}/></button>
                                       <button onClick={() => handleDeleteMachine(machine.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                 ) : (
                                    <Button size="sm" onClick={() => setActiveMachineForBooking(machine.id)}>Book Slot</Button>
                                 )}
                              </div>
                              
                              <div className="p-4 bg-white dark:bg-slate-900 max-h-60 overflow-y-auto custom-scrollbar">
                                 {machineBookings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 opacity-50">
                                       <Clock size={24} className="mb-2 text-slate-400"/>
                                       <p className="text-xs text-slate-500 italic">No bookings for this machine yet.</p>
                                    </div>
                                 ) : (
                                    <div className="space-y-2">
                                       {machineBookings.map(b => (
                                          <div key={b.id} className="flex items-center gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                             <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600"><Timer size={10} className="text-indigo-500"/> {formatTime(b.startTime)} - {formatTime(b.endTime)}</div>
                                             <div className="flex-1 text-slate-500 truncate font-medium">{b.userName === user.displayName ? 'You' : b.userName}</div>
                                             {(isAdmin || b.userId === user.uid) && <button onClick={() => handleCancelBooking(b.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>}
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* ======================= */}
            {/* TAB: NOTICES         */}
            {/* ======================= */}
            {activeTab === 'notices' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-black text-slate-900 dark:text-white">Notice Board</h2>
                     {isAdmin && <Button onClick={() => setShowNoticeForm(true)} size="sm" className="flex items-center gap-2"><Plus size={16}/> Post Notice</Button>}
                  </div>

                  {notices.length === 0 ? (
                     <div className="text-center py-24 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                        <p className="text-slate-500 font-medium">No new notices posted yet.</p>
                     </div>
                  ) : (
                     notices.map(n => (
                        <div key={n.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex justify-between items-start group hover:shadow-lg transition-all">
                           <div>
                              <div className="flex items-center gap-2 mb-2">
                                 <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Megaphone size={14}/></div>
                                 <h4 className="font-bold text-slate-900 dark:text-white text-lg">{n.title}</h4>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-9">{n.message}</p>
                           </div>
                           {isAdmin && <button onClick={() => handleDeleteNotice(n.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button>}
                        </div>
                     ))
                  )}
               </div>
            )}
      </main>

      {/* 🟢 FLOATING BOTTOM NAVIGATION */}
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
                  ? 'text-indigo-400 scale-110' 
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
                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- MODALS --- */}
      {showComplaintForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">Report Issue</h3><button onClick={() => setShowComplaintForm(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><form onSubmit={handleRaiseComplaint} className="space-y-5"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Category</label><select className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={newComplaint.type} onChange={e => setNewComplaint({...newComplaint, type: e.target.value})}><option>Plumbing</option><option>Electrical</option><option>Carpentry</option><option>Internet</option><option>Cleaning</option></select></div><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label><textarea className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32" placeholder="Describe the problem..." value={newComplaint.desc} onChange={e => setNewComplaint({...newComplaint, desc: e.target.value})} /></div><Button fullWidth type="submit" className="py-3 rounded-xl">Submit Complaint</Button></form></div></div>
      )}

      {showNoticeForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">Post New Notice</h3><button onClick={() => setShowNoticeForm(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><form onSubmit={handlePostNotice} className="space-y-5"><input className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notice Title" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} /><textarea className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32" placeholder="Message content..." value={newNotice.message} onChange={e => setNewNotice({...newNotice, message: e.target.value})} /><Button fullWidth type="submit" className="py-3 rounded-xl">Publish Notice</Button></form></div></div>
      )}

      {activeMachineForBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">Book Slot</h3><button onClick={() => setActiveMachineForBooking(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><div className="mb-6 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">Booking: <span className="font-bold text-slate-900 dark:text-white block text-base mt-1">{machines.find(m => m.id === activeMachineForBooking)?.name}</span></div><form onSubmit={handleBookLaundry} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">Start Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.start} onChange={e => setBookingTimes({...bookingTimes, start: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">End Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.end} onChange={e => setBookingTimes({...bookingTimes, end: e.target.value})}/></div></div><Button fullWidth type="submit" className="py-3 rounded-xl">Confirm Booking</Button></form></div></div>
      )}

      {showMachineModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">{machineForm.id ? 'Edit Machine' : 'Add Machine'}</h3><button onClick={() => setShowMachineModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><form onSubmit={handleSaveMachine} className="space-y-5"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Machine Name</label><input className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Machine 1 (Ground Floor)" value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} required /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Capacity</label><input className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 6kg" value={machineForm.capacity} onChange={e => setMachineForm({...machineForm, capacity: e.target.value})} required /></div><div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Gender</label><select className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" value={machineForm.gender} onChange={e => setMachineForm({...machineForm, gender: e.target.value as Gender})}><option value={Gender.MALE}>Boys</option><option value={Gender.FEMALE}>Girls</option></select></div></div><Button fullWidth type="submit" className="py-3 rounded-xl">Save Machine</Button></form></div></div>
      )}
    </div>
  );
};