-- Popular tipos de equipamento padrão para todos os clientes existentes
INSERT INTO public.equipment_types (client_id, name)
SELECT c.id, t.name
FROM public.clients c
CROSS JOIN (VALUES
  ('Notebook'), ('Mouse'), ('Teclado'), ('Projetor'),
  ('Workstation'), ('Monitor'), ('Tablet'), ('Celular'), ('Outros')
) AS t(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment_types et WHERE et.client_id = c.id AND et.name = t.name
);

-- Remover coluna signed_pdf_path se existir (tipos do TS não têm, mas pode existir no banco)
ALTER TABLE public.responsibility_terms DROP COLUMN IF EXISTS signed_pdf_path;