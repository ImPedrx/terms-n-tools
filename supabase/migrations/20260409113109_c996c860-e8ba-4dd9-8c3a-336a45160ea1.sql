
-- Rename existing enum values to new ones
ALTER TYPE public.term_status RENAME VALUE 'rascunho' TO 'pendente';
ALTER TYPE public.term_status RENAME VALUE 'pendente_colaborador' TO 'enviado_para_assinatura';
ALTER TYPE public.term_status RENAME VALUE 'aguardando_analista' TO 'fechado';
ALTER TYPE public.term_status RENAME VALUE 'totalmente_assinado' TO 'fechado_antigo';

-- We can't have duplicate values, so update any rows with the old 'totalmente_assinado' (now 'fechado_antigo') to 'fechado'
UPDATE public.responsibility_terms SET status = 'fechado' WHERE status = 'fechado_antigo';

-- Now rename fechado_antigo to something we'll drop
-- Unfortunately PostgreSQL doesn't support DROP VALUE from enum directly
-- So let's recreate the enum properly

-- Step 1: Create new enum
CREATE TYPE public.term_status_new AS ENUM ('pendente', 'enviado_para_assinatura', 'fechado', 'cancelado');

-- Step 2: Update the column to use the new enum
ALTER TABLE public.responsibility_terms 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.responsibility_terms 
  ALTER COLUMN status TYPE public.term_status_new 
  USING (
    CASE status::text
      WHEN 'pendente' THEN 'pendente'::public.term_status_new
      WHEN 'enviado_para_assinatura' THEN 'enviado_para_assinatura'::public.term_status_new
      WHEN 'fechado' THEN 'fechado'::public.term_status_new
      WHEN 'fechado_antigo' THEN 'fechado'::public.term_status_new
      WHEN 'cancelado' THEN 'cancelado'::public.term_status_new
      ELSE 'pendente'::public.term_status_new
    END
  );

ALTER TABLE public.responsibility_terms 
  ALTER COLUMN status SET DEFAULT 'pendente'::public.term_status_new;

-- Step 3: Drop old enum and rename new one
DROP TYPE public.term_status;
ALTER TYPE public.term_status_new RENAME TO term_status;
