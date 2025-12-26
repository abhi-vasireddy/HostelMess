import { MealType } from "../types";

const IST_TIMEZONE = 'Asia/Kolkata';

export const getISTDate = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 5.5)); // Offset for IST is +5.5
  return nd;
};

export const getCurrentDayName = (): string => {
  const d = getISTDate();
  return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: IST_TIMEZONE });
};

export const isFeedbackUnlocked = (mealType: MealType): boolean => {
  const d = getISTDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeVal = hours + (minutes / 60);

  // Breakfast -> after 8:00 AM (8.0)
  // Lunch -> after 1:00 PM (13.0)
  // Snacks -> after 4:45 PM (16.75)
  // Dinner -> after 7:30 PM (19.5)

  switch (mealType) {
    case MealType.BREAKFAST: return timeVal >= 8.0;
    case MealType.LUNCH: return timeVal >= 13.0;
    case MealType.SNACKS: return timeVal >= 16.75;
    case MealType.DINNER: return timeVal >= 19.5;
    default: return false;
  }
};

export const getTodayDateString = (): string => {
  const d = getISTDate();
  return d.toISOString().split('T')[0];
};
