-- ============================================================
-- Supabase Migration: Elevate Remote Office Channels & Realtime Messaging
-- Elevate Remote Solutions Office
-- ============================================================

-- 1. Helper function to check if current user is an Admin or Supervisor (SECURITY DEFINER to prevent RLS recursion)
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

-- 2. CHANNELS TABLE
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

-- 3. CHANNEL MEMBERS TABLE (Junction table for private & member access)
CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT channel_members_uniq UNIQUE (channel_id, user_id)
);

-- 4. CHANNEL MESSAGES TABLE (With rich JSONB attachments support)
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- COVERING INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_channels_slug ON public.channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_is_private ON public.channels(is_private);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_created ON public.channel_messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender ON public.channel_messages(sender_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Helper functions with SECURITY DEFINER to eliminate RLS recursion
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

-- ============================================================
-- SUPABASE REALTIME REPLICATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channel_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channel_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
  END IF;
END $$;

-- ============================================================
-- SEED DEFAULT PUBLIC CHANNELS
-- ============================================================
INSERT INTO public.channels (name, slug, description, is_private)
VALUES 
  ('general', 'general', 'Company-wide discussion, announcements, and team watercooler', false),
  ('announcements', 'announcements', 'Official management and office updates', false),
  ('random', 'random', 'Casual chatter, memes, and non-work discussions', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STORAGE BUCKET CONFIGURATION FOR ATTACHMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  20971520, -- 20 MB
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520;

-- Storage Policies
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid() = owner OR public.is_admin()));

-- ============================================================
-- AUTOMATIC MEMBERSHIP FOR PUBLIC CHANNELS
-- ============================================================
-- 1. When a new public channel is created, automatically add all active profiles
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

-- 2. When a new profile is registered/activated, automatically add to all public channels
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

-- 3. Backfill all active profiles into all existing public channels
INSERT INTO public.channel_members (channel_id, user_id, role)
SELECT c.id, p.id, 'member'
FROM public.channels c
CROSS JOIN public.profiles p
WHERE c.is_private = false
  AND p.is_active = true
ON CONFLICT (channel_id, user_id) DO NOTHING;

