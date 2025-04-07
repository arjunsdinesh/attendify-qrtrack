
/**
 * Session tracking utilities to improve debugging
 */

// Generate a truly unique session ID with device timestamp
export const generateSessionId = (): string => {
  return `session_${Math.random().toString(36).substring(2, 9)}_${new Date().getTime().toString(36)}`;
};

// Clean up stale sessions in localStorage
export const cleanupStaleSessions = (sessionId: string): void => {
  try {
    // Multi-device safe cleanup - only clear token conflicts, not all auth
    const keysToPreserve = ['supabase.auth.token'];
    const cleanupId = `cleanup_${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`Starting auth cleanup (cleanup: ${cleanupId}, session: ${sessionId})`);
    
    // Only remove stale items that are causing conflicts
    Object.keys(localStorage).forEach(key => {
      if (!keysToPreserve.includes(key) && key.includes('supabase.auth.') && key !== 'supabase.auth.token') {
        console.log(`Removing stale auth item: ${key} (cleanup: ${cleanupId})`);
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // Ignore localStorage errors - don't let cleanup failures affect rendering
    console.warn(`Auth cleanup failed (session: ${sessionId}):`, e);
  }
};
