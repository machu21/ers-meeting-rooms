-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  content text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['group'::text, 'direct'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
);

CREATE TABLE public.map_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  name text NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  CONSTRAINT map_zones_pkey PRIMARY KEY (id),
  CONSTRAINT map_zones_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.maps(id)
);

CREATE TABLE public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id),
  CONSTRAINT transcripts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.map_zones(id),
  CONSTRAINT transcripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.meeting_minutes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  generated_by uuid NOT NULL,
  summary text NOT NULL,
  action_items text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_minutes_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_minutes_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.map_zones(id),
  CONSTRAINT meeting_minutes_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id)
);

CREATE TABLE public.ai_agents (
  id uuid NOT NULL,
  agent_type text NOT NULL,
  system_prompt text NOT NULL,
  assigned_map_id text,
  CONSTRAINT ai_agents_pkey PRIMARY KEY (id),
  CONSTRAINT ai_agents_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id),
  CONSTRAINT ai_agents_assigned_map_id_fkey FOREIGN KEY (assigned_map_id) REFERENCES public.maps(id)
);

CREATE TABLE public.maps (
  id text NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'office'::map_type,
  background_url text,
  width numeric NOT NULL,
  height numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maps_pkey PRIMARY KEY (id)
);

CREATE TABLE public.app_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  source text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  CONSTRAINT app_logs_pkey PRIMARY KEY (id),
  CONSTRAINT app_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  map_id text,
  last_seen timestamp with time zone DEFAULT now(),
  status text CHECK (status IN ('online', 'away', 'do_not_disturb', 'offline')),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_presence_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id)
);

-- Covering Indexes for Foreign Keys & Real-Time Queries
CREATE INDEX IF NOT EXISTS idx_transcripts_zone_created ON public.transcripts(zone_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_zone ON public.meeting_minutes(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_generated_by ON public.meeting_minutes(generated_by);
CREATE INDEX IF NOT EXISTS idx_map_zones_room ON public.map_zones(room_id);