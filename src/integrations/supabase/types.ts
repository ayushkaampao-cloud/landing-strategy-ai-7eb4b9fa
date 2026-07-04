export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          brand_voice: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          primary_audience: string | null
          user_id: string
        }
        Insert: {
          brand_voice?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          primary_audience?: string | null
          user_id: string
        }
        Update: {
          brand_voice?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          primary_audience?: string | null
          user_id?: string
        }
        Relationships: []
      }
      concepts: {
        Row: {
          concept_data: Json
          created_at: string
          framework_name: string
          id: string
          project_id: string
        }
        Insert: {
          concept_data: Json
          created_at?: string
          framework_name: string
          id?: string
          project_id: string
        }
        Update: {
          concept_data?: Json
          created_at?: string
          framework_name?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      elements: {
        Row: {
          body_copy: string | null
          bullets: Json | null
          concept_id: string
          created_at: string
          cta_label: string | null
          headline: string | null
          id: string
          image_mode: string | null
          image_prompt: string | null
          is_edited: boolean
          negative_prompt: string | null
          section_id: string
          subheadline: string | null
        }
        Insert: {
          body_copy?: string | null
          bullets?: Json | null
          concept_id: string
          created_at?: string
          cta_label?: string | null
          headline?: string | null
          id?: string
          image_mode?: string | null
          image_prompt?: string | null
          is_edited?: boolean
          negative_prompt?: string | null
          section_id: string
          subheadline?: string | null
        }
        Update: {
          body_copy?: string | null
          bullets?: Json | null
          concept_id?: string
          created_at?: string
          cta_label?: string | null
          headline?: string | null
          id?: string
          image_mode?: string | null
          image_prompt?: string | null
          is_edited?: boolean
          negative_prompt?: string | null
          section_id?: string
          subheadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elements_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      image_previews: {
        Row: {
          created_at: string
          element_id: string
          id: string
          metadata: Json | null
          preview_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          element_id: string
          id?: string
          metadata?: Json | null
          preview_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          element_id?: string
          id?: string
          metadata?: Json | null
          preview_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_previews_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
      product_visual_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_count: number | null
          profile: Json | null
          project_id: string
          source_image_urls: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_count?: number | null
          profile?: Json | null
          project_id: string
          source_image_urls?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_count?: number | null
          profile?: Json | null
          project_id?: string
          source_image_urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_visual_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_id: string
          classification: Json | null
          competitor: string | null
          created_at: string
          desired_angle: string | null
          goal: string | null
          id: string
          key_benefits: string | null
          key_features: string | null
          landing_page_url: string | null
          main_problem: string | null
          notes: string | null
          objections: string | null
          price_info: string | null
          product_description: string | null
          product_name: string | null
          product_url: string | null
          project_name: string
          research: Json | null
          site_url: string | null
          source_mode: string | null
          tone: string | null
        }
        Insert: {
          brand_id: string
          classification?: Json | null
          competitor?: string | null
          created_at?: string
          desired_angle?: string | null
          goal?: string | null
          id?: string
          key_benefits?: string | null
          key_features?: string | null
          landing_page_url?: string | null
          main_problem?: string | null
          notes?: string | null
          objections?: string | null
          price_info?: string | null
          product_description?: string | null
          product_name?: string | null
          product_url?: string | null
          project_name: string
          research?: Json | null
          site_url?: string | null
          source_mode?: string | null
          tone?: string | null
        }
        Update: {
          brand_id?: string
          classification?: Json | null
          competitor?: string | null
          created_at?: string
          desired_angle?: string | null
          goal?: string | null
          id?: string
          key_benefits?: string | null
          key_features?: string | null
          landing_page_url?: string | null
          main_problem?: string | null
          notes?: string | null
          objections?: string | null
          price_info?: string | null
          product_description?: string | null
          product_name?: string | null
          product_url?: string | null
          project_name?: string
          research?: Json | null
          site_url?: string | null
          source_mode?: string | null
          tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
