import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntity = 'equipment' | 'term' | 'client' | 'analyst' | 'playbook' | 'equipment_type';

interface AuditInput {
  action: AuditAction;
  entity_type: AuditEntity;
  entity_id?: string | null;
  description?: string;
  metadata?: Record<string, any>;
  client_id?: string | null;
}

export async function logAudit(input: AuditInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let clientId = input.client_id ?? null;
    if (!clientId && user) {
      const { data: prof } = await supabase.from('user_profiles').select('client_id').eq('id', user.id).maybeSingle();
      clientId = prof?.client_id ?? null;
    }
    await supabase.from('audit_logs').insert({
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? null,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      client_id: clientId,
    });
  } catch (e) {
    console.error('audit log failed', e);
  }
}
