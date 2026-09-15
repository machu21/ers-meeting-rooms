-- ============================================================
-- Migration: Avatar Appearance Customization (Avatar Config)
-- Run this in your Supabase SQL Editor (or via Supabase CLI)
-- ============================================================

-- Add avatar_config jsonb column to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.avatar_config IS 'Custom appearance configuration (skin, headwear, outfit, pants, shoes, accessories).';

-- Verification Query
-- SELECT id, display_name, gender, avatar_config FROM public.profiles LIMIT 5;
