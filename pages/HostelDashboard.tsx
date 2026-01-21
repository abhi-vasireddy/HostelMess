import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, History, CheckCircle2, Clock, AlertCircle, Trash2, Megaphone, X, LayoutDashboard, Building, Users, WashingMachine, Calendar, Timer, Pencil, Settings, Menu as MenuIcon, Home, Filter, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, ComplaintStatus, HostelComplaint, Announcement, LaundryBooking, WashingMachine as MachineType } from '../types';
import { Button } from '../components/Button';
import { MockDB } from '../services/mockDb';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminSelectedDate, setAdminSelectedDate] = useState<string>(todayDate);
  
  // 🟢 Filter & Sort States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- FORMS & MODALS ---
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false); 
  const [newComplaint, setNewComplaint] = useState({ type: 'Plumbing', desc: '' });
  const [newNotice, setNewNotice] = useState({ title: '', message: '' });

  // --- LAUNDRY MACHINE MANAGEMENT ---
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machineForm, setMachineForm] = useState({ id: '', name: '', capacity: '' });
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

  // 🟢 Apply Filters & Sorting
  const displayedComplaints = (isAdmin ? complaints : myComplaints)
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus)
    .sort((a, b) => {
       if (sortOrder === 'newest') return b.createdAt - a.createdAt;
       return a.createdAt - b.createdAt;
    });

  // --- HANDLERS ---
  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaint.desc) return;
    const complaint: HostelComplaint = { id: Date.now().toString(), userId: user.uid, userName: user.displayName || 'Student', room: '304-B', type: newComplaint.type, desc: newComplaint.desc, status: ComplaintStatus.PENDING, createdAt: Date.now(), dateString: new Date().toLocaleDateString() };
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
    await MockDB.saveAnnouncement({ id: '', title: newNotice.title, message: newNotice.message, type: 'info' as any, isActive: true, expiresOn: '', createdAt: Date.now(), pinned: true });
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

  const handleOpenAddMachine = () => { setMachineForm({ id: '', name: '', capacity: '' }); setShowMachineModal(true); };
  const handleOpenEditMachine = (m: MachineType) => { setMachineForm({ id: m.id, name: m.name, capacity: m.capacity }); setShowMachineModal(true); };
  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault(); if(!machineForm.name) return;
    await MockDB.saveWashingMachine({ id: machineForm.id, name: machineForm.name, capacity: machineForm.capacity || '6kg' });
    setShowMachineModal(false); loadData();
  };
  const handleDeleteMachine = async (id: string) => { if(confirm("Delete this washing machine?")) { await MockDB.deleteWashingMachine(id); loadData(); } };

  const formatTime = (time: string) => { const [h, m] = time.split(':'); const hour = parseInt(h); const ampm = hour >= 12 ? 'PM' : 'AM'; const hour12 = hour % 12 || 12; return `${hour12}:${m} ${ampm}`; };
  const getStatusColor = (status: string) => { switch(status) { case ComplaintStatus.RESOLVED: return 'bg-emerald-100 text-emerald-700 border-emerald-200'; case ComplaintStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200'; default: return 'bg-amber-100 text-amber-700 border-amber-200'; } };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* 🟢 SIDEBAR */}
      <aside className={`fixed md:sticky top-0 z-30 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
         <div className="p-5 flex items-center justify-between">
            <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
               <Building className="text-indigo-600"/> Hostel<span className="text-indigo-600">Connect</span>
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X size={20}/></button>
         </div>

         <div className="px-3 py-2 space-y-1">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 mb-4 transition-colors font-medium">
               <ArrowLeft size={18}/> Back to Hub
            </button>

            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
            
            <button onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
               <LayoutDashboard size={18}/> {isAdmin ? 'Overview' : 'Dashboard'}
            </button>
            <button onClick={() => { setActiveTab('issues'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl font-medium transition-all ${activeTab === 'issues' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
               <AlertCircle size={18}/> {isAdmin ? 'All Complaints' : 'My Issues'}
            </button>
            <button onClick={() => { setActiveTab('laundry'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl font-medium transition-all ${activeTab === 'laundry' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
               <WashingMachine size={18}/> {isAdmin ? 'Laundry Status' : 'Book Laundry'}
            </button>
            <button onClick={() => { setActiveTab('notices'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl font-medium transition-all ${activeTab === 'notices' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
               <Megaphone size={18}/> Notices
            </button>
         </div>
      </aside>

      {/* 🟢 MAIN CONTENT */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
         
         {/* Top Header */}
         <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg"><MenuIcon size={20}/></button>
               <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            </div>
            
            <div className="flex gap-2">
               {isAdmin && activeTab === 'notices' && (
                  <Button onClick={() => setShowNoticeForm(true)} size="sm" className="flex items-center gap-2"><Plus size={16}/> Post Notice</Button>
               )}
               {!isAdmin && (activeTab === 'overview' || activeTab === 'issues') && (
                  <Button onClick={() => setShowComplaintForm(true)} size="sm" className="flex items-center gap-2"><Plus size={16}/> Raise Issue</Button>
               )}
            </div>
         </header>

         <div className="p-4 md:p-8 max-w-7xl mx-auto">
            
            {/* ======================= */}
            {/* TAB: OVERVIEW        */}
            {/* ======================= */}
            {activeTab === 'overview' && (
               <div className="space-y-6 animate-in fade-in">
                  
                  {isAdmin && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
                           <p className="text-amber-100 font-bold text-xs uppercase tracking-wider">Pending Issues</p>
                           <p className="text-4xl font-black mt-2">{complaints.filter(c => c.status === ComplaintStatus.PENDING).length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                           <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Working On</p>
                           <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                           <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Students</p>
                           <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{totalStudents}</p>
                        </div>
                     </div>
                  )}

                  {!isAdmin && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                           <div className="relative z-10">
                              <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">My Room</p>
                              <h3 className="text-4xl font-black">304-B</h3>
                              <p className="text-sm opacity-90 mt-2">Block A • 3rd Floor</p>
                           </div>
                           <div className="absolute right-[-20px] bottom-[-40px] opacity-10">
                              <History size={180} />
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col justify-center shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className={`p-4 rounded-2xl ${myPendingIssues > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                 {myPendingIssues > 0 ? <AlertCircle size={32}/> : <CheckCircle2 size={32}/>}
                              </div>
                              <div>
                                 <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {myPendingIssues > 0 ? `${myPendingIssues} Active Issues` : "All Good!"}
                                 </h4>
                                 <p className="text-slate-500 text-sm">
                                    {myPendingIssues > 0 ? "Maintenance is on it." : "No pending complaints."}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {isAdmin && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
                           <h3 className="font-bold text-slate-800 dark:text-white mb-4">Status Distribution</h3>
                           <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-80">
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
               <div className="space-y-4 animate-in fade-in">
                  
                  {/* 🟢 MINIMALIST FILTER BAR */}
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
                     <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
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
               <div className="space-y-6 animate-in fade-in">
                  
                  {/* ADMIN CONTROLS */}
                  {isAdmin && (
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
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
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="text-indigo-600"/> Available Slots</h3>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Today</span>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {machines.map(machine => {
                        const targetDate = isAdmin ? adminSelectedDate : todayDate;
                        const machineBookings = laundryBookings.filter(b => b.machineId === machine.id && b.date === targetDate).sort((a,b) => a.startTime.localeCompare(b.startTime));
                        
                        return (
                           <div key={machine.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm"><WashingMachine className="text-indigo-500" size={20} /></div>
                                    <div><h4 className="font-bold text-slate-900 dark:text-white text-sm">{machine.name}</h4><p className="text-xs text-slate-500 dark:text-slate-400">Capacity: {machine.capacity}</p></div>
                                 </div>
                                 {isAdmin ? (
                                    <div className="flex gap-1">
                                       <button onClick={() => handleOpenEditMachine(machine)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14}/></button>
                                       <button onClick={() => handleDeleteMachine(machine.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                                    </div>
                                 ) : (
                                    <Button size="sm" onClick={() => setActiveMachineForBooking(machine.id)}>Book Slot</Button>
                                 )}
                              </div>
                              
                              <div className="p-4 bg-white dark:bg-slate-900 max-h-60 overflow-y-auto custom-scrollbar">
                                 {machineBookings.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-2">No bookings.</p> : (
                                    <div className="space-y-2">
                                       {machineBookings.map(b => (
                                          <div key={b.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                             <div className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300"><Timer size={10} className="text-indigo-500"/> {formatTime(b.startTime)} - {formatTime(b.endTime)}</div>
                                             <div className="flex-1 text-slate-500 truncate">{b.userName === user.displayName ? 'You' : b.userName}</div>
                                             {(isAdmin || b.userId === user.uid) && <button onClick={() => handleCancelBooking(b.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>}
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
               <div className="space-y-4 animate-in fade-in">
                  {notices.length === 0 ? (
                     <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-2"/>
                        <p className="text-slate-500">No new notices posted yet.</p>
                     </div>
                  ) : (
                     notices.map(n => (
                        <div key={n.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-start group">
                           <div>
                              <div className="flex items-center gap-2 mb-1">{n.pinned && <AlertCircle size={16} className="text-indigo-500 fill-indigo-50"/>}<h4 className="font-bold text-slate-900 dark:text-white">{n.title}</h4></div>
                              <p className="text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                           </div>
                           {isAdmin && <button onClick={() => handleDeleteNotice(n.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>}
                        </div>
                     ))
                  )}
               </div>
            )}

         </div>
      </main>

      {/* --- MODALS --- */}
      {showComplaintForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-900 dark:text-white">Report Issue</h3><button onClick={() => setShowComplaintForm(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleRaiseComplaint} className="space-y-4"><div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><select className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={newComplaint.type} onChange={e => setNewComplaint({...newComplaint, type: e.target.value})}><option>Plumbing</option><option>Electrical</option><option>Carpentry</option><option>Internet</option><option>Cleaning</option></select></div><div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24" placeholder="Describe the problem..." value={newComplaint.desc} onChange={e => setNewComplaint({...newComplaint, desc: e.target.value})} /></div><Button fullWidth type="submit">Submit Complaint</Button></form></div></div>
      )}

      {showNoticeForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-900 dark:text-white">Post New Notice</h3><button onClick={() => setShowNoticeForm(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handlePostNotice} className="space-y-4"><input className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notice Title" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} /><textarea className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24" placeholder="Message content..." value={newNotice.message} onChange={e => setNewNotice({...newNotice, message: e.target.value})} /><Button fullWidth type="submit">Publish</Button></form></div></div>
      )}

      {activeMachineForBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-900 dark:text-white">Book Slot</h3><button onClick={() => setActiveMachineForBooking(null)}><X size={20} className="text-slate-400"/></button></div><div className="mb-4 text-sm text-slate-600 dark:text-slate-400">Booking: <span className="font-bold text-slate-900 dark:text-white">{machines.find(m => m.id === activeMachineForBooking)?.name}</span></div><form onSubmit={handleBookLaundry} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Start Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.start} onChange={e => setBookingTimes({...bookingTimes, start: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">End Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.end} onChange={e => setBookingTimes({...bookingTimes, end: e.target.value})}/></div></div><Button fullWidth type="submit">Confirm Booking</Button></form></div></div>
      )}

      {showMachineModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-900 dark:text-white">{machineForm.id ? 'Edit Machine' : 'Add Machine'}</h3><button onClick={() => setShowMachineModal(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleSaveMachine} className="space-y-4"><div><label className="text-xs font-bold text-slate-500 uppercase">Machine Name</label><input className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Machine 1 (Ground Floor)" value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} required /></div><div><label className="text-xs font-bold text-slate-500 uppercase">Capacity</label><input className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 6kg" value={machineForm.capacity} onChange={e => setMachineForm({...machineForm, capacity: e.target.value})} required /></div><Button fullWidth type="submit">Save Machine</Button></form></div></div>
      )}
    </div>
  );
};