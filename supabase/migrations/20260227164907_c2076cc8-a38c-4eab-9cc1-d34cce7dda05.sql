-- Add meeting_status column to sql_meetings table
ALTER TABLE public.sql_meetings 
ADD COLUMN IF NOT EXISTS meeting_status text DEFAULT 'pending';

-- Backfill existing rows: if meeting_held is true, set status to 'held', otherwise 'pending'
UPDATE public.sql_meetings 
SET meeting_status = CASE 
  WHEN meeting_held = true THEN 'held' 
  ELSE 'pending' 
END 
WHERE meeting_status IS NULL OR meeting_status = 'pending';

-- Add client_notes column to sql_meetings table  
ALTER TABLE public.sql_meetings
ADD COLUMN IF NOT EXISTS client_notes text;