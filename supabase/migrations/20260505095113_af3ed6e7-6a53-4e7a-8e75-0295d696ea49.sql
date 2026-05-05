
-- ============================================================
-- AUKSYS MULTI-TENANT MIGRATION
-- ============================================================

-- ---------- 1. CLIENTS ----------
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  watermark_text text,
  primary_color text NOT NULL DEFAULT '#0f172a',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.clients (name, is_active) VALUES ('Aerrnova', true);

-- ---------- 2. USER_PROFILES ----------
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('auksys_admin', 'client_analyst')),
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.user_profiles (id, role, client_id, full_name)
SELECT u.id, 'auksys_admin',
       (SELECT id FROM public.clients WHERE name='Aerrnova' LIMIT 1),
       COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, client_id, full_name)
  VALUES (
    NEW.id, 'client_analyst',
    (SELECT id FROM public.clients WHERE name='Aerrnova' LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 3. SECURITY DEFINER HELPERS ----------
CREATE OR REPLACE FUNCTION public.is_auksys_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=_uid AND role='auksys_admin')
$$;

CREATE OR REPLACE FUNCTION public.current_client_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_id FROM public.user_profiles WHERE id=_uid LIMIT 1
$$;

-- ---------- 4. client_id IN EXISTING TABLES ----------
ALTER TABLE public.equipment              ADD COLUMN client_id uuid REFERENCES public.clients(id);
ALTER TABLE public.responsibility_terms   ADD COLUMN client_id uuid REFERENCES public.clients(id);
ALTER TABLE public.analysts               ADD COLUMN client_id uuid REFERENCES public.clients(id);
ALTER TABLE public.system_settings        ADD COLUMN client_id uuid REFERENCES public.clients(id);

UPDATE public.equipment            SET client_id=(SELECT id FROM public.clients WHERE name='Aerrnova');
UPDATE public.responsibility_terms SET client_id=(SELECT id FROM public.clients WHERE name='Aerrnova');
UPDATE public.analysts             SET client_id=(SELECT id FROM public.clients WHERE name='Aerrnova');
UPDATE public.system_settings      SET client_id=(SELECT id FROM public.clients WHERE name='Aerrnova');

ALTER TABLE public.equipment              ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.responsibility_terms   ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.analysts               ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.system_settings        ALTER COLUMN client_id SET NOT NULL;

ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_client_key_unique UNIQUE (client_id, key);

-- ---------- 5. EQUIPMENT_TYPES (dinâmico) ----------
ALTER TABLE public.equipment ALTER COLUMN type TYPE text USING type::text;

CREATE TABLE public.equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

INSERT INTO public.equipment_types (client_id, name)
SELECT (SELECT id FROM public.clients WHERE name='Aerrnova'), unnest(ARRAY[
  'notebook','mouse','teclado','projetor','workstation','monitor','tablet','celular'
]);

-- ---------- 6. LEGACY EQUIPMENT FIELDS ----------
ALTER TABLE public.equipment
  ADD COLUMN is_legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN legacy_user_name text,
  ADD COLUMN legacy_user_email text,
  ADD COLUMN legacy_delivered_at date;

-- ---------- 7. REMOVE PDF STORAGE COLUMN ----------
ALTER TABLE public.responsibility_terms DROP COLUMN IF EXISTS signed_pdf_path;

-- ---------- 8. RLS + POLICIES ----------
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own profile" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_auksys_admin(auth.uid()));
CREATE POLICY "admin manage profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()));

CREATE POLICY "admin all clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()));
CREATE POLICY "analyst read own client" ON public.clients
  FOR SELECT TO authenticated
  USING (id = public.current_client_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create equipment" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can delete equipment" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can read equipment"   ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can update equipment" ON public.equipment;
CREATE POLICY "tenant equipment all" ON public.equipment
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create terms" ON public.responsibility_terms;
DROP POLICY IF EXISTS "Authenticated users can delete terms" ON public.responsibility_terms;
DROP POLICY IF EXISTS "Authenticated users can read terms"   ON public.responsibility_terms;
DROP POLICY IF EXISTS "Authenticated users can update terms" ON public.responsibility_terms;
CREATE POLICY "tenant terms all" ON public.responsibility_terms
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read analysts" ON public.analysts;
CREATE POLICY "tenant analysts all" ON public.analysts
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read settings"   ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.system_settings;
CREATE POLICY "tenant settings all" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));

CREATE POLICY "tenant equipment_types all" ON public.equipment_types
  FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));
