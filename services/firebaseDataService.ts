/**
 * Firebase Data Service
 * Intelligent data fetching layer for the AI Assistant.
 * Each method reads only the necessary data from Firebase.
 * Includes basic caching to minimize Firestore reads.
 */
import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import type {
  User,
  Feedback,
  DailyMenu,
  HostelComplaint,
  Suggestion,
} from '../types';

// ─── Simple Cache ────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function invalidateCache(prefix?: string): void {
  if (!prefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // Monday as week start
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthStartDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

// ─── User Data ───────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<User[]> {
  const cached = getCached<User[]>('users');
  if (cached) return cached;

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(
      (doc) => ({ ...(doc.data() as any), uid: doc.id }) as User
    );
    setCache('users', users, 60_000); // 1 min cache for users
    return users;
  } catch (e) {
    console.error('fetchAllUsers error:', e);
    return [];
  }
}

export async function fetchUserStats(): Promise<{
  total: number;
  active: number;
  deactivated: number;
  students: number;
  admins: number;
  staff: number;
  male: number;
  female: number;
  byBlock: Record<string, number>;
}> {
  const users = await fetchAllUsers();

  const now = new Date();
  let active = 0,
    deactivated = 0,
    students = 0,
    admins = 0,
    staff = 0,
    male = 0,
    female = 0;
  const byBlock: Record<string, number> = {};

  for (const u of users) {
    if (u.deactivatedUntil && now < new Date(u.deactivatedUntil)) {
      deactivated++;
    } else {
      active++;
    }
    if (u.role === 'STUDENT') students++;
    else if (u.role === 'ADMIN') admins++;
    else if (u.role === 'CANTEEN_STAFF') staff++;
    if (u.gender === 'MALE') male++;
    else if (u.gender === 'FEMALE') female++;

    // Extract block from room number (e.g., "101-A" → "A" or first digit range)
    if (u.roomNumber && u.roomNumber !== 'N/A') {
      const block = u.roomNumber.split('-')[1] || u.roomNumber.charAt(0);
      byBlock[block] = (byBlock[block] || 0) + 1;
    }
  }

  return {
    total: users.length,
    active,
    deactivated,
    students,
    admins,
    staff,
    male,
    female,
    byBlock,
  };
}

// ─── Feedback Data ───────────────────────────────────────────────────────────

export async function fetchAllFeedback(): Promise<Feedback[]> {
  const cached = getCached<Feedback[]>('feedback');
  if (cached) return cached;

  try {
    const q = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const feedback = snapshot.docs.map(
      (doc) => ({ ...(doc.data() as any), id: doc.id }) as Feedback
    );
    setCache('feedback', feedback, 30_000);
    return feedback;
  } catch (e) {
    console.error('fetchAllFeedback error:', e);
    return [];
  }
}

export async function fetchTodayFeedback(): Promise<Feedback[]> {
  const all = await fetchAllFeedback();
  const today = getTodayDateString();
  return all.filter((f) => f.date === today);
}

export async function fetchWeekFeedback(weekStart?: string): Promise<Feedback[]> {
  const all = await fetchAllFeedback();
  const start = weekStart || getWeekStartDate();
  const today = getTodayDateString();
  return all.filter((f) => f.date >= start && f.date <= today);
}

export async function fetchMonthFeedback(monthStart?: string): Promise<Feedback[]> {
  const all = await fetchAllFeedback();
  const start = monthStart || getMonthStartDate();
  const today = getTodayDateString();
  return all.filter((f) => f.date >= start && f.date <= today);
}

export async function fetchFeedbackInRange(
  startDate: string,
  endDate: string
): Promise<Feedback[]> {
  const all = await fetchAllFeedback();
  return all.filter((f) => isDateInRange(f.date, startDate, endDate));
}

/**
 * Aggregate feedback statistics for a given set.
 */
export function aggregateFeedbackStats(
  feedbackList: Feedback[]
): {
  total: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  byMealType: Record<string, { count: number; avg: number }>;
  byDish: Record<string, { count: number; avg: number; commentCount: number }>;
  byDate: Record<string, { count: number; avg: number }>;
} {
  if (!feedbackList.length) {
    return {
      total: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      byMealType: {},
      byDish: {},
      byDate: {},
    };
  }

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byMealType: Record<string, { sum: number; count: number }> = {};
  const byDish: Record<string, { sum: number; count: number; comments: string[] }> = {};
  const byDate: Record<string, { sum: number; count: number }> = {};
  let totalSum = 0;

  for (const f of feedbackList) {
    const r = f.rating || 0;
    totalSum += r;
    ratingDist[r] = (ratingDist[r] || 0) + 1;

    if (f.mealType) {
      if (!byMealType[f.mealType]) byMealType[f.mealType] = { sum: 0, count: 0 };
      byMealType[f.mealType].sum += r;
      byMealType[f.mealType].count++;
    }

    if (f.dishName) {
      if (!byDish[f.dishName]) byDish[f.dishName] = { sum: 0, count: 0, comments: [] };
      byDish[f.dishName].sum += r;
      byDish[f.dishName].count++;
      if (f.comment?.trim()) byDish[f.dishName].comments.push(f.comment);
    }

    if (f.date) {
      if (!byDate[f.date]) byDate[f.date] = { sum: 0, count: 0 };
      byDate[f.date].sum += r;
      byDate[f.date].count++;
    }
  }

  return {
    total: feedbackList.length,
    averageRating: parseFloat((totalSum / feedbackList.length).toFixed(2)),
    ratingDistribution: ratingDist,
    byMealType: Object.fromEntries(
      Object.entries(byMealType).map(([k, v]) => [
        k,
        { count: v.count, avg: parseFloat((v.sum / v.count).toFixed(2)) },
      ])
    ),
    byDish: Object.fromEntries(
      Object.entries(byDish).map(([k, v]) => [
        k,
        {
          count: v.count,
          avg: parseFloat((v.sum / v.count).toFixed(2)),
          commentCount: v.comments.length,
        },
      ])
    ),
    byDate: Object.fromEntries(
      Object.entries(byDate).map(([k, v]) => [
        k,
        { count: v.count, avg: parseFloat((v.sum / v.count).toFixed(2)) },
      ])
    ),
  };
}

// ─── Weekly Comparison ───────────────────────────────────────────────────────

export async function fetchWeekComparison(): Promise<{
  thisWeek: Feedback[];
  lastWeek: Feedback[];
  thisWeekStats: ReturnType<typeof aggregateFeedbackStats>;
  lastWeekStats: ReturnType<typeof aggregateFeedbackStats>;
}> {
  const all = await fetchAllFeedback();
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - diffToMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const thisWeek = all.filter(
    (f) => f.date >= fmt(thisMonday) && f.date <= fmt(now)
  );
  const lastWeek = all.filter(
    (f) => f.date >= fmt(lastMonday) && f.date <= fmt(lastSunday)
  );

  return {
    thisWeek,
    lastWeek,
    thisWeekStats: aggregateFeedbackStats(thisWeek),
    lastWeekStats: aggregateFeedbackStats(lastWeek),
  };
}

// ─── Menu Data ───────────────────────────────────────────────────────────────

export async function fetchWeeklyMenu(): Promise<DailyMenu[]> {
  const cached = getCached<DailyMenu[]>('menu');
  if (cached) return cached;

  try {
    const snapshot = await getDocs(collection(db, 'dailyMenus'));
    const menu = snapshot.docs.map((d) => d.data() as DailyMenu);
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const sorted = menu.sort(
      (a, b) => days.indexOf(a.day) - days.indexOf(b.day)
    );
    setCache('menu', sorted, 60_000);
    return sorted;
  } catch (e) {
    console.error('fetchWeeklyMenu error:', e);
    return [];
  }
}

export async function fetchTodayMenu(): Promise<{
  day: string;
  dishes: { name: string; mealType: string; isVeg: boolean }[];
} | null> {
  const menu = await fetchWeeklyMenu();
  const today = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][new Date().getDay()];
  const dayMenu = menu.find((m) => m.day === today);
  if (!dayMenu) return null;

  const dishes: { name: string; mealType: string; isVeg: boolean }[] = [];
  // Try both lowercase and capitalized keys (data format may vary)
  const mealKeys = [
    ['breakfast', 'Breakfast'],
    ['lunch', 'Lunch'],
    ['snacks', 'Snacks'],
    ['dinner', 'Dinner'],
  ] as const;
  for (const [lowerKey, upperKey] of mealKeys) {
    const items = (dayMenu as any)[lowerKey] || (dayMenu as any)[upperKey] || [];
    items.forEach((d: any) => {
      dishes.push({ name: d.name, mealType: lowerKey, isVeg: d.isVeg !== false });
    });
  }

  return { day: today, dishes };
}

/**
 * Fetch the menu for a specific day of the week.
 * Returns all dishes grouped by meal type for that day.
 */
export async function fetchMenuForDay(
  dayName: string
): Promise<{
  day: string;
  dishes: { name: string; mealType: string; isVeg: boolean }[];
} | null> {
  const menu = await fetchWeeklyMenu();
  const normalized = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
  const dayMenu = menu.find((m) => m.day === normalized);
  if (!dayMenu) return null;

  const dishes: { name: string; mealType: string; isVeg: boolean }[] = [];
  const mealKeys = [
    ['breakfast', 'Breakfast'],
    ['lunch', 'Lunch'],
    ['snacks', 'Snacks'],
    ['dinner', 'Dinner'],
  ] as const;
  for (const [lowerKey, upperKey] of mealKeys) {
    const items = (dayMenu as any)[lowerKey] || (dayMenu as any)[upperKey] || [];
    items.forEach((d: any) => {
      dishes.push({ name: d.name, mealType: lowerKey, isVeg: d.isVeg !== false });
    });
  }
  return { day: normalized, dishes };
}

/** Get the name of yesterday */
export function getYesterdayDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return days[yesterday.getDay()];
}

// ─── Hostel Complaints ───────────────────────────────────────────────────────

export async function fetchComplaints(): Promise<HostelComplaint[]> {
  const cached = getCached<HostelComplaint[]>('complaints');
  if (cached) return cached;

  try {
    const q = query(
      collection(db, 'hostel_complaints'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const complaints = snapshot.docs.map(
      (doc) => ({ ...(doc.data() as any), id: doc.id }) as HostelComplaint
    );
    setCache('complaints', complaints, 60_000);
    return complaints;
  } catch (e) {
    console.error('fetchComplaints error:', e);
    return [];
  }
}

export async function fetchComplaintStats(): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  byType: Record<string, number>;
  byDate: Record<string, number>;
  mostComplainedDay: string | null;
  commonComplaints: string[];
}> {
  const complaints = await fetchComplaints();
  let pending = 0,
    inProgress = 0,
    resolved = 0;
  const byType: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  for (const c of complaints) {
    if (c.status === 'Pending') pending++;
    else if (c.status === 'In Progress') inProgress++;
    else if (c.status === 'Resolved') resolved++;

    if (c.type) byType[c.type] = (byType[c.type] || 0) + 1;
    if (c.dateString) byDate[c.dateString] = (byDate[c.dateString] || 0) + 1;
  }

  // Most complained day
  let mostComplainedDay = null;
  let maxCount = 0;
  for (const [d, c] of Object.entries(byDate)) {
    if (c > maxCount) {
      maxCount = c;
      mostComplainedDay = d;
    }
  }

  // Common complaint types
  const commonComplaints = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  return {
    total: complaints.length,
    pending,
    inProgress,
    resolved,
    byType,
    byDate,
    mostComplainedDay,
    commonComplaints,
  };
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const cached = getCached<Suggestion[]>('suggestions');
  if (cached) return cached;

  try {
    const q = query(
      collection(db, 'suggestions'),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const suggestions = snapshot.docs.map(
      (doc) => ({ ...(doc.data() as any), id: doc.id }) as Suggestion
    );
    setCache('suggestions', suggestions, 60_000);
    return suggestions;
  } catch (e) {
    console.error('fetchSuggestions error:', e);
    return [];
  }
}

// ─── Top / Bottom Dishes ─────────────────────────────────────────────────────

export async function fetchTopLowestRatedDishes(
  n: number = 5,
  mealType?: string
): Promise<{
  top: { name: string; avg: number; count: number }[];
  lowest: { name: string; avg: number; count: number }[];
}> {
  const allFeedback = await fetchAllFeedback();
  const feedback = mealType
    ? allFeedback.filter((f) => f.mealType?.toLowerCase() === mealType.toLowerCase())
    : allFeedback;
  const stats = aggregateFeedbackStats(feedback);
  const dishes = Object.entries(stats.byDish)
    .filter(([, v]) => v.count >= 1)
    .map(([name, v]) => ({ name, avg: v.avg, count: v.count }));

  const top = [...dishes].sort((a, b) => b.avg - a.avg).slice(0, n);
  const lowest = [...dishes].sort((a, b) => a.avg - b.avg).slice(0, n);

  return { top, lowest };
}

// ─── Block-wise feedback submission count ────────────────────────────────────

export async function fetchFeedbackByBlock(): Promise<
  Record<string, { count: number; avgRating: number }>
> {
  const [users, feedback] = await Promise.all([
    fetchAllUsers(),
    fetchAllFeedback(),
  ]);

  // Build user lookup
  const userMap = new Map<string, string>();
  for (const u of users) {
    const block = u.roomNumber?.split('-')[1] || 'Unknown';
    userMap.set(u.uid, block);
  }

  const blockData: Record<
    string,
    { sum: number; count: number }
  > = {};

  for (const f of feedback) {
    const block = userMap.get(f.userId) || 'Unknown';
    if (!blockData[block]) blockData[block] = { sum: 0, count: 0 };
    blockData[block].sum += f.rating;
    blockData[block].count++;
  }

  return Object.fromEntries(
    Object.entries(blockData).map(([k, v]) => [
      k,
      {
        count: v.count,
        avgRating: parseFloat((v.sum / v.count).toFixed(2)),
      },
    ])
  );
}

// ─── Monthly report data ─────────────────────────────────────────────────────

export async function fetchMonthlyReportData(): Promise<{
  month: string;
  userStats: Awaited<ReturnType<typeof fetchUserStats>>;
  feedbackStats: ReturnType<typeof aggregateFeedbackStats>;
  complaintStats: Awaited<ReturnType<typeof fetchComplaintStats>>;
  topDishes: { name: string; avg: number; count: number }[];
  lowestDishes: { name: string; avg: number; count: number }[];
  suggestionCount: number;
}> {
  const today = new Date();
  const monthStr = today.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const [userStats, allFeedback, complaintStats, suggestions, menu] =
    await Promise.all([
      fetchUserStats(),
      fetchAllFeedback(),
      fetchComplaintStats(),
      fetchSuggestions(),
      fetchWeeklyMenu(),
    ]);

  // Only feedback from this month
  const monthStart = getMonthStartDate();
  const monthFeedback = allFeedback.filter((f) => f.date >= monthStart);
  const feedbackStats = aggregateFeedbackStats(monthFeedback);

  const dishes = Object.entries(feedbackStats.byDish)
    .filter(([, v]) => v.count >= 1)
    .map(([name, v]) => ({ name, avg: v.avg, count: v.count }));
  const topDishes = [...dishes].sort((a, b) => b.avg - a.avg).slice(0, 5);
  const lowestDishes = [...dishes].sort((a, b) => a.avg - b.avg).slice(0, 5);

  return {
    month: monthStr,
    userStats,
    feedbackStats,
    complaintStats,
    topDishes,
    lowestDishes,
    suggestionCount: suggestions.length,
  };
}

export async function fetchCanteenItems(): Promise<any[]> {
  const cached = getCached<any[]>('canteen');
  if (cached) return cached;
  try {
    const snapshot = await getDocs(collection(db, 'canteen'));
    const items = snapshot.docs.map((doc) => ({ ...(doc.data()), id: doc.id }));
    setCache('canteen', items, 30_000);
    return items;
  } catch (e) {
    console.error('fetchCanteenItems error:', e);
    return [];
  }
}

// ─── Cache invalidation helper ───────────────────────────────────────────────

export function clearDataCache(): void {
  invalidateCache();
}
