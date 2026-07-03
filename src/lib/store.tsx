import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { storage } from "./storage";

interface AppData {
  user: User | null;
  workspaces: Workspace[];
  products: Product[];
  projects: Project[];
  concepts: LandingPageConcept[];
  activeWorkspaceId: string | null;
}

const STORAGE_KEY = "landing-page-ai-v1";

const empty: AppData = {
  user: null,
  workspaces: [],
  products: [],
  projects: [],
  concepts: [],
  activeWorkspaceId: null,
};

function load(): AppData {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<AppData>) };
  } catch {
    return empty;
  }
}

function save(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface StoreContextValue extends AppData {
  signIn: (email: string, name?: string) => User;
  signOut: () => void;
  createWorkspace: (
    input: Omit<Workspace, "id" | "ownerId" | "createdAt">,
  ) => Workspace;
  setActiveWorkspace: (id: string) => void;
  createProduct: (
    input: Omit<Product, "id" | "createdAt">,
  ) => Product;
  createProject: (
    input: Omit<Project, "id" | "createdAt">,
  ) => Project;
  saveConcepts: (projectId: string, concepts: LandingPageConcept[]) => void;
  updateConceptSection: (
    conceptId: string,
    sectionId: string,
    patch: Partial<import("@/types").SectionProps>,
  ) => void;
  deleteProject: (projectId: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  activeWorkspace: Workspace | null;
  // Research / elements / images (persisted via storage helper)
  getResearch: (projectId: string) => ProjectResearch | null;
  saveResearch: (projectId: string, r: ProjectResearch) => void;
  getElements: (conceptId: string) => LandingPageElements | null;
  saveElements: (conceptId: string, e: LandingPageElements) => void;
  getImages: (conceptId: string) => GeneratedImagePreview[];
  saveImages: (conceptId: string, imgs: GeneratedImagePreview[]) => void;
  getProductImages: (projectId: string) => ProductImageRef[];
  saveProductImages: (projectId: string, imgs: ProductImageRef[]) => void;
  getVisualProfile: (projectId: string) => ProductVisualProfile | null;
  saveVisualProfile: (projectId: string, p: ProductVisualProfile | null) => void;
  // For dashboard status
  version: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(data);
  }, [data, hydrated]);

  const signIn = useCallback((email: string, name?: string): User => {
    const user: User = {
      id: uid(),
      email,
      name: name ?? email.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, user }));
    return user;
  }, []);

  const signOut = useCallback(() => {
    setData(empty);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const createWorkspace = useCallback<StoreContextValue["createWorkspace"]>(
    (input) => {
      const ws: Workspace = {
        ...input,
        id: uid(),
        ownerId: "self",
        createdAt: new Date().toISOString(),
      };
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

  const createProduct = useCallback<StoreContextValue["createProduct"]>(
    (input) => {
      const p: Product = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, products: [...d.products, p] }));
      return p;
    },
    [],
  );

  const createProject = useCallback<StoreContextValue["createProject"]>(
    (input) => {
      const p: Project = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, projects: [...d.projects, p] }));
      return p;
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
    },
    [],
  );

  const updateConceptSection = useCallback<StoreContextValue["updateConceptSection"]>(
    (conceptId, sectionId, patch) => {
      setData((d) => ({
        ...d,
        concepts: d.concepts.map((c) => {
          if (c.id !== conceptId) return c;
          const sections = c.schema.sections.map((s) =>
            s.id === sectionId ? { ...s, ...patch } : s,
          );
          return { ...c, schema: { ...c.schema, sections } };
        }),
      }));
    },
    [],
  );

  const deleteProject = useCallback((projectId: string) => {
    setData((d) => {
      const conceptIds = d.concepts.filter((c) => c.projectId === projectId).map((c) => c.id);
      conceptIds.forEach((id) => storage.clearConcept(id));
      storage.clearProject(projectId);
      return {
        ...d,
        projects: d.projects.filter((p) => p.id !== projectId),
        concepts: d.concepts.filter((c) => c.projectId !== projectId),
      };
    });
  }, []);

  const deleteWorkspace = useCallback((workspaceId: string) => {
    setData((d) => {
      const projs = d.projects.filter((p) => p.workspaceId === workspaceId);
      projs.forEach((p) => {
        const conceptIds = d.concepts.filter((c) => c.projectId === p.id).map((c) => c.id);
        conceptIds.forEach((id) => storage.clearConcept(id));
        storage.clearProject(p.id);
      });
      const remaining = d.workspaces.filter((w) => w.id !== workspaceId);
      return {
        ...d,
        workspaces: remaining,
        products: d.products.filter((pr) => pr.workspaceId !== workspaceId),
        projects: d.projects.filter((p) => p.workspaceId !== workspaceId),
        concepts: d.concepts.filter(
          (c) => !projs.some((p) => p.id === c.projectId),
        ),
        activeWorkspaceId:
          d.activeWorkspaceId === workspaceId
            ? remaining[0]?.id ?? null
            : d.activeWorkspaceId,
      };
    });
  }, []);

  const activeWorkspace = useMemo(
    () => data.workspaces.find((w) => w.id === data.activeWorkspaceId) ?? null,
    [data.workspaces, data.activeWorkspaceId],
  );

  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value: StoreContextValue = {
    ...data,
    activeWorkspace,
    signIn,
    signOut,
    createWorkspace,
    setActiveWorkspace,
    createProduct,
    createProject,
    saveConcepts,
    updateConceptSection,
    deleteProject,
    deleteWorkspace,
    version,
    getResearch: (id) => storage.loadResearch(id),
    saveResearch: (id, r) => {
      storage.saveResearch(id, r);
      bump();
    },
    getElements: (id) => storage.loadElements(id),
    saveElements: (id, e) => {
      storage.saveElements(id, e);
      bump();
    },
    getImages: (id) => storage.loadImages(id),
    saveImages: (id, imgs) => {
      storage.saveImages(id, imgs);
      bump();
    },
    getProductImages: (id) => storage.loadProductImages(id),
    saveProductImages: (id, imgs) => {
      storage.saveProductImages(id, imgs);
      bump();
    },
    getVisualProfile: (id) => storage.loadVisualProfile(id),
    saveVisualProfile: (id, p) => {
      storage.saveVisualProfile(id, p);
      bump();
    },
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
