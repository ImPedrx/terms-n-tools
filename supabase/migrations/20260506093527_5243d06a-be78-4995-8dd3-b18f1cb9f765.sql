ALTER TABLE public.equipment ALTER COLUMN client_id SET DEFAULT public.current_client_id(auth.uid());
ALTER TABLE public.responsibility_terms ALTER COLUMN client_id SET DEFAULT public.current_client_id(auth.uid());
ALTER TABLE public.system_settings ALTER COLUMN client_id SET DEFAULT public.current_client_id(auth.uid());
ALTER TABLE public.equipment_types ALTER COLUMN client_id SET DEFAULT public.current_client_id(auth.uid());
ALTER TABLE public.analysts ALTER COLUMN client_id SET DEFAULT public.current_client_id(auth.uid());