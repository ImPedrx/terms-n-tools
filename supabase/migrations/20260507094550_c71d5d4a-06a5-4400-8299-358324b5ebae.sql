-- 1. Adicionar coluna sector em equipment (substitui Data de Entrega na UI legada)
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS sector text;

-- 2. Adicionar limiar de alerta de estoque por tipo de equipamento
ALTER TABLE public.equipment_types ADD COLUMN IF NOT EXISTS min_stock_alert integer NOT NULL DEFAULT 0;

-- 3. Adicionar email no analyst para gerenciamento
ALTER TABLE public.analysts ADD COLUMN IF NOT EXISTS email text;