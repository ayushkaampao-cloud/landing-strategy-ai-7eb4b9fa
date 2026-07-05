
CREATE OR REPLACE FUNCTION public.get_shared_concept(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _concept public.concepts%ROWTYPE;
  _elements_row public.elements%ROWTYPE;
  _images jsonb;
  _theme jsonb;
  _category text;
BEGIN
  IF _token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _concept FROM public.concepts
   WHERE share_token = _token
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    p.research->'classification'->'themePalette',
    p.research->'classification'->>'category'
  INTO _theme, _category
  FROM public.projects p
  WHERE p.id = _concept.project_id;

  SELECT * INTO _elements_row FROM public.elements
   WHERE concept_id = _concept.id AND section_id = '__doc__'
   LIMIT 1;

  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ip.id,
        'preview_url', ip.preview_url,
        'status', ip.status,
        'metadata', ip.metadata,
        'created_at', ip.created_at
      ) ORDER BY ip.created_at
    ), '[]'::jsonb)
    INTO _images
    FROM public.image_previews ip
    WHERE ip.element_id = _elements_row.id;
  ELSE
    _images := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'concept', jsonb_build_object(
      'id', _concept.id,
      'concept_data', _concept.concept_data
    ),
    'elements', CASE
      WHEN _elements_row.id IS NULL THEN NULL
      ELSE jsonb_build_object('body_copy', _elements_row.body_copy)
    END,
    'images', _images,
    'theme_palette', _theme,
    'category', _category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_concept(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_concept(uuid) TO anon, authenticated;
