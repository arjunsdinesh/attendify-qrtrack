
-- Create a function to force activate a session
-- This is needed because sometimes boolean values can have issues with JavaScript->PostgreSQL conversion
CREATE OR REPLACE FUNCTION public.force_activate_session(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Direct SQL update of the is_active flag to true
  UPDATE public.attendance_sessions 
  SET 
    is_active = TRUE, 
    end_time = NULL
  WHERE id = session_id;
  
  -- Return true if the update affected any rows
  RETURN FOUND;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION public.force_activate_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_activate_session TO anon;
