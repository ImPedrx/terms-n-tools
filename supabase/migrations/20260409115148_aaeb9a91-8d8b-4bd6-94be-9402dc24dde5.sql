
-- Add signed PDF path column
ALTER TABLE public.responsibility_terms 
ADD COLUMN IF NOT EXISTS signed_pdf_path text;

-- Remove anon policies (system is internal only now)
DROP POLICY IF EXISTS "Public can read terms by token" ON public.responsibility_terms;
DROP POLICY IF EXISTS "Public can update term signatures" ON public.responsibility_terms;
DROP POLICY IF EXISTS "Public can read settings" ON public.system_settings;

-- Remove signature columns no longer needed
ALTER TABLE public.responsibility_terms 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS access_password,
DROP COLUMN IF EXISTS collaborator_signature_name,
DROP COLUMN IF EXISTS collaborator_signature_date,
DROP COLUMN IF EXISTS analyst_signature_name,
DROP COLUMN IF EXISTS analyst_signature_date;

-- Create storage bucket for signed PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signed-terms', 'signed-terms', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can manage signed term files
CREATE POLICY "Authenticated users can upload signed terms"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signed-terms');

CREATE POLICY "Authenticated users can read signed terms"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signed-terms');

CREATE POLICY "Authenticated users can delete signed terms"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'signed-terms');
