export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  CANTEEN_STAFF = 'CANTEEN_STAFF'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  deactivatedUntil?: string | null;
  gender: Gender;      // 👈 NEW
  roomNumber: string;  // 👈 NEW
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
  image: string;
}

export interface DailyMenu {
  day: string;
  breakfast: Dish[];
  lunch: Dish[];
  snacks: Dish[];
  dinner: Dish[];
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  mealType: string;
  dishId: string;
  dishName: string;
  rating: number;
  comment: string;
  timestamp: number;
  date: string;
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
  date: string; // ISO string
  createdAt: number;
  expiresOn: string;
  isActive: boolean;
  pinned?: boolean;
}

export interface CanteenItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
}

export interface AppSettings {
  canteenEnabled: boolean;
  splashVideoEnabled: boolean;
}

export interface TodoTask {
  id: string;
  text: string;
  description?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  dueDate: string;
  createdAt: number;
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface AdminNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export enum ComplaintStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export interface HostelComplaint {
  id: string;
  userId: string;
  userName: string;
  room: string;
  type: string;
  desc: string;
  status: ComplaintStatus;
  createdAt: number;
  dateString: string;
}

export interface WashingMachine {
  id: string;
  name: string;
  capacity: string;
  gender: Gender; // 👈 NEW: Machines are now gender-specific
}

export interface LaundryBooking {
  id: string;
  machineId: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  date: string;
  createdAt: number;
}

export interface HostelCategory {
  id?: string;
  name: string;
  subcategories: string[];
  order?: number; // 👈 Add this line to allow the order property
}

export interface ServiceModule {
  id: string;
  title: string;
  description: string;
  iconName: string; 
  path: string;     
  color: string;    
  isActive: boolean; 
  isExternal?: boolean; 
  order?: number;
}

// --- SPORTS MODULE TYPES ---
export interface SportsEquipment {
  id: string;
  name: string;
  category: 'Court' | 'Gear';
  total: number;
  available: number;
  image?: string;
  defaultTeams?: number;
}

export interface SportsBooking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'Active' | 'Completed';
  teamName?: string;
  captain?: string;
  teams?: {name: string; captain: string}[];
}

export interface TeamRequest {
  id: string;
  sport: string; // e.g. "Cricket", "Badminton"
  creatorName: string;
  creatorId: string;
  date: string;
  time: string;
  playersNeeded: number;
  playersJoined: string[]; // List of names
  description: string;
}

// ─── Cricket Scoring Types ──────────────────────────────────────────────────

export interface CricketTeam {
  id: string;
  name: string;
  shortName: string;
  players: CricketPlayer[];
  createdAt: number;
}

export interface CricketPlayer {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'WK Batsman';
  teamId: string;
}

export interface CricketMatch {
  id: string;
  teamAId: string;
  teamBName: string;
  teamBId: string;
  teamAName: string;
  date: string;
  venue: string;
  totalOvers: number;
  status: 'upcoming' | 'live' | 'completed';
  tossWinner?: string;
  electedTo?: 'bat' | 'bowl';
  innings: CricketInnings[];
  result?: string;
  motm?: string;
  createdAt: number;
  createdBy?: { uid: string; name: string };
}

export interface CricketInnings {
  id: string;
  matchId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  total: number;
  wickets: number;
  overs: number;
  balls: CricketBall[];
}

export interface CricketBall {
  over: number;
  ball: number;
  batter: string;
  bowler: string;
  runs: number;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
  wide: boolean;
  noBall: boolean;
  bye: boolean;
  legBye: boolean;
  description: string;
}

export interface CricketTournament {
  id: string;
  name: string;
  teamIds: string[];
  matchIds: string[];
  createdAt: number;
}