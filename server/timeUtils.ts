/**
 * Server-side timezone utilities for CST-1 (UTC-6) timezone
 * Ensures appointment times are stored and retrieved in consistent timezone
 */

// CST-1 is UTC-6 (Central Standard Time minus 1 hour)
const CST_MINUS_1_OFFSET = -6 * 60; // minutes from UTC

/**
 * Get current date in CST-1 timezone for server operations
 */
export function getCurrentDateCST1(): string {
  const now = new Date();
  
  // Convert to CST-1 (UTC-6)
  const cstTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  
  const year = cstTime.getUTCFullYear();
  const month = String(cstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cstTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in CST-1 timezone for appointment creation
 */
export function getCurrentTimeCST1(): string {
  const now = new Date();
  
  // Convert to CST-1 (UTC-6)
  const cstTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  
  const hours = String(cstTime.getUTCHours()).padStart(2, '0');
  const minutes = String(cstTime.getUTCMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Validate date format for CST-1 operations
 */
export function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
}

/**
 * Convert any date to CST-1 for database storage
 */
export function toCST1Date(date: Date): string {
  const cstTime = new Date(date.getTime() - (6 * 60 * 60 * 1000));
  
  const year = cstTime.getUTCFullYear();
  const month = String(cstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cstTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}