
/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date string into a human-readable format
 * @param dateString - ISO date string to format
 * @param format - Format type (default, date, time, datetime)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, format: 'default' | 'date' | 'time' | 'datetime' = 'default'): string => {
  const date = new Date(dateString);
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString();
    case 'time':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleString();
  }
};

/**
 * Get a relative time string (e.g., "2 hours ago", "yesterday")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const getRelativeTimeString = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay === 1) {
    return 'yesterday';
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString, 'date');
  }
};

/**
 * Check if a date is today
 * @param dateString - ISO date string to check
 * @returns Boolean indicating if date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Get start and end of a time period (day, week, month, year)
 * @param period - Time period
 * @param date - Base date (defaults to now)
 * @returns Object with start and end dates
 */
export const getTimePeriod = (
  period: 'day' | 'week' | 'month' | 'year',
  date: Date = new Date()
): { start: Date; end: Date } => {
  const start = new Date(date);
  const end = new Date(date);
  
  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(date.getDate() - date.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(date.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
};
