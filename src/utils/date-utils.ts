
/**
 * Format a date string into a human-readable format
 * @param dateString - ISO date string
 * @param format - 'date', 'time', or 'datetime' (default)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, format: 'date' | 'time' | 'datetime' = 'datetime') => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return '-';
  
  try {
    switch (format) {
      case 'date':
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      case 'time':
        return date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'datetime':
      default:
        return date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return the original string if formatting fails
  }
};
