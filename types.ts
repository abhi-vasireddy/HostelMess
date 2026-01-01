
export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  deactivatedUntil?: string | null; // ISO Date string
}

export enum MealType {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  SNACKS = 'Snacks',
  DINNER = 'Dinner'
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  isVeg: boolean;
  image?: string;
  rating?: number; // Calculated average
  ratingCount?: number;
}

export interface DailyMenu {
  day: string; // "Monday", "Tuesday", etc.
  [MealType.BREAKFAST]: Dish[];
  [MealType.LUNCH]: Dish[];
  [MealType.SNACKS]: Dish[];
  [MealType.DINNER]: Dish[];
}

export interface Feedback {
  id: string;
  dishId: string;
  dishName: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export enum AnnouncementType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success'
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  expiresOn: string; // ISO Date string
  createdAt: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface CanteenItem {
  id: string;
  name: string;
  price: number;
  category: string; // e.g., 'Snacks', 'Drinks'
  image?: string;
  isAvailable: boolean;
}

export interface AppSettings {
  canteenEnabled: boolean;
  splashVideoEnabled: boolean; // 👈 ADD THIS LINE
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface TodoTask {
  id: string;
  text: string;
  description?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  dueDate: string; // ISO Date string YYYY-MM-DDTHH:mm
  createdAt: number;
}

export interface AdminNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}
