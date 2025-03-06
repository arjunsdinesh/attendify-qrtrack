
// Function to format date in different ways
export const formatDate = (dateString: string, format: 'date' | 'time' | 'datetime' = 'datetime') => {
  const date = new Date(dateString);
  
  // Format options
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit'
  };
  
  const dateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  
  const dateTimeOptions: Intl.DateTimeFormatOptions = { 
    ...dateOptions,
    ...timeOptions
  };
  
  // Return formatted date based on requested format
  switch (format) {
    case 'time':
      return date.toLocaleTimeString(undefined, timeOptions);
    case 'date':
      return date.toLocaleDateString(undefined, dateOptions);
    case 'datetime':
    default:
      return date.toLocaleString(undefined, dateTimeOptions);
  }
};
