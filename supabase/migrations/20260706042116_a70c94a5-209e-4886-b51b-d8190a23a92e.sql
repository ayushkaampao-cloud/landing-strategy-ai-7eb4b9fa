WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.product_visual_profiles
)
DELETE FROM public.product_visual_profiles p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

ALTER TABLE public.product_visual_profiles
ADD CONSTRAINT product_visual_profiles_project_id_key UNIQUE (project_id);