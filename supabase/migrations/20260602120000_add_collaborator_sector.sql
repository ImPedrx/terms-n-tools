-- Setor do colaborador no momento da geração do termo.
-- Captura o departamento do usuário atendido (texto livre, igual ao equipment.sector).
ALTER TABLE public.responsibility_terms
ADD COLUMN IF NOT EXISTS collaborator_sector TEXT;
