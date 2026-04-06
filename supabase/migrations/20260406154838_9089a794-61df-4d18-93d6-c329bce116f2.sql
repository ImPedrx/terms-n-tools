
-- Create analysts table
CREATE TABLE public.analysts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed initial analysts
INSERT INTO public.analysts (name) VALUES ('Gabriel'), ('Pedro Martins');

-- Create equipment type enum
CREATE TYPE public.equipment_type AS ENUM (
  'notebook', 'mouse', 'teclado', 'projetor', 'workstation', 
  'monitor', 'tablet', 'celular', 'outros'
);

-- Create equipment status enum
CREATE TYPE public.equipment_status AS ENUM (
  'disponivel', 'entregue', 'em_manutencao', 'reservado', 'baixado'
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type equipment_type NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  patrimony TEXT,
  status equipment_status NOT NULL DEFAULT 'disponivel',
  observations TEXT,
  assigned_to TEXT,
  assigned_term_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create term status enum
CREATE TYPE public.term_status AS ENUM (
  'rascunho', 'pendente_colaborador', 'aguardando_analista', 'totalmente_assinado', 'cancelado'
);

-- Create responsibility terms table
CREATE TABLE public.responsibility_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  equipment_description TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  patrimony TEXT,
  collaborator_name TEXT NOT NULL,
  analyst_id UUID REFERENCES public.analysts(id) NOT NULL,
  analyst_name TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  status term_status NOT NULL DEFAULT 'pendente_colaborador',
  access_token TEXT NOT NULL,
  access_password TEXT NOT NULL,
  collaborator_signature_name TEXT,
  collaborator_signature_date TIMESTAMP WITH TIME ZONE,
  analyst_signature_name TEXT,
  analyst_signature_date TIMESTAMP WITH TIME ZONE,
  term_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key from equipment back to terms
ALTER TABLE public.equipment 
  ADD CONSTRAINT fk_equipment_term 
  FOREIGN KEY (assigned_term_id) REFERENCES public.responsibility_terms(id) ON DELETE SET NULL;

-- Enable RLS on all tables
ALTER TABLE public.analysts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibility_terms ENABLE ROW LEVEL SECURITY;

-- Analysts: authenticated users can read all
CREATE POLICY "Authenticated users can read analysts" ON public.analysts
  FOR SELECT TO authenticated USING (true);

-- Equipment: authenticated users full access
CREATE POLICY "Authenticated users can read equipment" ON public.equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create equipment" ON public.equipment
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment" ON public.equipment
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete equipment" ON public.equipment
  FOR DELETE TO authenticated USING (true);

-- Terms: authenticated users full access
CREATE POLICY "Authenticated users can read terms" ON public.responsibility_terms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create terms" ON public.responsibility_terms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update terms" ON public.responsibility_terms
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete terms" ON public.responsibility_terms
  FOR DELETE TO authenticated USING (true);

-- Public access to terms by access_token (for collaborator signing)
CREATE POLICY "Public can read terms by token" ON public.responsibility_terms
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can update term signatures" ON public.responsibility_terms
  FOR UPDATE TO anon USING (true)
  WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_terms_updated_at
  BEFORE UPDATE ON public.responsibility_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
