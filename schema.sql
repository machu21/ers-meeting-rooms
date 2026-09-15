-- Supabase Database Schema: Elevate Remote Solutions Office
-- Fully normalized (3NF), indexed, with cascading constraints and automated audit triggers.

-- 1. PROFILES
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'employee'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  avatar_url text,
  camera_enabled boolean NOT NULL DEFAULT false,
  microphone_enabled boolean NOT NULL DEFAULT false,
  accessible_maps ARRAY DEFAULT ARRAY['office'::text, 'meeting-room'::text, 'prayer-room'::text],
  is_active boolean DEFAULT true,
  display_name text,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'prefer_not_to_say'::text])),
  birth_date date,
  address text,
  avatar_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. MAPS
CREATE TABLE public.maps (
  id text NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'office'::map_type,
  background_url text,
  width numeric NOT NULL,
  height numeric NOT NULL,
  slug text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maps_pkey PRIMARY KEY (id)
);

-- 3. NORMALIZED USER MAP PERMISSIONS (3NF Junction Table)
CREATE TABLE public.user_map_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id text NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_map_permissions_user_map_uniq UNIQUE (user_id, map_id)
);

-- 4. MAP ZONES
CREATE TABLE public.map_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  name text NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  CONSTRAINT map_zones_pkey PRIMARY KEY (id),
  CONSTRAINT map_zones_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.maps(id) ON DELETE CASCADE
);

-- 5. MESSAGES
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  room_id text REFERENCES public.maps(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['group'::text, 'direct'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. TRANSCRIPTS
CREATE TABLE public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id),
  CONSTRAINT transcripts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.map_zones(id) ON DELETE CASCADE,
  CONSTRAINT transcripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT transcripts_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 7. MEETING MINUTES
CREATE TABLE public.meeting_minutes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  generated_by uuid,
  summary text NOT NULL,
  action_items text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_minutes_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_minutes_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.map_zones(id) ON DELETE CASCADE,
  CONSTRAINT meeting_minutes_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 8. AI AGENTS
CREATE TABLE public.ai_agents (
  id uuid NOT NULL,
  agent_type text NOT NULL,
  system_prompt text NOT NULL,
  assigned_map_id text,
  CONSTRAINT ai_agents_pkey PRIMARY KEY (id),
  CONSTRAINT ai_agents_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT ai_agents_assigned_map_id_fkey FOREIGN KEY (assigned_map_id) REFERENCES public.maps(id) ON DELETE SET NULL
);

-- 9. USER PRESENCE
CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  map_id text,
  last_seen timestamp with time zone DEFAULT now(),
  status text CHECK (status IN ('online', 'away', 'do_not_disturb', 'offline')),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_presence_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id) ON DELETE CASCADE
);

-- 10. APP & AUDIT LOGS
CREATE TABLE public.app_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  source text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  CONSTRAINT app_logs_pkey PRIMARY KEY (id),
  CONSTRAINT app_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ==========================================================
-- COVERING INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_user_map_permissions_user ON public.user_map_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_map_permissions_map ON public.user_map_permissions(map_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_map_zones_room ON public.map_zones(room_id);

CREATE INDEX IF NOT EXISTS idx_transcripts_zone_created ON public.transcripts(zone_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_zone ON public.meeting_minutes(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_generated_by ON public.meeting_minutes(generated_by);

CREATE INDEX IF NOT EXISTS idx_ai_agents_assigned_map ON public.ai_agents(assigned_map_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_map_last_seen ON public.user_presence(map_id, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_app_logs_user_created ON public.app_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_created ON public.app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_source_level ON public.app_logs(source, level);

-- ==========================================================
-- AUTOMATED DATABASE-LEVEL AUDIT LOGGING TRIGGERS
-- ==========================================================
-- Trigger 1: Auth user sign in (auto-logs on last_sign_in_at update)
-- Trigger 2: Auth user creation (auto-logs new account registration)
-- Trigger 3: Profile status audit (auto-logs activation, deactivation, and role changes)

-- ==========================================================
-- 11. ELEVATE REMOTE OFFICE CHANNELS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_private boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================================
-- 12. CHANNEL MEMBERS (Junction Table)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT channel_members_uniq UNIQUE (channel_id, user_id)
);

-- ==========================================================
-- 13. CHANNEL MESSAGES & ATTACHMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_channels_slug ON public.channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_is_private ON public.channels(is_private);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_created ON public.channel_messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender ON public.channel_messages(sender_id);

-- ==========================================================
-- 14. CHANNELS RLS POLICIES & HELPER FUNCTIONS
-- ==========================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin', 'supervisor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channels c
    WHERE c.id = p_channel_id
      AND (
        NOT c.is_private
        OR public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.channel_members cm
          WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id
        )
      )
  );
$$;

-- Channels Policies
DROP POLICY IF EXISTS "View channels policy" ON public.channels;
CREATE POLICY "View channels policy"
ON public.channels FOR SELECT
TO authenticated
USING (
  NOT is_private 
  OR is_admin() 
  OR is_channel_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Admin insert channels policy" ON public.channels;
CREATE POLICY "Admin insert channels policy"
ON public.channels FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin update channels policy" ON public.channels;
CREATE POLICY "Admin update channels policy"
ON public.channels FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin delete channels policy" ON public.channels;
CREATE POLICY "Admin delete channels policy"
ON public.channels FOR DELETE
TO authenticated
USING (is_admin());

-- Channel Members Policies
DROP POLICY IF EXISTS "View channel members policy" ON public.channel_members;
CREATE POLICY "View channel members policy"
ON public.channel_members FOR SELECT
TO authenticated
USING (
  is_admin() 
  OR user_id = auth.uid()
  OR can_access_channel(channel_id, auth.uid())
);

DROP POLICY IF EXISTS "Admin invite channel members policy" ON public.channel_members;
CREATE POLICY "Admin invite channel members policy"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admin or self remove member policy" ON public.channel_members;
CREATE POLICY "Admin or self remove member policy"
ON public.channel_members FOR DELETE
TO authenticated
USING (is_admin() OR user_id = auth.uid());

-- Channel Messages Policies
DROP POLICY IF EXISTS "View channel messages policy" ON public.channel_messages;
CREATE POLICY "View channel messages policy"
ON public.channel_messages FOR SELECT
TO authenticated
USING (
  is_admin()
  OR can_access_channel(channel_id, auth.uid())
);

DROP POLICY IF EXISTS "Insert channel messages policy" ON public.channel_messages;
CREATE POLICY "Insert channel messages policy"
ON public.channel_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    is_admin()
    OR can_access_channel(channel_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Sender or admin delete channel messages policy" ON public.channel_messages;
CREATE POLICY "Sender or admin delete channel messages policy"
ON public.channel_messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid() OR is_admin());

-- Seed Default Public Channels
INSERT INTO public.channels (name, slug, description, is_private)
VALUES 
  ('general', 'general', 'Company-wide discussion, announcements, and team watercooler', false),
  ('announcements', 'announcements', 'Official management and office updates', false),
  ('random', 'random', 'Casual chatter, memes, and non-work discussions', false)
ON CONFLICT (slug) DO NOTHING;

-- ==========================================================
-- 15. AUTOMATIC MEMBERSHIP FOR PUBLIC CHANNELS
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_public_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_private = false THEN
    -- Insert creator as admin if created_by is set
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.channel_members (channel_id, user_id, role, invited_by)
      VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
      ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'admin';
    END IF;

    -- Insert all other active profiles as members
    INSERT INTO public.channel_members (channel_id, user_id, role, invited_by)
    SELECT 
      NEW.id, 
      p.id, 
      'member', 
      NEW.created_by
    FROM public.profiles p
    WHERE p.is_active = true 
      AND (NEW.created_by IS NULL OR p.id <> NEW.created_by)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_public_channel ON public.channels;
CREATE TRIGGER trg_new_public_channel
AFTER INSERT ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_public_channel();

CREATE OR REPLACE FUNCTION public.handle_new_profile_public_channels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    SELECT c.id, NEW.id, 'member'
    FROM public.channels c
    WHERE c.is_private = false
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_profile_public_channels ON public.profiles;
CREATE TRIGGER trg_new_profile_public_channels
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_public_channels();

-- Backfill all active profiles into all existing public channels
INSERT INTO public.channel_members (channel_id, user_id, role)
SELECT c.id, p.id, 'member'
FROM public.channels c
CROSS JOIN public.profiles p
WHERE c.is_private = false
  AND p.is_active = true
ON CONFLICT (channel_id, user_id) DO NOTHING;