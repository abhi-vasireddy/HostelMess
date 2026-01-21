import { 
  UtensilsCrossed, Building2, Trophy, Bus, Book, Wifi, 
  Dumbbell, Stethoscope, GraduationCap, Music, Video, 
  ShoppingCart, Briefcase, Zap, Heart, Globe, MapPin, 
  Calculator, Library, Coffee
} from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
  'Utensils': UtensilsCrossed,
  'Building': Building2,
  'Trophy': Trophy,
  'Bus': Bus,
  'Book': Book,
  'Wifi': Wifi,
  'Gym': Dumbbell,
  'Medical': Stethoscope,
  'Academic': GraduationCap,
  'Music': Music,
  'Video': Video,
  'Shop': ShoppingCart,
  'Work': Briefcase,
  'Power': Zap,
  'Health': Heart,
  'Globe': Globe,
  'Map': MapPin,
  'Math': Calculator,
  'Library': Library,
  'Coffee': Coffee
};

export const GRADIENT_OPTIONS = [
  { label: 'Orange', value: 'from-orange-500 to-amber-500' },
  { label: 'Blue', value: 'from-blue-500 to-indigo-600' },
  { label: 'Green', value: 'from-emerald-400 to-teal-500' },
  { label: 'Purple', value: 'from-purple-500 to-pink-500' },
  { label: 'Red', value: 'from-red-500 to-rose-600' },
  { label: 'Pink', value: 'from-pink-500 to-rose-400' },
  { label: 'Cyan', value: 'from-cyan-400 to-blue-500' },
  { label: 'Slate', value: 'from-slate-600 to-slate-800' },
];