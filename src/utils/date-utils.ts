
/**
 * Format a date string into a human-readable format
 */
export const formatDate = (
  dateString: string, 
  format: 'date' | 'time' | 'datetime' = 'datetime'
): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  try {
    const options: Intl.DateTimeFormatOptions = 
      format === 'date' ? { year: 'numeric', month: 'short', day: 'numeric' } :
      format === 'time' ? { hour: '2-digit', minute: '2-digit' } :
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    
    return date.toLocaleString(undefined, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
