-- ============================================================
-- Migration: Strict Binary Character Gender (Male / Female)
-- Enforces strictly 'male' or 'female' for user character avatars.
-- ============================================================

-- 1. Clean up any existing legacy non-binary / prefer_not_to_say records
UPDATE public.profiles
SET gender = NULL
WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');

-- 2. Drop existing constraint if present
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- 3. Add strict binary check constraint (male or female only)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IN ('male', 'female'));

-- 4. Update column documentation
COMMENT ON COLUMN public.profiles.gender IS 'Character avatar gender. Strictly binary (male or female).';
