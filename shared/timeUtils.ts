/**
 * Reliable timezone utilities for CST-1 (UTC-6) timezone
 * Ensures consistent time handling across the application
 */

// CST-1 is UTC-6 (Central Standard Time minus 1 hour)
const CST_MINUS_1_OFFSET = -6 * 60; // minutes from UTC

/**
 * Get current time in CST-1 timezone (UTC-6, no daylight saving)
 */
export function getCurrentTimeCST1(): Date {
  const now = new Date();
  
  // Create a new date in CST-1 timezone (UTC-6)
  // Add the offset to get CST-1 time (subtract 6 hours from UTC)
  const cstMinus1Time = new Date(now.getTime() + (CST_MINUS_1_OFFSET * 60000));
  
  console.log(`getCurrentTimeCST1: UTC time: ${now.toISOString()}, CST-1 time: ${cstMinus1Time.toISOString()}`);
  
  return cstMinus1Time;
}

/**
 * Convert any date to CST-1 timezone string for database storage
 */
export function toCST1String(date?: Date): string {
  const cstTime = date ? date : getCurrentTimeCST1();
  const year = cstTime.getFullYear();
  const month = String(cstTime.getMonth() + 1).padStart(2, '0');
  const day = String(cstTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in CST-1 timezone as YYYY-MM-DD string
 */
export function getTodayCST1(): string {
  const cstTime = getCurrentTimeCST1();
  const year = cstTime.getFullYear();
  const month = String(cstTime.getMonth() + 1).padStart(2, '0');
  const day = String(cstTime.getDate()).padStart(2, '0');
  
  console.log(`getTodayCST1: CST time is ${cstTime.toISOString()}, returning ${year}-${month}-${day}`);
  
  return `${year}-${month}-${day}`;
}

/**
 * Convert CST-1 date string to display format
 */
export function formatCST1Date(dateString: string): string {
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
 * Get next/previous day in CST-1 timezone
 */
export function addDaysCST1(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  date.setDate(date.getDate() + days);
  
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Get current time in CST-1 for appointment scheduling
 */
export function getCurrentTimeStringCST1(): string {
  const cstTime = getCurrentTimeCST1();
  const hours = String(cstTime.getHours()).padStart(2, '0');
  const minutes = String(cstTime.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Validate if a date string is valid CST-1 format
 */
export function isValidCST1Date(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}