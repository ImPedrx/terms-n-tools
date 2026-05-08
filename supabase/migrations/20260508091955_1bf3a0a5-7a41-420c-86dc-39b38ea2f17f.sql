
-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL, -- create | update | delete
  entity_type TEXT NOT NULL, -- equipment | term | client | analyst | playbook
  entity_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_client_created ON public.audit_logs (client_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant audit read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));
CREATE POLICY "tenant audit insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()) OR client_id IS NULL);

-- Playbook procedures
CREATE TABLE public.playbook_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL DEFAULT public.current_client_id(auth.uid()),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  content TEXT NOT NULL DEFAULT '',
  author_id UUID,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_playbook_client ON public.playbook_procedures (client_id, created_at DESC);
ALTER TABLE public.playbook_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant playbook all" ON public.playbook_procedures FOR ALL TO authenticated
  USING (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()))
  WITH CHECK (public.is_auksys_admin(auth.uid()) OR client_id = public.current_client_id(auth.uid()));
CREATE TRIGGER trg_playbook_updated BEFORE UPDATE ON public.playbook_procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
