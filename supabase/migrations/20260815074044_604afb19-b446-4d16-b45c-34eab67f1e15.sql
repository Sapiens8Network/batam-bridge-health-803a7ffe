-- Rebrand existing medical request references from HTH- to MBP-
UPDATE public.medical_requests
SET reference = replace(reference, 'HTH-', 'MBP-')
WHERE reference LIKE 'HTH-%';

-- Update the default expression for new medical requests
ALTER TABLE public.medical_requests
ALTER COLUMN reference
SET DEFAULT ('MBP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)));