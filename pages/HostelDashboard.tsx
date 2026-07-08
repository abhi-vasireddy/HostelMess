import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, History, CheckCircle2, Clock, AlertCircle, Trash2, Megaphone, X, LayoutDashboard, Building, WashingMachine, Calendar, Timer, Pencil, Filter, ArrowUpDown, ChevronRight, Settings, ChevronUp, ChevronDown, List, Search, SearchX } from 'lucide-react';
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

/**
 * 🟢 ADMIN ONLY COMPONENT: Category & Subcategory Manager
 * Allows Admins to view/manage and REORDER the dynamic lists stored in Firestore
 */
export const AdminCategoryManager = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const loadCategories = async () => {
    // Fetches unique categories from MockDB
    const data = await MockDB.getHostelCategories();
    // Ensure they are sorted by their 'order' property for the UI
    setCategories(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
  };

  useEffect(() => { loadCategories(); }, []);

  const handleAddCategory = async () => {
    if (!newCatName) return;
    // Set order to the end of the current list
    await MockDB.addHostelCategory({ 
      name: newCatName, 
      subcategories: [], 
      order: categories.length 
    });
    setNewCatName('');
    loadCategories();
  };

  const handleAddSubcategory = async () => {
    const cat = categories.find(c => c.id === selectedCatId);
    if (!cat || !newSubName) return;
    const updatedSubs = [...cat.subcategories, newSubName];
    await MockDB.updateHostelCategory(cat.id, { ...cat, subcategories: updatedSubs });
    setNewSubName('');
    loadCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Delete this category?")) {
      await MockDB.deleteHostelCategory(id);
      loadCategories();
    }
  };

  const handleDeleteSubcategory = async (subToDelete: string) => {
    const cat = categories.find(c => c.id === selectedCatId);
    if (!cat) return;
    const updatedSubs = cat.subcategories.filter((s: string) => s !== subToDelete);
    await MockDB.updateHostelCategory(cat.id, { ...cat, subcategories: updatedSubs });
    loadCategories();
  };

  // --- REORDERING LOGIC ---
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items in the local array
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    // Update 'order' property for each affected category and save to DB
    await Promise.all(newItems.map((cat, idx) => 
      MockDB.updateHostelCategory(cat.id, { ...cat, order: idx })
    ));
    
    loadCategories();
  };

  const handleMoveSubcategory = async (index: number, direction: 'up' | 'down') => {
    const cat = categories.find(c => c.id === selectedCatId);
    if (!cat) return;

    const newSubs = [...cat.subcategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSubs.length) return;

    // Swap subcategories in the local array
    [newSubs[index], newSubs[targetIndex]] = [newSubs[targetIndex], newSubs[index]];

    // Save the new array sequence to the category document
    await MockDB.updateHostelCategory(cat.id, { ...cat, subcategories: newSubs });
    loadCategories();
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
         <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
               <Settings size={16} className="text-indigo-600 dark:text-indigo-400"/>
            </div>
            Manage &amp; Reorder Categories
         </h3>
         <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{categories.length} categories</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category List with Reordering */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Primary Categories</label>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
              placeholder="New category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <Button onClick={handleAddCategory} className="rounded-xl px-3"><Plus size={18}/></Button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {categories.length === 0 && (
               <p className="text-center py-6 text-xs text-slate-400 italic">No categories yet</p>
            )}
            {categories.map((cat, idx) => (
              <div key={cat.id} className="group flex justify-between items-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200">
                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cat.name}</span>
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleMoveCategory(idx, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"><ChevronUp size={14}/></button>
                  <button onClick={() => handleMoveCategory(idx, 'down')} disabled={idx === categories.length - 1} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"><ChevronDown size={14}/></button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-0.5 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subcategory List with Reordering */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-indigo-400 rounded-full" />
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subcategories</label>
          </div>
          <select
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-medium text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
          >
            <option value="" className="text-slate-400">Select a category</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>

          {selectedCatId && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                  placeholder="New sub-item..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <Button onClick={handleAddSubcategory} variant="outline" className="rounded-xl px-3"><Plus size={18}/></Button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {categories.find(c => c.id === selectedCatId)?.subcategories.length === 0 && (
                   <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50/50 dark:bg-slate-800/10 rounded-xl">No sub-items yet</div>
                )}
                {categories.find(c => c.id === selectedCatId)?.subcategories.map((sub: string, idx: number, arr: string[]) => (
                  <div key={sub} className="group flex justify-between items-center p-2.5 bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-900/15 dark:to-transparent text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-semibold border border-indigo-100 dark:border-indigo-800/50 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all duration-200">
                    <span className="truncate">{sub}</span>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMoveSubcategory(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"><ChevronUp size={13}/></button>
                      <button onClick={() => handleMoveSubcategory(idx, 'down')} disabled={idx === arr.length - 1} className="p-1 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors"><ChevronDown size={13}/></button>
                      <button onClick={() => handleDeleteSubcategory(sub)} className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-0.5 transition-colors"><X size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!selectedCatId && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-600">
               <List size={32} className="mb-2 opacity-40" />
               <p className="text-xs font-medium">Select a category to manage its sub-items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const [availableCategories, setAvailableCategories] = useState<any[]>([]); // 🟢 Dynamic categories
  
  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'laundry' | 'notices'>('overview');
  const [adminSelectedDate, setAdminSelectedDate] = useState<string>(todayDate);
  
  // Filters & Sort States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('ALL'); // 🟢 Added subcategory filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- FORMS & MODALS ---
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false); 
  const [newComplaint, setNewComplaint] = useState({ category: '', subcategory: '', desc: '' });
  const [newNotice, setNewNotice] = useState({ title: '', message: '' });

  // --- LAUNDRY MACHINE MANAGEMENT ---
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machineForm, setMachineForm] = useState({ id: '', name: '', capacity: '', gender: 'MALE' as Gender });
  const [activeMachineForBooking, setActiveMachineForBooking] = useState<string | null>(null);
  const [bookingTimes, setBookingTimes] = useState({ start: '', end: '' });

  // --- LOAD DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [c, n, m, b, allUsers, cats] = await Promise.all([
        MockDB.getHostelComplaints(),
        MockDB.getHostelNotices(),
        MockDB.getWashingMachines(),
        MockDB.getLaundryBookings(),
        MockDB.getAllUsers(),
        MockDB.getHostelCategories() // 🟢 Fetch categories from DB
      ]);
      setComplaints(c);
      setNotices(n);
      setMachines(m);
      setLaundryBookings(b);
      setTotalStudents(allUsers.filter(u => u.role === UserRole.STUDENT).length);
      setAvailableCategories(cats);
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

  const displayedComplaints = (isAdmin ? complaints : myComplaints)
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus)
    .filter(c => filterCategory === 'ALL' || c.type.startsWith(filterCategory))
    // 🟢 Filter by Subcategory (requires an exact match of "Category: Subcategory")
    .filter(c => filterSubcategory === 'ALL' || c.type === `${filterCategory}: ${filterSubcategory}`)
    .filter(c => 
        searchQuery === '' || 
        c.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.userName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
       if (sortOrder === 'newest') return b.createdAt - a.createdAt;
       return a.createdAt - b.createdAt;
    });

  const displayedMachines = isAdmin 
    ? machines 
    : machines.filter(m => m.gender === user.gender);

  // --- HANDLERS ---
  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaint.desc || !newComplaint.subcategory) return;
    const complaint: HostelComplaint = { 
      id: Date.now().toString(), 
      userId: user.uid, 
      userName: user.displayName || 'Student', 
      room: user.roomNumber || 'N/A',
      type: `${newComplaint.category}: ${newComplaint.subcategory}`, // 🟢 Combined dynamic type
      desc: newComplaint.desc, 
      status: ComplaintStatus.PENDING, 
      createdAt: Date.now(), 
      dateString: new Date().toLocaleDateString() 
    };
    await MockDB.submitHostelComplaint(complaint);
    setNewComplaint({ category: '', subcategory: '', desc: '' }); 
    setShowComplaintForm(false); 
    loadData();
  };

  const handleStatusChange = async (id: string, newStatus: ComplaintStatus) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    await MockDB.updateComplaintStatus(id, newStatus);
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.message) return;
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
   
   // 1. Basic validation: ensure a machine and times are selected
   if (!activeMachineForBooking || !bookingTimes.start || !bookingTimes.end) return;

   // 2. Logic validation: Ensure the end time is after the start time
   if (bookingTimes.start >= bookingTimes.end) { 
      alert("End time must be after start time."); 
      return; 
   }

   // 3. Security Check: Find the machine and verify gender compatibility
   const selectedMachine = machines.find(m => m.id === activeMachineForBooking);
   
   // If the user is not an Admin, they must match the machine's designated gender
   if (!isAdmin && selectedMachine && selectedMachine.gender !== user.gender) {
      alert(`This machine is designated for ${selectedMachine.gender === 'MALE' ? 'Boys' : 'Girls'}. You cannot book it.`);
      return;
   }

   // 4. Availability Check: Ensure the slot doesn't overlap with existing bookings for this machine today
   const hasOverlap = laundryBookings.some(b => { 
      if (b.machineId !== activeMachineForBooking) return false; 
      if (b.date !== todayDate) return false; 
      return (bookingTimes.start < b.endTime && bookingTimes.end > b.startTime); 
   });

   if (hasOverlap) { 
      alert("Time slot overlaps with an existing booking today."); 
      return; 
   }

   // 5. Finalize Booking: Save to database and reset UI
   await MockDB.bookLaundrySlot({ 
      id: '', 
      machineId: activeMachineForBooking, 
      userId: user.uid, 
      userName: user.displayName || 'Student', 
      startTime: bookingTimes.start, 
      endTime: bookingTimes.end, 
      date: todayDate, 
      createdAt: Date.now() 
   });

   setActiveMachineForBooking(null); 
   setBookingTimes({ start: '', end: '' }); 
   loadData();
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
      
      <div className="pt-6 px-6 pb-2">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                   <Building className="text-indigo-600"/> Hostel<span className="text-indigo-600">Connect</span>
                </h1>
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
            
            {activeTab === 'overview' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                  {isAdmin && (
                     <>
                     <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5 dark:from-indigo-500/5 dark:via-slate-900 dark:to-purple-500/5 rounded-[2.5rem] p-6 md:p-8 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm">
                        <div className="absolute top-[-80px] right-[-80px] w-52 h-52 bg-indigo-500/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-40px] left-[-40px] w-40 h-40 bg-purple-500/5 rounded-full blur-2xl" />
                        <div className="relative z-10 space-y-5">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-amber-500/20 group hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                           <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                           <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="p-1.5 bg-white/20 rounded-lg">
                                    <AlertCircle size={16} className="text-white" />
                                 </div>
                                 <p className="text-amber-100 font-bold text-xs uppercase tracking-wider">Pending Issues</p>
                              </div>
                              <p className="text-5xl font-black mt-1 tracking-tight">{complaints.filter(c => c.status === ComplaintStatus.PENDING).length}</p>
                              <p className="text-amber-200/70 text-xs mt-2 font-medium">Awaiting action</p>
                           </div>
                           <div className="absolute bottom-3 right-4 opacity-10">
                              <AlertCircle size={48} />
                           </div>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                           <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                           <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Clock size={16} className="text-white" />
                                 </div>
                                 <p className="text-blue-100 font-bold text-xs uppercase tracking-wider">In Progress</p>
                              </div>
                              <p className="text-5xl font-black mt-1 tracking-tight">{complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length}</p>
                              <p className="text-blue-200/70 text-xs mt-2 font-medium">Being resolved</p>
                           </div>
                           <div className="absolute bottom-3 right-4 opacity-10">
                              <Clock size={48} />
                           </div>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                           <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                           <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Building size={16} className="text-white" />
                                 </div>
                                 <p className="text-emerald-100 font-bold text-xs uppercase tracking-wider">Total Students</p>
                              </div>
                              <p className="text-5xl font-black mt-1 tracking-tight">{totalStudents}</p>
                              <p className="text-emerald-200/70 text-xs mt-2 font-medium">Registered in system</p>
                           </div>
                           <div className="absolute bottom-3 right-4 opacity-10">
                              <Building size={48} />
                           </div>
                        </div>
                     </div>
                     </div>
                     </div>
                     </>
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
                     <>
                        <div>
                           <div className="flex items-center gap-2 mb-4">
                              <LayoutDashboard size={18} className="text-indigo-500" />
                              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Analytics</h2>
                           </div>
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                                 <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white">Status Distribution</h3>
                                    <div className="flex gap-1.5">
                                       {statusData.map(s => (
                                          <span key={s.name} className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                             <span className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}} />
                                             {s.name}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="h-72 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                       <PieChart>
                                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" animationBegin={0} animationDuration={800}>
                                             {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                             ))}
                                          </Pie>
                                          <Tooltip
                                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                             formatter={(value: number, name: string) => [value, `${name} issues`]}
                                          />
                                       </PieChart>
                                    </ResponsiveContainer>
                                 </div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                                 <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-white">Category Breakdown</h3>
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{categoryData.length} categories</span>
                                 </div>
                                 <div className="h-72 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                       <BarChart data={categoryData} layout="vertical" margin={{top: 8, right: 16, bottom: 8, left: 8}}>
                                          <XAxis type="number" hide />
                                          <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                          <Tooltip
                                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                             formatter={(value: number) => [`${value}`, 'Issues']}
                                          />
                                          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22} animationDuration={600}>
                                             {categoryData.map((e, i) => <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'][i % 8]} />)}
                                          </Bar>
                                       </BarChart>
                                    </ResponsiveContainer>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* 🟢 Admin Specific Category Manager in Overview */}
                        <div className="pt-2">
                           <div className="flex items-center gap-3 mb-4">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                              <Settings size={14} className="text-slate-300 dark:text-slate-600" />
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                           </div>
                           <AdminCategoryManager />
                        </div>
                     </>
                  )}
               </div>
            )}

            {activeTab === 'issues' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-black text-slate-900 dark:text-white">Complaints</h2>
                     <Button onClick={() => setShowComplaintForm(true)} size="sm" className="flex items-center gap-2"><Plus size={16}/> Report Issue</Button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
                     
                     {/* 🟢 Search Bar */}
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto flex-1">
                        <Search size={16} className="text-slate-400" />
                        <input 
                           type="text"
                           placeholder="Search issues, names, or categories..."
                           className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>

                     {/* Filters Group */}
                     <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        
                        {/* 🟢 Category Filter */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                           <Filter size={14} className="text-slate-400" />
                           <select 
                              className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer max-w-[120px] truncate"
                              value={filterCategory}
                              onChange={(e) => { 
                                 setFilterCategory(e.target.value); 
                                 setFilterSubcategory('ALL'); // Reset subcategory when category changes
                              }}
                           >
                              <option value="ALL">All Categories</option>
                              {availableCategories.map(cat => (
                                 <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                           </select>
                        </div>

                        {/* 🟢 Subcategory Filter (Only appears if a specific category is chosen) */}
                        {filterCategory !== 'ALL' && (
                           <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95">
                              <List size={14} className="text-slate-400" />
                              <select 
                                 className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer max-w-[120px] truncate"
                                 value={filterSubcategory}
                                 onChange={(e) => setFilterSubcategory(e.target.value)}
                              >
                                 <option value="ALL">All Sub-Items</option>
                                 {availableCategories.find(c => c.name === filterCategory)?.subcategories.map((sub: string) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                 ))}
                              </select>
                           </div>
                        )}

                        {/* Existing Status Filter */}
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
                        
                        {/* Existing Sort Order */}
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
                  </div>

                  {displayedComplaints.length === 0 ? (
                     <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
                        <SearchX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"/>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Results Found</h3>
                        <p className="text-slate-500 text-sm">We couldn't find any complaints matching your current search or filters.</p>
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

            {activeTab === 'laundry' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      {/* 🟢 DYNAMIC COMPLAINT FORM MODAL */}
      {showComplaintForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Report Issue</h3>
                <button onClick={() => setShowComplaintForm(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
             </div>
             
             <form onSubmit={handleRaiseComplaint} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Category</label>
                  <select 
                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={newComplaint.category} 
                    onChange={e => setNewComplaint({...newComplaint, category: e.target.value, subcategory: ''})}
                    required
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {newComplaint.category && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sub-Category</label>
                    <select 
                      className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                      value={newComplaint.subcategory} 
                      onChange={e => setNewComplaint({...newComplaint, subcategory: e.target.value})}
                      required
                    >
                      <option value="">Select Sub-Category</option>
                      {availableCategories.find(c => c.name === newComplaint.category)?.subcategories.map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                  <textarea 
                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32" 
                    placeholder="Provide specific details..." 
                    value={newComplaint.desc} 
                    onChange={e => setNewComplaint({...newComplaint, desc: e.target.value})} 
                    required
                  />
                </div>
                
                <Button fullWidth type="submit" className="py-3 rounded-xl">Submit Complaint</Button>
             </form>
           </div>
         </div>
      )}

      {showNoticeForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">Post New Notice</h3><button onClick={() => setShowNoticeForm(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><form onSubmit={handlePostNotice} className="space-y-5"><input className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notice Title" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} /><textarea className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32" placeholder="Message content..." value={newNotice.message} onChange={e => setNewNotice({...newNotice, message: e.target.value})} /><Button fullWidth type="submit" className="py-3 rounded-xl">Publish Notice</Button></form></div></div>
      )}

      {activeMachineForBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-slate-900 dark:text-white">Book Slot</h3><button onClick={() => setActiveMachineForBooking(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><div className="mb-6 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">Booking: <span className="font-bold text-slate-900 dark:text-white block text-base mt-1">{machines.find(m => m.id === activeMachineForBooking)?.name}</span></div><form onSubmit={handleBookLaundry} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">Start Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.start} onChange={e => setBookingTimes({...bookingTimes, start: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">End Time</label><input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={bookingTimes.end} onChange={e => setBookingTimes({...bookingTimes, end: e.target.value})}/></div></div><Button fullWidth type="submit" className="py-3 rounded-xl">Confirm Booking</Button></form></div></div>
      )}

      {showMachineModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-xl text-slate-900 dark:text-white">
                  {machineForm.id ? 'Edit Machine' : 'Add Machine'}
               </h3>
               <button onClick={() => setShowMachineModal(false)}>
                  <X size={20} className="text-slate-400 hover:text-slate-600"/>
               </button>
               </div>

               <form onSubmit={handleSaveMachine} className="space-y-5">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Machine Name</label>
                  <input 
                     className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                     placeholder="e.g. Machine 1 (Ground Floor)" 
                     value={machineForm.name} 
                     onChange={e => setMachineForm({...machineForm, name: e.target.value})} 
                     required 
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Capacity</label>
                     <input 
                     className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                     placeholder="e.g. 6kg" 
                     value={machineForm.capacity} 
                     onChange={e => setMachineForm({...machineForm, capacity: e.target.value})} 
                     required 
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Gender</label>
                     <select 
                     className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                     // Ensure value is never undefined by providing a fallback
                     value={machineForm.gender || 'MALE'} 
                     onChange={e => setMachineForm({...machineForm, gender: e.target.value as Gender})}
                     required
                     >
                     {/* These values MUST match your Gender enum exactly */}
                     <option value="MALE">Boys</option>
                     <option value="FEMALE">Girls</option>
                     </select>
                  </div>
               </div>

               <Button fullWidth type="submit" className="py-3 rounded-xl">
                  Save Machine
               </Button>
               </form>
            </div>
         </div>
         )}
    </div>
  );
};