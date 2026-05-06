CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_client_id uuid;
  meta_role text;
BEGIN
  meta_client_id := NULLIF(NEW.raw_user_meta_data->>'client_id', '')::uuid;
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client_analyst');

  INSERT INTO public.user_profiles (id, role, client_id, full_name)
  VALUES (
    NEW.id,
    meta_role,
    COALESCE(meta_client_id, (SELECT id FROM public.clients WHERE name='Aerrnova' LIMIT 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_equipment_client ON public.equipment(client_id);
CREATE INDEX IF NOT EXISTS idx_terms_client ON public.responsibility_terms(client_id);
CREATE INDEX IF NOT EXISTS idx_analysts_client ON public.analysts(client_id);
CREATE INDEX IF NOT EXISTS idx_equipment_types_client ON public.equipment_types(client_id);
CREATE INDEX IF NOT EXISTS idx_settings_client ON public.system_settings(client_id);