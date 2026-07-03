
-- BRANDS
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  primary_audience TEXT,
  brand_voice JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_own" ON public.brands FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  product_name TEXT,
  product_description TEXT,
  key_features TEXT,
  key_benefits TEXT,
  price_info TEXT,
  product_url TEXT,
  site_url TEXT,
  goal TEXT,
  tone TEXT,
  notes TEXT,
  source_mode TEXT,
  landing_page_url TEXT,
  main_problem TEXT,
  objections TEXT,
  competitor TEXT,
  desired_angle TEXT,
  classification JSONB,
  research JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_brand_id_idx ON public.projects(brand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_own" ON public.projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = projects.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = projects.brand_id AND b.user_id = auth.uid()));

-- CONCEPTS
CREATE TABLE public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  framework_name TEXT NOT NULL,
  concept_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX concepts_project_id_idx ON public.concepts(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concepts TO authenticated;
GRANT ALL ON public.concepts TO service_role;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concepts_own" ON public.concepts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = concepts.project_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = concepts.project_id AND b.user_id = auth.uid()
  ));

-- ELEMENTS
CREATE TABLE public.elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  headline TEXT,
  subheadline TEXT,
  body_copy TEXT,
  bullets JSONB,
  cta_label TEXT,
  image_prompt TEXT,
  negative_prompt TEXT,
  image_mode TEXT,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX elements_concept_id_idx ON public.elements(concept_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elements TO authenticated;
GRANT ALL ON public.elements TO service_role;
ALTER TABLE public.elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "elements_own" ON public.elements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.concepts c
    JOIN public.projects p ON p.id = c.project_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE c.id = elements.concept_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.concepts c
    JOIN public.projects p ON p.id = c.project_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE c.id = elements.concept_id AND b.user_id = auth.uid()
  ));

-- IMAGE PREVIEWS
CREATE TABLE public.image_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES public.elements(id) ON DELETE CASCADE,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'simulated',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX image_previews_element_id_idx ON public.image_previews(element_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_previews TO authenticated;
GRANT ALL ON public.image_previews TO service_role;
ALTER TABLE public.image_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "image_previews_own" ON public.image_previews FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.elements e
    JOIN public.concepts c ON c.id = e.concept_id
    JOIN public.projects p ON p.id = c.project_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE e.id = image_previews.element_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.elements e
    JOIN public.concepts c ON c.id = e.concept_id
    JOIN public.projects p ON p.id = c.project_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE e.id = image_previews.element_id AND b.user_id = auth.uid()
  ));

-- PRODUCT VISUAL PROFILES
CREATE TABLE public.product_visual_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT,
  profile JSONB,
  source_image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pvp_project_id_idx ON public.product_visual_profiles(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_visual_profiles TO authenticated;
GRANT ALL ON public.product_visual_profiles TO service_role;
ALTER TABLE public.product_visual_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvp_own" ON public.product_visual_profiles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_visual_profiles.project_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_visual_profiles.project_id AND b.user_id = auth.uid()
  ));
