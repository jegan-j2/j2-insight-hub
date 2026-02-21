/**
 * Maps database/Supabase errors to safe user-facing messages.
 * Prevents leaking internal schema details, table names, and constraint info.
 */
export const getSafeErrorMessage = (error: any): string => {
  if (error?.code === '23505') return 'This record already exists.';
  if (error?.code === '23503') return 'Cannot complete operation due to related data.';
  if (error?.code === '42501') return 'You do not have permission to perform this action.';
  if (error?.code === '23502') return 'A required field is missing.';
  if (error?.code === '42P01') return 'An error occurred. Please try again.';
  if (error?.message === 'Not authenticated') return 'Please sign in to continue.';

  // Log full error in dev only
  if (import.meta.env.DEV) {
    console.error('Database error details:', error);
  }

  return 'An error occurred. Please try again or contact support.';
};
