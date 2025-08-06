/**
 * Multi-timezone utilities with UTC as source of truth
 * Supports customers across Mexico, Colombia, Argentina, and other regions
 * 
 * CRITICAL: ALL DATABASE STORAGE MUST USE UTC
 * - User input (date/time) → Convert to UTC for storage
 * - Database retrieval → Convert from UTC to user timezone for display
 */

// Timezone configurations for different regions
export const TIMEZONE_CONFIGS = {
  'UTC': { offset: 0, name: 'UTC', displayName: 'UTC' },
  'Mexico/General': { offset: -6, name: 'CST', displayName: 'Mexico Central (CST-6)' },
  'America/Mexico_City': { offset: -6, name: 'CST', displayName: 'Mexico City (CST-6)' },
  'America/Mazatlan': { offset: -7, name: 'MST', displayName: 'Culiacán (MST-7)' },
  'America/Bogota': { offset: -5, name: 'COT', displayName: 'Colombia (COT-5)' },
  'America/Argentina/Buenos_Aires': { offset: -3, name: 'ART', displayName: 'Argentina (ART-3)' }
} as const;

export type TimezoneKey = keyof typeof TIMEZONE_CONFIGS;

// Default timezone can be configured per tenant
const DEFAULT_TIMEZONE: TimezoneKey = 'Mexico/General';

/**
 * Get current UTC time - this is the source of truth for all operations
 */
export function getCurrentUTC(): Date {
  return new Date();
}

/**
 * Get user's timezone from localStorage or default
 */
export function getUserTimezone(): TimezoneKey {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userTimezone') as TimezoneKey;
    if (stored && TIMEZONE_CONFIGS[stored]) {
      return stored;
    }
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Set user's timezone preference
 */
export function setUserTimezone(timezone: TimezoneKey): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userTimezone', timezone);
  }
}

/**
 * Convert UTC time to user's timezone
 */
export function convertUTCToUserTimezone(utcDate: Date, timezone?: TimezoneKey): Date {
  const tz = timezone || getUserTimezone();
  const config = TIMEZONE_CONFIGS[tz];
  return new Date(utcDate.getTime() + (config.offset * 60 * 60 * 1000));
}

/**
 * Convert user's local time to UTC for database storage
 */
export function convertUserTimezoneToUTC(localDate: Date, timezone?: TimezoneKey): Date {
  const tz = timezone || getUserTimezone();
  const config = TIMEZONE_CONFIGS[tz];
  return new Date(localDate.getTime() - (config.offset * 60 * 60 * 1000));
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInUserTimezone(timezone?: TimezoneKey): Date {
  return convertUTCToUserTimezone(getCurrentUTC(), timezone);
}

/**
 * Get today's date in user's timezone as YYYY-MM-DD string
 */
export function getTodayInUserTimezone(timezone?: TimezoneKey): string {
  const userTime = getCurrentTimeInUserTimezone(timezone);
  const dateStr = userTime.toISOString().split('T')[0];
  
  console.log(`getTodayInUserTimezone: User time is ${userTime.toISOString()}, returning ${dateStr}`);
  
  return dateStr;
}

// UTC STORAGE CONVERSION FUNCTIONS

/**
 * Convert user's local date/time input to UTC for database storage
 * @param localDate Date string in YYYY-MM-DD format (user's perspective)
 * @param localTime Time string in HH:MM format (user's perspective)
 * @param timezone User's timezone
 * @returns Object with UTC date and time strings for database storage
 */
export function convertUserDateTimeToUTC(localDate: string, localTime: string, timezone?: TimezoneKey): {
  utcDate: string;
  utcTime: string;
  utcISO: string;
} {
  const tz = timezone || getUserTimezone();
  
  // Create datetime in user's timezone
  const localDateTime = new Date(`${localDate}T${localTime}:00`);
  
  // Convert to UTC for storage
  const utcDateTime = convertUserTimezoneToUTC(localDateTime, tz);
  
  const utcDate = utcDateTime.toISOString().split('T')[0];
  const utcTime = utcDateTime.toISOString().split('T')[1].substring(0, 5); // HH:MM format
  
  console.log(`convertUserDateTimeToUTC: ${localDate} ${localTime} (${tz}) → UTC ${utcDate} ${utcTime}`);
  
  return {
    utcDate,
    utcTime,
    utcISO: utcDateTime.toISOString()
  };
}

/**
 * Convert UTC date/time from database to user's timezone for display
 * @param utcDate Date string in YYYY-MM-DD format (from database)
 * @param utcTime Time string in HH:MM format (from database)
 * @param timezone User's timezone
 * @returns Object with local date and time strings for display
 */
export function convertUTCToUserDateTime(utcDate: string, utcTime: string, timezone?: TimezoneKey): {
  localDate: string;
  localTime: string;
  localISO: string;
} {
  const tz = timezone || getUserTimezone();
  
  // Create UTC datetime from database values
  const utcDateTime = new Date(`${utcDate}T${utcTime}:00Z`);
  
  // Convert to user's timezone for display
  const localDateTime = convertUTCToUserTimezone(utcDateTime, tz);
  
  const localDate = localDateTime.toISOString().split('T')[0];
  const localTime = localDateTime.toISOString().split('T')[1].substring(0, 5); // HH:MM format
  
  console.log(`convertUTCToUserDateTime: UTC ${utcDate} ${utcTime} → ${localDate} ${localTime} (${tz})`);
  
  return {
    localDate,
    localTime,
    localISO: localDateTime.toISOString()
  };
}

/**
 * Format date for display in user's timezone
 */
export function formatDateInUserTimezone(dateString: string, timezone?: TimezoneKey): string {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Add days to a date string
 */
export function addDaysToDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  date.setDate(date.getDate() + days);
  
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Get current time string in user's timezone for display
 */
export function getCurrentTimeStringInUserTimezone(timezone?: TimezoneKey): string {
  const userTime = getCurrentTimeInUserTimezone(timezone);
  const timeStr = userTime.toISOString();
  const timePart = timeStr.split('T')[1];
  const [hours, minutes] = timePart.split(':');
  
  console.log(`getCurrentTimeStringInUserTimezone: UTC time converted to ${timezone}: ${timeStr} -> ${hours}:${minutes}`);
  
  return `${hours}:${minutes}`;
}

/**
 * Create a date object for a specific time in user's timezone
 * Returns UTC date that when stored in database represents the correct local time
 */
export function createDateTimeInUserTimezone(
  dateString: string, 
  timeString: string, 
  timezone?: TimezoneKey
): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create date in user's timezone
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  // Convert to UTC for database storage
  return convertUserTimezoneToUTC(localDate, timezone);
}

/**
 * Extract time from a date in user's timezone
 */
export function extractTimeFromDate(utcDate: Date, timezone?: TimezoneKey): string {
  const userTime = convertUTCToUserTimezone(utcDate, timezone);
  const timeStr = userTime.toISOString();
  const timePart = timeStr.split('T')[1];
  const [hours, minutes] = timePart.split(':');
  
  return `${hours}:${minutes}`;
}

/**
 * Extract date from a date in user's timezone
 */
export function extractDateFromDate(utcDate: Date, timezone?: TimezoneKey): string {
  const userTime = convertUTCToUserTimezone(utcDate, timezone);
  return userTime.toISOString().split('T')[0];
}

/**
 * Backwards compatibility functions
 */
export function getCurrentTimeCST1(): Date {
  return getCurrentTimeInUserTimezone('Mexico/General');
}

export function getTodayCST1(): string {
  return getTodayInUserTimezone('Mexico/General');
}

export function formatCST1Date(dateString: string): string {
  return formatDateInUserTimezone(dateString, 'Mexico/General');
}

export function addDaysCST1(dateString: string, days: number): string {
  return addDaysToDate(dateString, days);
}

export function toCST1String(date?: Date): string {
  const targetDate = date || getCurrentTimeCST1();
  return extractDateFromDate(targetDate, 'Mexico/General');
}

export function getCurrentTimeStringCST1(): string {
  return getCurrentTimeStringInUserTimezone('Mexico/General');
}

export function isValidCST1Date(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}