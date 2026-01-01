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
  setDoc
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
  AdminNote
} from '../types';

// --- INITIAL DATA (For Seeding) ---
const INITIAL_MENU: DailyMenu[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
  day,
  Breakfast: [{ id: `${day}-b-1`, name: 'Idli Sambar', description: 'Steamed rice cakes', isVeg: true, image: 'https://picsum.photos/100/100' }],
  Lunch: [{ id: `${day}-l-1`, name: 'Rice & Curry', description: 'Steamed rice with curry', isVeg: true, image: 'https://picsum.photos/100/101' }],
  Snacks: day === 'Sunday' ? [] : [{ id: `${day}-s-1`, name: 'Samosa', description: 'Fried pastry', isVeg: true, image: 'https://picsum.photos/100/102' }],
  Dinner: [{ id: `${day}-d-1`, name: 'Chapati', description: 'Wheat flatbread', isVeg: true, image: 'https://picsum.photos/100/103' }]
}));

export const MockDB = {
  
  // --- 1. AUTHENTICATION ---
  login: async (email: string, password?: string): Promise<User> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    // Seed default users if DB is empty
    if (snapshot.empty) {
       const allUsers = await getDocs(usersRef);
       if (allUsers.empty) {
         console.log("Creating default Admin & Student...");
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
    
    if (userData.deactivatedUntil) {
      const banDate = new Date(userData.deactivatedUntil);
      if (new Date() < banDate) throw new Error(`Account Deactivated until ${banDate.toLocaleDateString()}`);
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

// --- 2. MENU (Clean Version - No Auto-Fill) ---
  
  getWeeklyMenu: async (): Promise<DailyMenu[]> => {
    try {
      const col = collection(db, 'dailyMenus');
      const snapshot = await getDocs(col);

      // ❌ DELETED: The "Seeding" / "INITIAL_MENU" block is removed from here.
      // Now, if the database is empty, it will simply return an empty list.

      const menu = snapshot.docs.map(d => d.data() as DailyMenu);
      
      // Sort days correctly
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return menu.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day));
    } catch (e) { 
      console.error(e); 
      return []; 
    }
  },

  updateMenu: async (updatedMenu: DailyMenu[]): Promise<void> => {
    try {
      console.log("Saving menu updates...");
      const batch = writeBatch(db);
      
      // KEY FIX: No need to delete anymore! Just overwrite the specific ID.
      updatedMenu.forEach(dayMenu => {
        // This ensures we always update 'dailyMenus/Monday' directly
        const dayDoc = doc(db, 'dailyMenus', dayMenu.day);
        batch.set(dayDoc, dayMenu);
      });

      await batch.commit();
      console.log("✅ Menu saved successfully!");
    } catch (e) {
      console.error("❌ Error updating menu:", e);
      throw e;
    }
  },

  // 3. BULK UPLOAD MENU
  bulkUploadMenu: async (fullMenu: DailyMenu[]): Promise<void> => {
    const batch = writeBatch(db);
    
    fullMenu.forEach(dayMenu => {
      // Create a reference for each day (e.g., "Monday", "Tuesday")
      // We use the day name as the ID so it overwrites easily
      const docRef = doc(db, 'dailyMenus', dayMenu.day);
      batch.set(docRef, dayMenu);
    });

    await batch.commit();
    console.log("Bulk menu upload complete!");
  },

  // --- 3. FEEDBACK ---
  getAllFeedback: async (): Promise<Feedback[]> => {
    try {
      // Sort: Newest First
      const q = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Feedback);
    } catch (e) { return []; }
  },

  submitFeedback: async (feedback: Feedback): Promise<void> => {
    await addDoc(collection(db, 'feedbacks'), { ...feedback, timestamp: Date.now() });
  },

  deleteFeedback: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'feedbacks', id));
  },

// --- 4. ANNOUNCEMENTS ---
  
  // Student View: Only show Active & Future announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      // 1. Ask Firebase for only "isActive == true" items
      const q = query(collection(db, 'announcements'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Announcement);

      // 2. Filter out expired ones (FIXED DATE LOGIC)
      const now = Date.now(); // Current time as a number
      
      return list.filter(a => {
         if (!a.expiresOn) return true; // If no date set, show it
         
         // Convert the "Local String" from the database into a real Timestamp number
         const expiryTime = new Date(a.expiresOn).getTime();
         
         // Only show if the Expiry Time is in the future
         return expiryTime > now;
      });
    } catch (e) { 
      console.error("Error fetching announcements:", e);
      return []; 
    }
  },
  
  // Admin View: Show EVERYTHING (Active, Inactive, Expired)
  getAllAnnouncementsAdmin: async (): Promise<Announcement[]> => {
    try {
      // No filter - fetch all
      const snapshot = await getDocs(collection(db, 'announcements'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Announcement);
    } catch (e) { return []; }
  },

  saveAnnouncement: async (announcement: Announcement): Promise<void> => {
    const { id, ...data } = announcement;
    
    // If it has a long Firebase ID, it's an update
    if (id && id.length > 20) {
       try {
         await updateDoc(doc(db, 'announcements', id), data);
         return;
       } catch (e) { /* Fallback to add if not found */ }
    }
    
    // Otherwise, create new
    await addDoc(collection(db, 'announcements'), data);
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
      const docId = snapshot.docs[0].id;
      await updateDoc(doc(db, 'settings', docId), { ...settings });
    }
  },

  getCanteenMenu: async (): Promise<CanteenItem[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'canteen'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as CanteenItem);
    } catch (e) { return []; }
  },

  saveCanteenItem: async (item: CanteenItem): Promise<void> => {
     const { id, ...data } = item;
     // Simple check: if ID looks like a timestamp (short), it's new. 
     // If it's a long Firebase ID, it's an update.
     if (id && id.length > 15 && !id.startsWith('c')) {
        await updateDoc(doc(db, 'canteen', id), data);
     } else {
        await addDoc(collection(db, 'canteen'), data);
     }
  },

  // 👇 PASTE THIS INSIDE MockDB object
  updateCanteenItem: async (updatedItem: CanteenItem): Promise<void> => {
    const items = await MockDB.getCanteenMenu();
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      localStorage.setItem('canteen_menu', JSON.stringify(items));
    }
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
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        userId: doc.data().userId || 'anon',
        userName: doc.data().userName || 'Anonymous',
        text: doc.data().text || '',
        timestamp: doc.data().timestamp || Date.now()
      }) as Suggestion);
    } catch (e) { return []; }
  },

  deleteSuggestion: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'suggestions', id));
  },

  // --- 7. USER MANAGEMENT ---
  getAllUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as User);
    } catch (e) { return []; }
  },

  // ... inside MockDB object ...

  // 1. NEW CLEANUP FUNCTION
  cleanupDuplicateUsers: async (): Promise<void> => {
    console.log("Starting user cleanup...");
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs;
    
    // Map to track emails we have seen: Map<Email, DocID>
    const seenEmails = new Map<string, string>();
    const batch = writeBatch(db);
    let deleteCount = 0;

    users.forEach(docSnap => {
      const data = docSnap.data();
      const email = data.email;

      if (seenEmails.has(email)) {
        // We already saw this email! This current doc is a duplicate. DELETE IT.
        console.log(`Deleting duplicate user: ${email} (ID: ${docSnap.id})`);
        batch.delete(docSnap.ref);
        deleteCount++;
      } else {
        // First time seeing this email. Keep it.
        seenEmails.set(email, docSnap.id);
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`✅ Cleanup Complete: Removed ${deleteCount} duplicate users.`);
    } else {
      console.log("✅ No duplicates found.");
    }
  },

  // 2. UPDATED IMPORT FUNCTION (Prevents future duplicates)
  importUsers: async (newUsers: any[]): Promise<void> => {
    const batch = writeBatch(db);
    const usersRef = collection(db, 'users');
    
    // Get all existing emails first to avoid duplicates
    const existingSnap = await getDocs(usersRef);
    const existingEmails = new Set(existingSnap.docs.map(d => d.data().email));

    newUsers.forEach(u => {
      if (!existingEmails.has(u.email)) {
        // Only add if email doesn't exist
        const newDocRef = doc(usersRef); // Random ID
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
      // FIX: Sort by 'createdAt' so tasks don't jump around
      const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as TodoTask);
    } catch (e) { return []; }
  },

  saveTodo: async (t: TodoTask) => {
    // FIX: Use setDoc with {merge: true}
    // This ensures we use the EXACT ID generated by the UI, preventing "Cannot Delete" bugs.
    const { id, ...data } = t;
    await setDoc(doc(db, 'todos', id), data, { merge: true });
  },

  updateAllTodos: async (t: TodoTask[]) => { 
      // Note: Full drag-and-drop reordering persistence requires an 'order' field 
      // which we are skipping to keep the database simple. 
      // For now, tasks will strictly follow 'createdAt' order on refresh.
      console.log("Reordering is local-only for this session.");
  },

  deleteTodo: async (id: string) => { 
    await deleteDoc(doc(db, 'todos', id)); 
  },

  // --- NOTES ---

  getNotes: async (): Promise<AdminNote[]> => {
    try {
      // FIX: Sort notes by newest first
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AdminNote);
    } catch (e) { return []; }
  },

  saveNote: async (n: AdminNote) => {
    // FIX: Use setDoc to match UI ID with Database ID
    const { id, ...data } = n;
    await setDoc(doc(db, 'notes', id), data, { merge: true });
  },

  deleteNote: async (id: string) => { 
    await deleteDoc(doc(db, 'notes', id)); 
  }
};