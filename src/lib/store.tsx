import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  GeneratedImagePreview,
  LandingPageConcept,
  LandingPageElements,
  Product,
  ProductImageRef,
  ProductVisualProfile,
  Project,
  ProjectResearch,
  User,
  Workspace,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";

const LEGACY_STORAGE_KEY = "landing-page-ai-v1";

interface AppData {
  user: User | null;
  workspaces: Workspace[];
  products: Product[];
  projects: Project[];
  concepts: LandingPageConcept[];
  activeWorkspaceId: string | null;
  research: Record<string, ProjectResearch>;
  elements: Record<string, LandingPageElements>;
  images: Record<string, GeneratedImagePreview[]>;
  productImages: Record<string, ProductImageRef[]>;
  productImageCount: Record<string, number>;
  visualProfile: Record<string, ProductVisualProfile | null>;
  elementRowIdByConcept: Record<string, string>; // concept.id -> elements table row id
  elementEditedFields: Record<string, Record<string, boolean>>; // conceptId -> field path -> true
  elementSaveErrors: Record<string, Record<string, string>>; // conceptId -> field path -> error msg
  loaded: boolean;
}

const empty: AppData = {
  user: null,
  workspaces: [],
  products: [],
  projects: [],
  concepts: [],
  activeWorkspaceId: null,
  research: {},
  elements: {},
  images: {},
  productImages: {},
  productImageCount: {},
  visualProfile: {},
  elementRowIdByConcept: {},
  elementEditedFields: {},
  elementSaveErrors: {},
  loaded: false,
};

interface StoreContextValue extends AppData {
  signUp: (email: string, password: string, name?: string) => Promise<User | null>;
  signInWithPassword: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  createWorkspace: (
    input: Omit<Workspace, "id" | "ownerId" | "createdAt">,
  ) => Promise<Workspace>;
  setActiveWorkspace: (id: string) => void;
  createProduct: (input: Omit<Product, "id" | "createdAt">) => Product;
  createProject: (
    input: Omit<Project, "id" | "createdAt"> & { product?: Product },
  ) => Promise<Project>;
  updateProjectBrief: (
    projectId: string,
    patch: {
      productDescription?: string;
      keyFeatures?: string;
      keyBenefits?: string;
      goal?: Project["goal"];
      tone?: string;
      notes?: string;
    },
  ) => Promise<void>;
  updateWorkspaceDescription: (
    workspaceId: string,
    description: string,
  ) => Promise<void>;
  saveConcepts: (projectId: string, concepts: LandingPageConcept[]) => void;
  saveConceptsAsync: (
    projectId: string,
    concepts: LandingPageConcept[],
  ) => Promise<void>;
  updateConceptSection: (
    conceptId: string,
    sectionId: string,
    patch: Partial<import("@/types").SectionProps>,
  ) => void;
  updateSectionBullets: (
    conceptId: string,
    sectionId: string,
    bullets: string[],
  ) => void;
  isFieldEdited: (conceptId: string, path: string) => boolean;
  getEditedFields: (conceptId: string) => Record<string, boolean>;
  getFieldSaveError: (conceptId: string, path: string) => string | undefined;
  deleteProject: (projectId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  enableConceptShare: (conceptId: string) => Promise<string>;
  disableConceptShare: (conceptId: string) => Promise<void>;
  activeWorkspace: Workspace | null;
  getResearch: (projectId: string) => ProjectResearch | null;
  saveResearch: (projectId: string, r: ProjectResearch) => Promise<void>;
  getElements: (conceptId: string) => LandingPageElements | null;
  saveElements: (conceptId: string, e: LandingPageElements) => Promise<void>;
  getImages: (conceptId: string) => GeneratedImagePreview[];
  saveImages: (conceptId: string, imgs: GeneratedImagePreview[]) => Promise<void>;
  updateImageForSection: (
    conceptId: string,
    sectionId: string,
    patch: Partial<GeneratedImagePreview>,
  ) => void;
  getProductImages: (projectId: string) => ProductImageRef[];
  loadProductImages: (projectId: string) => Promise<ProductImageRef[]>;
  saveProductImages: (projectId: string, imgs: ProductImageRef[]) => Promise<void>;
  getProductImageCount: (projectId: string) => number;
  getVisualProfile: (projectId: string) => ProductVisualProfile | null;
  saveVisualProfile: (projectId: string, p: ProductVisualProfile | null) => Promise<void>;
  version: number;
  legacyImportPending: boolean;
  importLegacyData: () => Promise<void>;
  dismissLegacyImport: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function projectRowToPair(row: any): { project: Project; product: Product } {
  const project: Project = {
    id: row.id,
    workspaceId: row.brand_id,
    productId: row.id, // 1:1
    projectName: row.project_name,
    goal: (row.goal ?? "Sell product") as Project["goal"],
    createdAt: row.created_at,
    sourceMode: row.source_mode ?? undefined,
    landingPageUrl: row.landing_page_url ?? undefined,
    notes: row.notes ?? undefined,
    tone: row.tone ?? undefined,
    mainProblem: row.main_problem ?? undefined,
    objections: row.objections ?? undefined,
    competitor: row.competitor ?? undefined,
    desiredAngle: row.desired_angle ?? undefined,
  };
  const product: Product = {
    id: row.id,
    workspaceId: row.brand_id,
    name: row.product_name ?? "",
    shortDescription: row.product_description ?? "",
    keyFeatures: row.key_features ?? "",
    keyBenefits: row.key_benefits ?? "",
    priceInfo: row.price_info ?? "",
    productUrl: row.product_url ?? undefined,
    siteUrl: row.site_url ?? undefined,
    createdAt: row.created_at,
  };
  return { project, product };
}

function projectToRow(project: Project, product: Product | undefined) {
  return {
    id: project.id,
    brand_id: project.workspaceId,
    project_name: project.projectName,
    product_name: product?.name ?? null,
    product_description: product?.shortDescription ?? null,
    key_features: product?.keyFeatures ?? null,
    key_benefits: product?.keyBenefits ?? null,
    price_info: product?.priceInfo ?? null,
    product_url: product?.productUrl ?? null,
    site_url: product?.siteUrl ?? null,
    goal: project.goal,
    tone: project.tone ?? null,
    notes: project.notes ?? null,
    source_mode: project.sourceMode ?? null,
    landing_page_url: project.landingPageUrl ?? null,
    main_problem: project.mainProblem ?? null,
    objections: project.objections ?? null,
    competitor: project.competitor ?? null,
    desired_angle: project.desiredAngle ?? null,
  };
}

function brandRowToWorkspace(row: any): Workspace {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    brandDescription: row.description ?? "",
    brandVoice: Array.isArray(row.brand_voice) ? row.brand_voice : [],
    primaryAudience: row.primary_audience ?? "",
    createdAt: row.created_at,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(empty);
  const [version, setVersion] = useState(0);
  const [legacyImportPending, setLegacyImportPending] = useState(false);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const loadUserData = useCallback(async (user: User) => {
    // brands
    const { data: brands } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: true });
    const workspaces: Workspace[] = (brands ?? []).map(brandRowToWorkspace);

    // projects
    const brandIds = workspaces.map((w) => w.id);
    let projects: Project[] = [];
    let products: Product[] = [];
    let researchMap: Record<string, ProjectResearch> = {};
    let projectIds: string[] = [];
    if (brandIds.length > 0) {
      const { data: projRows } = await supabase
        .from("projects")
        .select("*")
        .in("brand_id", brandIds)
        .order("created_at", { ascending: true });
      (projRows ?? []).forEach((r: any) => {
        const { project, product } = projectRowToPair(r);
        projects.push(project);
        products.push(product);
        if (r.research) researchMap[project.id] = r.research as ProjectResearch;
      });
      projectIds = projects.map((p) => p.id);
    }

    // concepts
    let concepts: LandingPageConcept[] = [];
    let conceptIds: string[] = [];
    if (projectIds.length > 0) {
      const { data: conceptRows } = await supabase
        .from("concepts")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: true });
      concepts = (conceptRows ?? []).map((r: any) => ({
        ...(r.concept_data as LandingPageConcept),
        id: r.id,
        projectId: r.project_id,
        createdAt: r.created_at,
        shareToken: (r.share_token as string | null) ?? null,
      }));
      conceptIds = concepts.map((c) => c.id);
    }

    // elements
    const elementsMap: Record<string, LandingPageElements> = {};
    const elementRowIdByConcept: Record<string, string> = {};
    const elementEditedFields: Record<string, Record<string, boolean>> = {};
    const imagesMap: Record<string, GeneratedImagePreview[]> = {};
    if (conceptIds.length > 0) {
      const { data: elemRows } = await supabase
        .from("elements")
        .select("*")
        .in("concept_id", conceptIds)
        .eq("section_id", "__doc__");
      const elemIds: string[] = [];
      (elemRows ?? []).forEach((r: any) => {
        elementRowIdByConcept[r.concept_id] = r.id;
        elemIds.push(r.id);
        try {
          if (r.body_copy) elementsMap[r.concept_id] = JSON.parse(r.body_copy);
        } catch {
          /* ignore */
        }
        if (r.edited_fields && typeof r.edited_fields === "object") {
          elementEditedFields[r.concept_id] = r.edited_fields as Record<string, boolean>;
        }
      });
      // reverse map elem row id -> concept id
      const elemToConcept: Record<string, string> = {};
      Object.entries(elementRowIdByConcept).forEach(([cId, eId]) => {
        elemToConcept[eId] = cId;
      });
      if (elemIds.length > 0) {
        const { data: prevRows } = await supabase
          .from("image_previews")
          .select("*")
          .in("element_id", elemIds)
          .order("created_at", { ascending: true });
        (prevRows ?? []).forEach((row: any) => {
          const cId = elemToConcept[row.element_id];
          if (!cId) return;
          const meta = row.metadata ?? {};
          const preview: GeneratedImagePreview = {
            sectionId: meta.sectionId ?? row.id,
            imagePrompt: meta.imagePrompt ?? "",
            imageStyle: meta.imageStyle ?? "",
            previewUrl: row.preview_url ?? meta.previewUrl ?? "",
            status: (row.status as GeneratedImagePreview["status"]) ?? "simulated",
            imageMode: meta.imageMode,
            category: meta.category,
            realUrl: meta.realUrl,
            placeholderLabel: meta.placeholderLabel,
          };
          if (!imagesMap[cId]) imagesMap[cId] = [];
          imagesMap[cId].push(preview);
        });
      }
    }

    // product visual profiles
    const visualProfileMap: Record<string, ProductVisualProfile | null> = {};
    const productImagesMap: Record<string, ProductImageRef[]> = {};
    const productImageCountMap: Record<string, number> = {};
    if (projectIds.length > 0) {
      // NOTE: Do NOT select source_image_urls here — it holds base64 dataUrls
      // used only by the server-side image generation route, and pulling them
      // into the client on every refresh causes multi-MB payloads / timeouts
      // that can silently blank the app shell. The server reads them via the
      // admin client when generating images. We only pull the lightweight
      // image_count generated column so the UI can show the grounding count.
      const { data: pvpRows } = await supabase
        .from("product_visual_profiles")
        .select("id, project_id, profile, description, image_count")
        .in("project_id", projectIds);
      (pvpRows ?? []).forEach((r: any) => {
        visualProfileMap[r.project_id] = (r.profile as ProductVisualProfile) ?? null;
        productImageCountMap[r.project_id] = (r.image_count as number) ?? 0;
      });
    }

    setData({
      user,
      workspaces,
      products,
      projects,
      concepts,
      activeWorkspaceId: workspaces[0]?.id ?? null,
      research: researchMap,
      elements: elementsMap,
      images: imagesMap,
      productImages: productImagesMap,
      productImageCount: productImageCountMap,
      visualProfile: visualProfileMap,
      elementRowIdByConcept,
      elementEditedFields,
      elementSaveErrors: {},
      loaded: true,
    });

    // Check for legacy localStorage data
    if (typeof window !== "undefined") {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy && workspaces.length === 0) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed?.workspaces?.length > 0 || parsed?.projects?.length > 0) {
            setLegacyImportPending(true);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  // Auth listener + initial load
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u: User = {
          id: session.user.id,
          email: session.user.email ?? "",
          name:
            (session.user.user_metadata as any)?.name ??
            session.user.email?.split("@")[0] ??
            "User",
          createdAt: session.user.created_at ?? new Date().toISOString(),
        };
        // Only reload if new user id
        if (dataRef.current.user?.id !== u.id || !dataRef.current.loaded) {
          setData((d) => ({ ...d, user: u }));
          void loadUserData(u);
        }
      } else if (event === "SIGNED_OUT") {
        setData({ ...empty, loaded: true });
      }
    });
    // Fetch existing session
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session?.user) {
        const u: User = {
          id: s.session.user.id,
          email: s.session.user.email ?? "",
          name:
            (s.session.user.user_metadata as any)?.name ??
            s.session.user.email?.split("@")[0] ??
            "User",
          createdAt: s.session.user.created_at ?? new Date().toISOString(),
        };
        setData((d) => ({ ...d, user: u }));
        void loadUserData(u);
      } else {
        setData((d) => ({ ...d, loaded: true }));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { data: res, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: name ? { name } : undefined,
      },
    });
    if (error) throw error;
    if (!res.user) return null;
    return {
      id: res.user.id,
      email: res.user.email ?? email,
      name: name ?? email.split("@")[0],
      createdAt: res.user.created_at ?? new Date().toISOString(),
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { data: res, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!res.user) return null;
    return {
      id: res.user.id,
      email: res.user.email ?? email,
      name: (res.user.user_metadata as any)?.name ?? email.split("@")[0],
      createdAt: res.user.created_at ?? new Date().toISOString(),
    };
  }, []);

  

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setData({ ...empty, loaded: true });
  }, []);

  const createWorkspace = useCallback<StoreContextValue["createWorkspace"]>(
    async (input) => {
      const user = dataRef.current.user;
      if (!user) throw new Error("Please sign in before creating a brand.");
      const id = uid();
      const ws: Workspace = {
        ...input,
        id,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
      };
      const { error } = await supabase.from("brands").insert({
        id: ws.id,
        user_id: user.id,
        name: ws.name,
        description: ws.brandDescription,
        primary_audience: ws.primaryAudience,
        brand_voice: ws.brandVoice,
      });
      if (error) throw error;
      setData((d) => ({
        ...d,
        workspaces: [...d.workspaces, ws],
        activeWorkspaceId: ws.id,
      }));
      return ws;
    },
    [],
  );

  const setActiveWorkspace = useCallback((id: string) => {
    setData((d) => ({ ...d, activeWorkspaceId: id }));
  }, []);

  const createProduct = useCallback<StoreContextValue["createProduct"]>((input) => {
    const p: Product = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, products: [...d.products, p] }));
    return p;
  }, []);

  const updateProjectBrief = useCallback<StoreContextValue["updateProjectBrief"]>(
    async (projectId, patch) => {
      let prevProject: Project | undefined;
      let prevProduct: Product | undefined;
      setData((d) => {
        prevProject = d.projects.find((p) => p.id === projectId);
        prevProduct = d.products.find((p) => p.id === projectId);
        if (!prevProject) return d;
        const nextProject: Project = {
          ...prevProject,
          goal: patch.goal ?? prevProject.goal,
          tone: patch.tone ?? prevProject.tone,
          notes: patch.notes ?? prevProject.notes,
        };
        const nextProduct: Product | undefined = prevProduct
          ? {
              ...prevProduct,
              shortDescription:
                patch.productDescription ?? prevProduct.shortDescription,
              keyFeatures: patch.keyFeatures ?? prevProduct.keyFeatures,
              keyBenefits: patch.keyBenefits ?? prevProduct.keyBenefits,
            }
          : undefined;
        return {
          ...d,
          projects: d.projects.map((p) => (p.id === projectId ? nextProject : p)),
          products: nextProduct
            ? d.products.map((p) => (p.id === projectId ? nextProduct : p))
            : d.products,
        };
      });
      bump();
      if (dataRef.current.user) {
        const dbPatch: Record<string, any> = {};
        if (patch.productDescription !== undefined)
          dbPatch.product_description = patch.productDescription;
        if (patch.keyFeatures !== undefined) dbPatch.key_features = patch.keyFeatures;
        if (patch.keyBenefits !== undefined) dbPatch.key_benefits = patch.keyBenefits;
        if (patch.goal !== undefined) dbPatch.goal = patch.goal;
        if (patch.tone !== undefined) dbPatch.tone = patch.tone;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes;
        const { error } = await supabase
          .from("projects")
          .update(dbPatch as any)
          .eq("id", projectId);
        if (error) {
          // revert
          setData((d) => ({
            ...d,
            projects: prevProject
              ? d.projects.map((p) => (p.id === projectId ? prevProject! : p))
              : d.projects,
            products: prevProduct
              ? d.products.map((p) => (p.id === projectId ? prevProduct! : p))
              : d.products,
          }));
          bump();
          throw error;
        }
      }
    },
    [bump],
  );

  const updateWorkspaceDescription = useCallback<
    StoreContextValue["updateWorkspaceDescription"]
  >(
    async (workspaceId, description) => {
      let prev: Workspace | undefined;
      setData((d) => {
        prev = d.workspaces.find((w) => w.id === workspaceId);
        return {
          ...d,
          workspaces: d.workspaces.map((w) =>
            w.id === workspaceId ? { ...w, brandDescription: description } : w,
          ),
        };
      });
      bump();
      if (dataRef.current.user) {
        const { error } = await supabase
          .from("brands")
          .update({ description })
          .eq("id", workspaceId);
        if (error) {
          setData((d) => ({
            ...d,
            workspaces: prev
              ? d.workspaces.map((w) => (w.id === workspaceId ? prev! : w))
              : d.workspaces,
          }));
          bump();
          throw error;
        }
      }
    },
    [bump],
  );


  const createProject = useCallback<StoreContextValue["createProject"]>(async (input) => {
    const user = dataRef.current.user;
    if (!user) throw new Error("Please sign in before creating a project.");
    const id = uid();
    const { product: inputProduct, ...projectInput } = input;
    const project: Project = {
      ...projectInput,
      id,
      productId: id,
      createdAt: new Date().toISOString(),
    };
    const product =
      inputProduct ?? dataRef.current.products.find((pr) => pr.id === input.productId);
    const persistedProduct = product ? { ...product, id } : undefined;
    const { error } = await supabase
      .from("projects")
      .insert(projectToRow(project, persistedProduct));
    if (error) throw error;
    setData((d) => {
      // update product to have its id changed to project.id in-memory
      const products = product
        ? d.products.map((pr) =>
            pr.id === product.id ? { ...pr, id } : pr,
          )
        : d.products;
      return { ...d, projects: [...d.projects, project], products };
    });
    bump();
    return project;
  }, [bump]);

  const persistConceptsToDb = useCallback(
    async (projectId: string, concepts: LandingPageConcept[]) => {
      const keepIds = concepts.map((c) => c.id);
      if (concepts.length > 0) {
        const rows = concepts.map((c) => ({
          id: c.id,
          project_id: projectId,
          framework_name: c.templateFamily,
          concept_data: c as any,
        }));
        const { error: upErr } = await supabase
          .from("concepts")
          .upsert(rows, { onConflict: "id" });
        if (upErr) throw upErr;
      }
      let del = supabase.from("concepts").delete().eq("project_id", projectId);
      if (keepIds.length > 0) {
        del = del.not(
          "id",
          "in",
          `(${keepIds.map((id) => `"${id}"`).join(",")})`,
        );
      }
      const { error: delErr } = await del;
      if (delErr) throw delErr;
    },
    [],
  );

  const saveConcepts = useCallback(
    (projectId: string, concepts: LandingPageConcept[]) => {
      setData((d) => ({
        ...d,
        concepts: [
          ...d.concepts.filter((c) => c.projectId !== projectId),
          ...concepts,
        ],
      }));
      if (dataRef.current.user) {
        persistConceptsToDb(projectId, concepts).catch((e) =>
          console.error("saveConcepts db", e),
        );
      }
    },
    [persistConceptsToDb],
  );

  const saveConceptsAsync = useCallback(
    async (projectId: string, concepts: LandingPageConcept[]) => {
      if (dataRef.current.user) {
        await persistConceptsToDb(projectId, concepts);
      }
      setData((d) => ({
        ...d,
        concepts: [
          ...d.concepts.filter((c) => c.projectId !== projectId),
          ...concepts,
        ],
      }));
    },
    [persistConceptsToDb],
  );

  const ensureElementsRowId = useCallback(
    async (conceptId: string): Promise<string> => {
      const existing = dataRef.current.elementRowIdByConcept[conceptId];
      if (existing) return existing;
      const newId = uid();
      const { error } = await supabase.from("elements").insert({
        id: newId,
        concept_id: conceptId,
        section_id: "__doc__",
        body_copy: null,
      });
      if (error) throw error;
      setData((d) => ({
        ...d,
        elementRowIdByConcept: {
          ...d.elementRowIdByConcept,
          [conceptId]: newId,
        },
      }));
      return newId;
    },
    [],
  );

  const setSaveError = useCallback(
    (conceptId: string, path: string, msg: string | null) => {
      setData((d) => {
        const forConcept = { ...(d.elementSaveErrors[conceptId] ?? {}) };
        if (msg) forConcept[path] = msg;
        else delete forConcept[path];
        return {
          ...d,
          elementSaveErrors: {
            ...d.elementSaveErrors,
            [conceptId]: forConcept,
          },
        };
      });
    },
    [],
  );

  const markFieldEdited = useCallback(
    async (conceptId: string, path: string) => {
      const current = dataRef.current.elementEditedFields[conceptId] ?? {};
      if (current[path]) return; // already marked, skip DB write
      const next = { ...current, [path]: true };
      setData((d) => ({
        ...d,
        elementEditedFields: {
          ...d.elementEditedFields,
          [conceptId]: next,
        },
      }));
      if (!dataRef.current.user) return;
      const rowId = await ensureElementsRowId(conceptId);
      const { error } = await supabase
        .from("elements")
        .update({ edited_fields: next as any, is_edited: true })
        .eq("id", rowId);
      if (error) throw error;
    },
    [ensureElementsRowId],
  );

  const updateConceptSection = useCallback<StoreContextValue["updateConceptSection"]>(
    (conceptId, sectionId, patch) => {
      let updatedConcept: LandingPageConcept | null = null;
      setData((d) => {
        const concepts = d.concepts.map((c) => {
          if (c.id !== conceptId) return c;
          const sections = c.schema.sections.map((s) =>
            s.id === sectionId ? { ...s, ...patch } : s,
          );
          const next = { ...c, schema: { ...c.schema, sections } };
          updatedConcept = next;
          return next;
        });
        return { ...d, concepts };
      });
      const paths = Object.keys(patch).map(
        (f) => `sections.${sectionId}.${f}`,
      );
      paths.forEach((p) => setSaveError(conceptId, p, null));
      if (dataRef.current.user && updatedConcept) {
        (async () => {
          try {
            const { error } = await supabase
              .from("concepts")
              .update({ concept_data: updatedConcept as any })
              .eq("id", conceptId);
            if (error) throw error;
            for (const p of paths) {
              await markFieldEdited(conceptId, p);
            }
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Save failed. Try again.";
            paths.forEach((p) => setSaveError(conceptId, p, msg));
          }
        })();
      }
    },
    [markFieldEdited, setSaveError],
  );

  const updateSectionBullets = useCallback(
    (conceptId: string, sectionId: string, bullets: string[]) => {
      updateConceptSection(conceptId, sectionId, { bullets });
    },
    [updateConceptSection],
  );

  const deleteProject = useCallback(async (projectId: string) => {
    if (dataRef.current.user) {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    }
    setData((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== projectId),
      concepts: d.concepts.filter((c) => c.projectId !== projectId),
      products: d.products.filter((pr) => pr.id !== projectId),
    }));
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (dataRef.current.user) {
      const { error } = await supabase.from("brands").delete().eq("id", workspaceId);
      if (error) throw error;
    }
    setData((d) => {
      const projs = d.projects.filter((p) => p.workspaceId === workspaceId);
      const projIds = projs.map((p) => p.id);
      const remaining = d.workspaces.filter((w) => w.id !== workspaceId);
      return {
        ...d,
        workspaces: remaining,
        products: d.products.filter((pr) => !projIds.includes(pr.id)),
        projects: d.projects.filter((p) => p.workspaceId !== workspaceId),
        concepts: d.concepts.filter((c) => !projIds.includes(c.projectId)),
        activeWorkspaceId:
          d.activeWorkspaceId === workspaceId
            ? remaining[0]?.id ?? null
            : d.activeWorkspaceId,
      };
    });
  }, []);

  const enableConceptShare = useCallback(async (conceptId: string): Promise<string> => {
    const existing = dataRef.current.concepts.find((c) => c.id === conceptId);
    if (existing?.shareToken) return existing.shareToken;
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : uid();
    if (dataRef.current.user) {
      const { error } = await supabase
        .from("concepts")
        .update({ share_token: token })
        .eq("id", conceptId);
      if (error) throw error;
    }
    setData((d) => ({
      ...d,
      concepts: d.concepts.map((c) =>
        c.id === conceptId ? { ...c, shareToken: token } : c,
      ),
    }));
    return token;
  }, []);

  const disableConceptShare = useCallback(async (conceptId: string): Promise<void> => {
    if (dataRef.current.user) {
      const { error } = await supabase
        .from("concepts")
        .update({ share_token: null })
        .eq("id", conceptId);
      if (error) throw error;
    }
    setData((d) => ({
      ...d,
      concepts: d.concepts.map((c) =>
        c.id === conceptId ? { ...c, shareToken: null } : c,
      ),
    }));
  }, []);

  const activeWorkspace = useMemo(
    () => data.workspaces.find((w) => w.id === data.activeWorkspaceId) ?? null,
    [data.workspaces, data.activeWorkspaceId],
  );

  // Sub-resource operations
  const saveResearch = useCallback(async (projectId: string, r: ProjectResearch) => {
    if (dataRef.current.user) {
      const { error } = await supabase
        .from("projects")
        .update({ research: r as any })
        .eq("id", projectId);
      if (error) throw error;
    }
    setData((d) => ({ ...d, research: { ...d.research, [projectId]: r } }));
    bump();
  }, [bump]);

  const upsertElementsRow = async (conceptId: string, e: LandingPageElements) => {
    const existingId = dataRef.current.elementRowIdByConcept[conceptId];
    if (existingId) {
      const { error } = await supabase
        .from("elements")
        .update({ body_copy: JSON.stringify(e) })
        .eq("id", existingId);
      if (error) throw error;
      return existingId;
    } else {
      const newId = uid();
      const { error } = await supabase.from("elements").insert({
        id: newId,
        concept_id: conceptId,
        section_id: "__doc__",
        body_copy: JSON.stringify(e),
      });
      if (error) throw error;
      setData((d) => ({
        ...d,
        elementRowIdByConcept: { ...d.elementRowIdByConcept, [conceptId]: newId },
      }));
      return newId;
    }
  };

  const saveElements = useCallback(async (conceptId: string, e: LandingPageElements) => {
    if (dataRef.current.user) {
      await upsertElementsRow(conceptId, e);
    }
    setData((d) => ({ ...d, elements: { ...d.elements, [conceptId]: e } }));
    bump();
  }, [bump]);

  const persistImagesToDb = useCallback(
    async (conceptId: string, imgs: GeneratedImagePreview[]) => {
      let elemId = dataRef.current.elementRowIdByConcept[conceptId];
      if (!elemId) {
        const existing = dataRef.current.elements[conceptId];
        if (existing) {
          elemId = await upsertElementsRow(conceptId, existing);
        } else {
          elemId = uid();
          const { error } = await supabase.from("elements").insert({
            id: elemId,
            concept_id: conceptId,
            section_id: "__doc__",
            body_copy: null,
          });
          if (error) throw error;
          setData((d) => ({
            ...d,
            elementRowIdByConcept: { ...d.elementRowIdByConcept, [conceptId]: elemId! },
          }));
        }
      }
      return elemId!;
    },
    [],
  );

  const saveImages = useCallback(async (conceptId: string, imgs: GeneratedImagePreview[]) => {
    // Merge with existing so bulk regen never wipes another section's image.
    const existing = dataRef.current.images[conceptId] ?? [];
    const bySection: Record<string, GeneratedImagePreview> = {};
    existing.forEach((i) => (bySection[i.sectionId] = i));
    imgs.forEach((im) => {
      const prev = bySection[im.sectionId];
      if (prev && prev.realUrl && prev.status === "real") {
        bySection[im.sectionId] = { ...im, realUrl: prev.realUrl, status: "real" as const };
      } else if (im.status === "failed" && prev?.previewUrl) {
        bySection[im.sectionId] = { ...prev, status: "failed" as const };
      } else {
        bySection[im.sectionId] = im;
      }
    });
    const order = new Map<string, number>();
    [...existing, ...imgs].forEach((im, index) => {
      if (!order.has(im.sectionId)) order.set(im.sectionId, index);
    });
    const merged = Object.values(bySection).sort(
      (a, b) => (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0),
    );
    if (dataRef.current.user) {
      const elemId = await persistImagesToDb(conceptId, merged);
      const { error: delErr } = await supabase
        .from("image_previews")
        .delete()
        .eq("element_id", elemId);
      if (delErr) throw delErr;
      if (merged.length > 0) {
        const rows = merged.map((im) => ({
          element_id: elemId,
          preview_url: im.previewUrl,
          status: im.status,
          metadata: {
            sectionId: im.sectionId,
            imagePrompt: im.imagePrompt,
            imageStyle: im.imageStyle,
            imageMode: im.imageMode,
            category: im.category,
            realUrl: im.realUrl,
            placeholderLabel: im.placeholderLabel,
          },
        }));
        const { error: insErr } = await supabase.from("image_previews").insert(rows);
        if (insErr) throw insErr;
      }
    }
    setData((d) => ({ ...d, images: { ...d.images, [conceptId]: merged } }));
    bump();
  }, [bump, persistImagesToDb]);

  const updateImageForSection = useCallback(
    (conceptId: string, sectionId: string, patch: Partial<GeneratedImagePreview>) => {
      const current = dataRef.current.images[conceptId] ?? [];
      const idx = current.findIndex((i) => i.sectionId === sectionId);
      let next: GeneratedImagePreview[];
      if (idx >= 0) {
        next = current.map((i, k) => (k === idx ? { ...i, ...patch } : i));
      } else {
        next = [
          ...current,
          {
            sectionId,
            imagePrompt: "",
            imageStyle: "",
            previewUrl: "",
            status: "generated",
            ...patch,
          } as GeneratedImagePreview,
        ];
      }
      setData((d) => ({ ...d, images: { ...d.images, [conceptId]: next } }));
      bump();
      if (dataRef.current.user) {
        (async () => {
          const elemId = await persistImagesToDb(conceptId, next);
          const merged = next.find((i) => i.sectionId === sectionId)!;
          // Remove any existing row for this section, then insert the fresh one.
          const { error: delErr } = await supabase
            .from("image_previews")
            .delete()
            .eq("element_id", elemId)
            .eq("metadata->>sectionId", sectionId);
          if (delErr) throw delErr;
          const { error: insErr } = await supabase.from("image_previews").insert({
            element_id: elemId,
            preview_url: merged.previewUrl,
            status: merged.status,
            metadata: {
              sectionId: merged.sectionId,
              imagePrompt: merged.imagePrompt,
              imageStyle: merged.imageStyle,
              imageMode: merged.imageMode,
              category: merged.category,
              realUrl: merged.realUrl,
              placeholderLabel: merged.placeholderLabel,
            },
          });
          if (insErr) throw insErr;
        })().catch((err) => console.error("updateImageForSection db", err));
      }
    },
    [bump, persistImagesToDb],
  );

  const persistVisualProfilePatch = useCallback(
    async (projectId: string, patch: Record<string, unknown>) => {
      const { data: rows, error: selErr } = await supabase
        .from("product_visual_profiles")
        .select("id")
        .eq("project_id", projectId)
        .limit(1);
      if (selErr) throw selErr;
      if ((rows ?? []).length > 0) {
        const { error } = await supabase
          .from("product_visual_profiles")
          .update(patch as any)
          .eq("project_id", projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_visual_profiles").insert({
          project_id: projectId,
          ...(patch as any),
        });
        if (error) throw error;
      }
    },
    [],
  );

  const saveProductImages = useCallback(
    async (projectId: string, imgs: ProductImageRef[]) => {
      if (dataRef.current.user) {
        await persistVisualProfilePatch(projectId, { source_image_urls: imgs as any });
      }
      setData((d) => ({
        ...d,
        productImages: { ...d.productImages, [projectId]: imgs },
        productImageCount: { ...d.productImageCount, [projectId]: imgs.length },
      }));
      bump();
    },
    [bump, persistVisualProfilePatch],
  );

  const loadProductImages = useCallback(
    async (projectId: string): Promise<ProductImageRef[]> => {
      if (!dataRef.current.user) return dataRef.current.productImages[projectId] ?? [];
      const { data: rows, error } = await supabase
        .from("product_visual_profiles")
        .select("source_image_urls")
        .eq("project_id", projectId)
        .limit(1);
      if (error) {
        console.error("loadProductImages db", error);
        return dataRef.current.productImages[projectId] ?? [];
      }
      const row = (rows ?? [])[0] as any;
      const imgs = ((row?.source_image_urls as any) ?? []) as ProductImageRef[];
      setData((d) => ({
        ...d,
        productImages: { ...d.productImages, [projectId]: imgs },
        productImageCount: { ...d.productImageCount, [projectId]: imgs.length },
      }));
      return imgs;
    },
    [],
  );

  const saveVisualProfile = useCallback(
    async (projectId: string, p: ProductVisualProfile | null) => {
      if (dataRef.current.user) {
        await persistVisualProfilePatch(projectId, {
          profile: p as any,
          description: p?.productType ?? null,
        });
      }
      setData((d) => ({ ...d, visualProfile: { ...d.visualProfile, [projectId]: p } }));
      bump();
    },
    [bump, persistVisualProfilePatch],
  );

  const importLegacyData = useCallback(async () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      setLegacyImportPending(false);
      return;
    }
    const user = dataRef.current.user;
    if (!user) return;
    try {
      const parsed = JSON.parse(raw);
      // Import workspaces
      for (const ws of parsed.workspaces ?? []) {
        await supabase.from("brands").insert({
          id: ws.id,
          user_id: user.id,
          name: ws.name,
          description: ws.brandDescription,
          primary_audience: ws.primaryAudience,
          brand_voice: ws.brandVoice ?? [],
        });
      }
      for (const proj of parsed.projects ?? []) {
        const product = (parsed.products ?? []).find(
          (pr: Product) => pr.id === proj.productId,
        );
        const row = projectToRow({ ...proj }, product);
        await supabase.from("projects").insert(row);
      }
      const conceptRows = (parsed.concepts ?? []).map((c: LandingPageConcept) => ({
        id: c.id,
        project_id: c.projectId,
        framework_name: c.templateFamily,
        concept_data: c as any,
      }));
      if (conceptRows.length > 0) {
        await supabase.from("concepts").insert(conceptRows);
      }
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      setLegacyImportPending(false);
      await loadUserData(user);
    } catch (err) {
      console.error("importLegacyData", err);
      throw err;
    }
  }, [loadUserData]);

  const dismissLegacyImport = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    setLegacyImportPending(false);
  }, []);

  const value: StoreContextValue = {
    ...data,
    activeWorkspace,
    signUp,
    signInWithPassword,
    signOut,
    createWorkspace,
    setActiveWorkspace,
    createProduct,
    createProject,
    updateProjectBrief,
    updateWorkspaceDescription,
    saveConcepts,
    saveConceptsAsync,
    updateConceptSection,
    updateSectionBullets,
    isFieldEdited: (conceptId, path) =>
      !!(data.elementEditedFields[conceptId]?.[path]),
    getEditedFields: (conceptId) => data.elementEditedFields[conceptId] ?? {},
    getFieldSaveError: (conceptId, path) =>
      data.elementSaveErrors[conceptId]?.[path],
    deleteProject,
    deleteWorkspace,
    enableConceptShare,
    disableConceptShare,
    version,
    legacyImportPending,
    importLegacyData,
    dismissLegacyImport,
    getResearch: (id) => data.research[id] ?? null,
    saveResearch,
    getElements: (id) => data.elements[id] ?? null,
    saveElements,
    getImages: (id) => data.images[id] ?? [],
    saveImages,
    updateImageForSection,
    getProductImages: (id) => data.productImages[id] ?? [],
    saveProductImages,
    loadProductImages,
    getProductImageCount: (id) => data.productImageCount[id] ?? 0,
    getVisualProfile: (id) => data.visualProfile[id] ?? null,
    saveVisualProfile,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
