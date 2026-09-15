-- ============================================================
-- Migration: Extended User Profile Fields
-- Run this in your Supabase SQL Editor (or via supabase CLI)
-- ============================================================

-- Add gender, birth_date, and address columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- RLS Note: No new RLS policies needed.
-- The existing per-user RLS on profiles already restricts reads/writes
-- to the authenticated user's own row. These new columns are covered.

-- Optional: Add a comment for documentation
COMMENT ON COLUMN public.profiles.gender IS 'Self-identified gender. Used to style avatar on the virtual map.';
COMMENT ON COLUMN public.profiles.birth_date IS 'User date of birth. Used for birthday display only.';
COMMENT ON COLUMN public.profiles.address IS 'Free-text address for the user profile card.';
