
-- System settings table for configurable options
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings" ON public.system_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Public can read settings" ON public.system_settings FOR SELECT TO anon USING (true);

-- Seed default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('term_text', 'Declaro, para os devidos fins, que recebi da empresa o equipamento descrito neste documento, comprometendo-me a utilizá-lo exclusivamente para fins profissionais, zelar por sua conservação e devolvê-lo sempre que solicitado ou ao término do vínculo com a empresa. Estou ciente de que sou responsável pelo uso adequado do equipamento e por comunicar qualquer problema, dano ou necessidade de manutenção ao setor responsável.'),
  ('language', 'pt'),
  ('company_logo_url', '');

-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "Anyone can read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'company-assets');
CREATE POLICY "Auth can read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "Auth can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets');

-- Add equipment return tracking
ALTER TABLE public.responsibility_terms ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE public.responsibility_terms ADD COLUMN IF NOT EXISTS returned_by text;
