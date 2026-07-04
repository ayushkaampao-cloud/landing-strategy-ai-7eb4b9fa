CREATE POLICY "generated_images_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'generated-images'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE b.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "generated_images_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'generated-images'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE b.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "generated_images_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'generated-images'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE b.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'generated-images'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE b.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "generated_images_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'generated-images'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE b.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[2]
  )
);