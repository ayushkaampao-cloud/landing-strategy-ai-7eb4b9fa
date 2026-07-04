ALTER TABLE public.product_visual_profiles
  ADD COLUMN image_count INT
  GENERATED ALWAYS AS (jsonb_array_length(COALESCE(source_image_urls, '[]'::jsonb)))
  STORED;

COMMENT ON COLUMN public.product_visual_profiles.image_count IS
  'Number of uploaded product reference images in source_image_urls; used for the lightweight grounding badge count.';