/**
 * User timezone preferences and settings
 */

export interface TimezonePreference {
  id: string;
  name: string;
  offset: number; // minutes from UTC
  description: string;
  daylightSaving: boolean;
}

export const TIMEZONE_OPTIONS: TimezonePreference[] = [
  {
    id: 'cst-1',
    name: 'CST-1 (México)',
    offset: -6 * 60, // UTC-6
    description: 'Hora estándar central de México (sin horario de verano)',
    daylightSaving: false
  },
  {
    id: 'cst',
    name: 'CST (Central)',
    offset: -6 * 60, // UTC-6
    description: 'Hora estándar central (con horario de verano)',
    daylightSaving: true
  },
  {
    id: 'est',
    name: 'EST (Eastern)',
    offset: -5 * 60, // UTC-5
    description: 'Hora estándar del este (con horario de verano)',
    daylightSaving: true
  },
  {
    id: 'pst',
    name: 'PST (Pacific)',
    offset: -8 * 60, // UTC-8
    description: 'Hora estándar del pacífico (con horario de verano)',
    daylightSaving: true
  },
  {
    id: 'mst',
    name: 'MST (Mountain)',
    offset: -7 * 60, // UTC-7
    description: 'Hora estándar de montaña (con horario de verano)',
    daylightSaving: true
  }
];

export interface UserPreferences {
  timezoneId: string;
  language: 'es' | 'en';
  timeFormat: '12h' | '24h';
  dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  timezoneId: 'cst-1',
  language: 'es',
  timeFormat: '24h',
  dateFormat: 'dd/mm/yyyy'
};

/**
 * Get user timezone preference from localStorage
 */
export function getUserTimezone(): TimezonePreference {
  if (typeof window === 'undefined') {
    return TIMEZONE_OPTIONS[0]; // Default to CST-1 for server
  }
  
  const savedId = localStorage.getItem('userTimezone') || 'cst-1';
  return TIMEZONE_OPTIONS.find(tz => tz.id === savedId) || TIMEZONE_OPTIONS[0];
}

/**
 * Save user timezone preference to localStorage
 */
export function saveUserTimezone(timezoneId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userTimezone', timezoneId);
  }
}

/**
 * Calculate current time in user's preferred timezone
 */
export function getCurrentTimeInUserTimezone(): Date {
  const userTz = getUserTimezone();
  const now = new Date();
  
  // Apply daylight saving time if enabled for the timezone
  let offsetHours = userTz.offset / 60; // Convert minutes to hours
  if (userTz.daylightSaving && isDaylightSavingTime(now)) {
    offsetHours += 1; // Add 1 hour for DST
  }
  
  // Create a new Date representing the time in the target timezone
  // This avoids browser timezone confusion by constructing the date directly
  const targetTime = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + offsetHours,
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );
  
  return targetTime;
}

/**
 * Simple daylight saving time detection (US rules)
 */
function isDaylightSavingTime(date: Date): boolean {
  const year = date.getFullYear();
  
  // DST starts on the second Sunday in March
  const dstStart = new Date(year, 2, 1); // March 1st
  const dstStartDay = (14 - dstStart.getDay()) % 7; // Second Sunday
  dstStart.setDate(dstStartDay + 8);
  
  // DST ends on the first Sunday in November
  const dstEnd = new Date(year, 10, 1); // November 1st
  const dstEndDay = (7 - dstEnd.getDay()) % 7; // First Sunday
  dstEnd.setDate(dstEndDay + 1);
  
  return date >= dstStart && date < dstEnd;
}