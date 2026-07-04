import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBrands from "./tools/list-brands";
import listProjects from "./tools/list-projects";
import getProject from "./tools/get-project";
import listConcepts from "./tools/list-concepts";
import getConcept from "./tools/get-concept";

// The OAuth issuer MUST be the direct Supabase host, not a proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time; the sentinel
// keeps discovery well-formed if the literal is missing during manifest extract.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "landing-page-ai-mcp",
  title: "Landing Page AI",
  version: "0.1.0",
  instructions:
    "Read-only access to your Landing Page AI workspace: brands, projects, and generated landing-page concepts. Use `list_brands` to start, then drill into a brand's projects and each project's concepts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBrands, listProjects, getProject, listConcepts, getConcept],
});
