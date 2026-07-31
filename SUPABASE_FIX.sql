-- =====================================================================
-- HMS FIX: Trigger + RLS policies so doctors appear everywhere
-- Run this entire script in your Supabase SQL Editor
-- =====================================================================

-- 1. Fix the trigger: when a doctor signs up, auto-insert into doctors table
--    when a patient signs up, auto-insert into patients table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  user_role_val := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'patient'));

  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_val::user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        full_name  = EXCLUDED.full_name,
        role       = EXCLUDED.role,
        updated_at = NOW();

  -- Auto-create doctor profile
  IF user_role_val = 'doctor' THEN
    INSERT INTO public.doctors (id, specialization)
    VALUES (NEW.id, '')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Auto-create patient profile
  IF user_role_val = 'patient' THEN
    INSERT INTO public.patients (id, dob)
    VALUES (NEW.id, '1900-01-01')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Fix RLS: allow all authenticated users to READ the doctors table
--    (so patients can see doctors when booking appointments)
DO $$
BEGIN
  -- Drop existing select policy if any
  DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;
  DROP POLICY IF EXISTS "doctors_select_policy" ON public.doctors;
  DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated users can view doctors"
  ON public.doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow a doctor to update their own profile
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctors;
CREATE POLICY "Doctors can update own profile"
  ON public.doctors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- 3. Fix RLS: allow authenticated users to READ the patients table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
  DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated users can view patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow a patient to update their own profile
DROP POLICY IF EXISTS "Patients can update own profile" ON public.patients;
CREATE POLICY "Patients can update own profile"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- 4. Backfill: create doctor rows for all existing users with role='doctor'
INSERT INTO public.doctors (id, specialization)
SELECT id, ''
FROM public.users
WHERE role = 'doctor'
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill: create patient rows for all existing users with role='patient'
INSERT INTO public.patients (id, dob)
SELECT id, '1900-01-01'
FROM public.users
WHERE role = 'patient'
ON CONFLICT (id) DO NOTHING;


-- 6. Fix RLS: billing table — allow authenticated users to read/write
DROP POLICY IF EXISTS "Authenticated users can view billing"  ON public.billing;
DROP POLICY IF EXISTS "Authenticated users can insert billing" ON public.billing;
DROP POLICY IF EXISTS "Authenticated users can update billing" ON public.billing;

CREATE POLICY "Authenticated users can view billing"
  ON public.billing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert billing"
  ON public.billing FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update billing"
  ON public.billing FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- 7. Fix RLS: appointments table — allow authenticated users to read/write
DROP POLICY IF EXISTS "Authenticated users can view appointments"   ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;

CREATE POLICY "Authenticated users can view appointments"
  ON public.appointments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- 8. Fix RLS: users table — allow authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
CREATE POLICY "Authenticated users can view users"
  ON public.users FOR SELECT TO authenticated USING (true);
