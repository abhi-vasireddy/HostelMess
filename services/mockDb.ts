import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  writeBatch, 
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  setDoc,
  limit
} from 'firebase/firestore'; 
import { 
  User, 
  UserRole, 
  DailyMenu, 
  Feedback,
  Announcement,
  AppSettings,
  CanteenItem,
  Suggestion,
  TodoTask,
  AdminNote,
  HostelComplaint,
  LaundryBooking,
  WashingMachine,
  ComplaintStatus,
  ServiceModule,
  SportsEquipment,
  SportsBooking,
  TeamRequest
} from '../types';

export const MockDB = {
  
  // --- 1. AUTHENTICATION ---
  login: async (email: string, password?: string): Promise<User> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
       const allUsers = await getDocs(usersRef);
       if (allUsers.empty) {
         await MockDB.importUsers([
            { email: 'admin@hostel.com', displayName: 'Warden Smith', role: 'ADMIN', password: 'password' },
            { email: 'student@hostel.com', displayName: 'John Doe', role: 'STUDENT', password: 'password' }
         ]);
         return MockDB.login(email, password);
       }
       throw new Error("User not found.");
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.password !== password) throw new Error("Incorrect password");
    if (userData.deactivatedUntil && new Date() < new Date(userData.deactivatedUntil)) {
      throw new Error(`Account Deactivated until ${new Date(userData.deactivatedUntil).toLocaleDateString()}`);
    }

    const userSession = { ...userData, uid: userDoc.id } as User;
    localStorage.setItem('hft_current_user', JSON.stringify(userSession));
    return userSession;
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('hft_current_user');
    return stored ? JSON.parse(stored) : null;
  },

  logout: async () => { localStorage.removeItem('hft_current_user'); },

  // --- 2. MENU ---
  getWeeklyMenu: async (): Promise<DailyMenu[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'dailyMenus'));
      const menu = snapshot.docs.map(d => d.data() as DailyMenu);
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return menu.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day));
    } catch (e) { return []; }
  },

  updateMenu: async (updatedMenu: DailyMenu[]): Promise<void> => {
    const batch = writeBatch(db);
    updatedMenu.forEach(dayMenu => {
      batch.set(doc(db, 'dailyMenus', dayMenu.day), dayMenu);
    });
    await batch.commit();
  },

  bulkUploadMenu: async (fullMenu: DailyMenu[]): Promise<void> => {
    const batch = writeBatch(db);
    fullMenu.forEach(dayMenu => {
      batch.set(doc(db, 'dailyMenus', dayMenu.day), dayMenu);
    });
    await batch.commit();
  },

  // --- 3. FEEDBACK ---
  getAllFeedback: async (): Promise<Feedback[]> => {
    try {
      const q = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as Feedback);
    } catch (e) { return []; }
  },

  submitFeedback: async (feedback: Feedback): Promise<void> => {
    await addDoc(collection(db, 'feedbacks'), { ...feedback, timestamp: Date.now() });
  },

  deleteFeedback: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'feedbacks', id));
  },

  // --- 4. ANNOUNCEMENTS ---
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const q = query(collection(db, 'announcements'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as Announcement);
      const now = Date.now();
      return list.filter(a => !a.expiresOn || new Date(a.expiresOn).getTime() > now);
    } catch (e) { return []; }
  },
  
  getAllAnnouncementsAdmin: async (): Promise<Announcement[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'announcements'));
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as Announcement);
    } catch (e) { return []; }
  },

  saveAnnouncement: async (announcement: Announcement): Promise<void> => {
    const { id, ...data } = announcement;
    if (id && id.length > 20) {
       await updateDoc(doc(db, 'announcements', id), data);
    } else {
       await addDoc(collection(db, 'announcements'), data);
    }
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'announcements', id));
  },

  // --- 5. SETTINGS & CANTEEN ---
  getSettings: async (): Promise<AppSettings> => {
    try {
       const snapshot = await getDocs(collection(db, 'settings'));
       if (!snapshot.empty) return snapshot.docs[0].data() as AppSettings;
    } catch(e) {}
    return { canteenEnabled: false, splashVideoEnabled: false };
  },

  updateSettings: async (settings: AppSettings): Promise<void> => {
    const snapshot = await getDocs(collection(db, 'settings'));
    if (snapshot.empty) {
      await addDoc(collection(db, 'settings'), settings);
    } else {
      await updateDoc(doc(db, 'settings', snapshot.docs[0].id), { ...settings });
    }
  },

  getCanteenMenu: async (): Promise<CanteenItem[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'canteen'));
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as CanteenItem);
    } catch (e) { return []; }
  },

  saveCanteenItem: async (item: CanteenItem): Promise<void> => {
     const { id, ...data } = item;
     if (id && id.length > 15 && !id.startsWith('c')) {
        await updateDoc(doc(db, 'canteen', id), data);
     } else {
        await addDoc(collection(db, 'canteen'), data);
     }
  },

  updateCanteenItem: async (updatedItem: CanteenItem): Promise<void> => {
    const { id, ...data } = updatedItem;
    await updateDoc(doc(db, 'canteen', id), data);
  },

  deleteCanteenItem: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'canteen', id));
  },

  // --- 6. SUGGESTIONS ---
  submitSuggestion: async (sug: Suggestion) => {
     const { id, ...data } = sug; 
     await addDoc(collection(db, 'suggestions'), data);
  },
  
  getSuggestions: async (): Promise<Suggestion[]> => {
    try {
      const q = query(collection(db, 'suggestions'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as Suggestion);
    } catch (e) { return []; }
  },

  deleteSuggestion: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'suggestions', id));
  },

  // --- 7. USER MANAGEMENT ---
  getAllUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), uid: doc.id }) as User);
    } catch (e) { return []; }
  },

  cleanupDuplicateUsers: async (): Promise<void> => {
    const snapshot = await getDocs(collection(db, 'users'));
    const seenEmails = new Map<string, string>();
    const batch = writeBatch(db);
    let deleteCount = 0;

    snapshot.docs.forEach(docSnap => {
      const email = docSnap.data().email;
      if (seenEmails.has(email)) {
        batch.delete(docSnap.ref);
        deleteCount++;
      } else {
        seenEmails.set(email, docSnap.id);
      }
    });

    if (deleteCount > 0) await batch.commit();
  },

  importUsers: async (newUsers: any[]): Promise<void> => {
    const batch = writeBatch(db);
    const usersRef = collection(db, 'users');
    const existingSnap = await getDocs(usersRef);
    const existingEmails = new Set(existingSnap.docs.map(d => d.data().email));

    newUsers.forEach(u => {
      if (!existingEmails.has(u.email)) {
        const newDocRef = doc(usersRef);
        batch.set(newDocRef, {
          email: u.email,
          displayName: u.displayName,
          role: u.role || 'STUDENT',
          password: u.password || 'password123', 
          createdAt: Date.now()
        });
      }
    });
    await batch.commit();
  },

  updateUserStatus: async (uid: string, deactivatedUntil: string | null): Promise<void> => {
    await updateDoc(doc(db, 'users', uid), { deactivatedUntil });
  },

  updateUserRole: async (uid: string, newRole: UserRole): Promise<void> => {
    await updateDoc(doc(db, 'users', uid), { role: newRole });
  },

  // --- 8. TASKS & NOTES ---
  getTodos: async (): Promise<TodoTask[]> => {
    try {
      const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as TodoTask);
    } catch (e) { return []; }
  },

  saveTodo: async (t: TodoTask) => {
    const { id, ...data } = t;
    await setDoc(doc(db, 'todos', id), data, { merge: true });
  },

  updateAllTodos: async (t: TodoTask[]) => { },

  deleteTodo: async (id: string) => { await deleteDoc(doc(db, 'todos', id)); },

  getNotes: async (): Promise<AdminNote[]> => {
    try {
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as AdminNote);
    } catch (e) { return []; }
  },

  saveNote: async (n: AdminNote) => {
    const { id, ...data } = n;
    await setDoc(doc(db, 'notes', id), data, { merge: true });
  },

  deleteNote: async (id: string) => { await deleteDoc(doc(db, 'notes', id)); },

  // --- 9. HOSTEL MODULE ---

  getHostelComplaints: async (): Promise<HostelComplaint[]> => {
    try {
      const q = query(collection(db, 'hostel_complaints'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as HostelComplaint);
    } catch (e) { return []; }
  },

  submitHostelComplaint: async (complaint: HostelComplaint): Promise<void> => {
    const { id, ...data } = complaint;
    await addDoc(collection(db, 'hostel_complaints'), data);
  },

  updateComplaintStatus: async (id: string, status: ComplaintStatus): Promise<void> => {
    await updateDoc(doc(db, 'hostel_complaints', id), { status });
  },

  getHostelNotices: async (): Promise<Announcement[]> => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as Announcement);
    } catch (e) { return []; }
  },

  deleteHostelNotice: async (id: string) => {
    await deleteDoc(doc(db, 'announcements', id));
  },

  // --- 10. LAUNDRY ---

  getWashingMachines: async (): Promise<WashingMachine[]> => {
    try {
      const colRef = collection(db, 'washing_machines');
      const q = query(colRef, orderBy('name', 'asc')); 
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
    } catch (e) { return []; }
  },

  saveWashingMachine: async (machine: WashingMachine): Promise<void> => {
    const { id, ...data } = machine;
    if (id) {
       await updateDoc(doc(db, 'washing_machines', id), data);
    } else {
       await addDoc(collection(db, 'washing_machines'), data);
    }
  },

  deleteWashingMachine: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'washing_machines', id));
  },

  getLaundryBookings: async (date?: string): Promise<LaundryBooking[]> => {
    try {
      let q;
      if (date) {
        q = query(collection(db, 'laundry_bookings'), where('date', '==', date));
      } else {
        q = query(collection(db, 'laundry_bookings'), orderBy('date', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as LaundryBooking);
    } catch (e) { 
      return []; 
    }
  },

  bookLaundrySlot: async (booking: LaundryBooking): Promise<void> => {
    const { id, ...data } = booking;
    await addDoc(collection(db, 'laundry_bookings'), data);
  },

  cancelLaundryBooking: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'laundry_bookings', id));
  },

  // --- 11. DYNAMIC SERVICES (FIXED: NO AUTO-RESTORE) ---
  
  getServices: async (): Promise<ServiceModule[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'services'));
      // 🟢 Logic Removed: No longer checking if empty to auto-create.
      // This means if you delete everything, it STAYS deleted.
      const services = snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }) as ServiceModule);
      return services.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) { 
        return []; 
    }
  },

  saveService: async (service: ServiceModule): Promise<void> => {
    const { id, ...data } = service;
    if (data.order === undefined) {
       data.order = Date.now();
    }
    await setDoc(doc(db, 'services', id), data, { merge: true });
  },

  updateServiceOrder: async (services: ServiceModule[]): Promise<void> => {
    const batch = writeBatch(db);
    services.forEach((srv, index) => {
       const ref = doc(db, 'services', srv.id);
       batch.update(ref, { order: index });
    });
    await batch.commit();
  },

  deleteService: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'services', id));
  },

  // --- 12. SPORTS MODULE ---
  
  getSportsEquipment: async (): Promise<SportsEquipment[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'sports_equipment'));
      // 🟢 Logic Removed: No auto-creating default sports gear.
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id }));
    } catch(e) { return []; }
  },

  saveSportsEquipment: async (item: SportsEquipment): Promise<void> => {
     const { id, ...data } = item;
     if (id) {
        await setDoc(doc(db, 'sports_equipment', id), data, { merge: true });
     } else {
        await addDoc(collection(db, 'sports_equipment'), data);
     }
  },

  deleteSportsEquipment: async (id: string): Promise<void> => {
     await deleteDoc(doc(db, 'sports_equipment', id));
  },

  getBookings: async (date: string): Promise<SportsBooking[]> => {
     const q = query(collection(db, 'sports_bookings'), where('date', '==', date));
     const snap = await getDocs(q);
     return snap.docs.map(d => ({...d.data(), id: d.id} as SportsBooking));
  },

  bookSportItem: async (booking: SportsBooking): Promise<void> => {
     await addDoc(collection(db, 'sports_bookings'), booking);
  },

  getTeamRequests: async (): Promise<TeamRequest[]> => {
     const q = query(collection(db, 'team_requests'), orderBy('date', 'asc'));
     const snap = await getDocs(q);
     return snap.docs.map(d => ({...d.data(), id: d.id} as TeamRequest));
  },

  createTeamRequest: async (req: TeamRequest): Promise<void> => {
     await addDoc(collection(db, 'team_requests'), req);
  },

  joinTeam: async (requestId: string, playerName: string): Promise<void> => {
     // Placeholder
  },
  
  addPlayerToTeam: async (requestId: string, newPlayerList: string[]): Promise<void> => {
     await updateDoc(doc(db, 'team_requests', requestId), { playersJoined: newPlayerList });
  }
};