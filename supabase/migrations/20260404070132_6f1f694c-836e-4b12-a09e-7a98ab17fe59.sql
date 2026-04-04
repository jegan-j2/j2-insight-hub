
-- Coaching notes table
CREATE TABLE public.sdr_coaching_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_name TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sdr_coaching_notes ENABLE ROW LEVEL SECURITY;

-- Admins and managers can do everything
CREATE POLICY "Admins can manage coaching notes"
  ON public.sdr_coaching_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage coaching notes"
  ON public.sdr_coaching_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Action items table
CREATE TABLE public.sdr_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_name TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  completed_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sdr_action_items ENABLE ROW LEVEL SECURITY;

-- Admins and managers full access
CREATE POLICY "Admins can manage action items"
  ON public.sdr_action_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage action items"
  ON public.sdr_action_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- SDRs can view their own action items
CREATE POLICY "SDRs can view own action items"
  ON public.sdr_action_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE ur.role = 'sdr'
        AND tm.sdr_name = sdr_action_items.sdr_name
        AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- SDRs can update their own action items (to mark complete)
CREATE POLICY "SDRs can update own action items"
  ON public.sdr_action_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE ur.role = 'sdr'
        AND tm.sdr_name = sdr_action_items.sdr_name
        AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
