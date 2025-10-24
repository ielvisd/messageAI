-- Create gym_settings table
-- This table stores per-gym configuration and preferences

CREATE TABLE IF NOT EXISTS public.gym_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE,
  
  -- Instructor settings
  can_self_assign_classes BOOLEAN DEFAULT false,
  private_lessons_require_approval BOOLEAN DEFAULT true,
  
  -- AI settings
  ai_auto_assign_enabled BOOLEAN DEFAULT false,
  ai_auto_assign_confidence_threshold INTEGER DEFAULT 95 CHECK (ai_auto_assign_confidence_threshold BETWEEN 0 AND 100),
  
  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "notify_on_class_cancellation": true,
    "notify_on_instructor_change": true,
    "show_instructor_on_schedule": true,
    "send_daily_digest": false
  }'::jsonb,
  
  -- Schedule permissions (from previous migrations if they exist)
  instructors_can_create_classes BOOLEAN DEFAULT false,
  instructors_edit_own_only BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_gym_settings_gym_id ON public.gym_settings(gym_id);

-- Enable RLS
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view settings for their gyms" ON public.gym_settings;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view settings for their gyms"
  ON public.gym_settings FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can manage settings for their gyms" ON public.gym_settings;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can manage settings for their gyms"
  ON public.gym_settings FOR ALL
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create default settings for existing gyms
INSERT INTO public.gym_settings (gym_id)
SELECT id FROM public.gyms
WHERE id NOT IN (SELECT gym_id FROM public.gym_settings)
ON CONFLICT (gym_id) DO NOTHING;

COMMENT ON TABLE public.gym_settings IS 'Per-gym configuration including instructor permissions, AI settings, and notification preferences';




