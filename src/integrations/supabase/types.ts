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
      capital_requests: {
        Row: {
          amount_sought: number | null
          business_overview: string | null
          company_id: string | null
          created_at: string
          currency: string
          current_step: number
          existing_debt: number | null
          financing_subtype: string | null
          id: string
          is_demo: boolean
          purpose: string | null
          readiness_status: string
          reference: string
          repayment_explanation: string | null
          repayment_primary: string | null
          repayment_secondary: string | null
          request_type: string
          security_description: string | null
          status: string
          term_unit: string | null
          term_value: number | null
          updated_at: string
          use_of_funds: string | null
          user_id: string
        }
        Insert: {
          amount_sought?: number | null
          business_overview?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          current_step?: number
          existing_debt?: number | null
          financing_subtype?: string | null
          id?: string
          is_demo?: boolean
          purpose?: string | null
          readiness_status?: string
          reference: string
          repayment_explanation?: string | null
          repayment_primary?: string | null
          repayment_secondary?: string | null
          request_type?: string
          security_description?: string | null
          status?: string
          term_unit?: string | null
          term_value?: number | null
          updated_at?: string
          use_of_funds?: string | null
          user_id: string
        }
        Update: {
          amount_sought?: number | null
          business_overview?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          current_step?: number
          existing_debt?: number | null
          financing_subtype?: string | null
          id?: string
          is_demo?: boolean
          purpose?: string | null
          readiness_status?: string
          reference?: string
          repayment_explanation?: string | null
          repayment_primary?: string | null
          repayment_secondary?: string | null
          request_type?: string
          security_description?: string | null
          status?: string
          term_unit?: string | null
          term_value?: number | null
          updated_at?: string
          use_of_funds?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          annual_revenue: number | null
          country: string
          created_at: string
          currency: string
          id: string
          industry: string | null
          is_demo: boolean
          name: string
          updated_at: string
          user_id: string
          years_in_operation: number | null
        }
        Insert: {
          annual_revenue?: number | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          industry?: string | null
          is_demo?: boolean
          name: string
          updated_at?: string
          user_id: string
          years_in_operation?: number | null
        }
        Update: {
          annual_revenue?: number | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          industry?: string | null
          is_demo?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          years_in_operation?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          extraction_error: string | null
          extraction_status: string
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          request_id: string
          size_bytes: number | null
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          request_id: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          request_id?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          section_key: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          request_id: string
          section_key: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          section_key?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_sections_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_shares: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          invited_email: string | null
          owner_id: string
          provider_id: string | null
          provider_org: string | null
          request_id: string
          revoked_at: string | null
          share_code: string
          status: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          owner_id: string
          provider_id?: string | null
          provider_org?: string | null
          request_id: string
          revoked_at?: string | null
          share_code: string
          status?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          owner_id?: string
          provider_id?: string | null
          provider_org?: string | null
          request_id?: string
          revoked_at?: string | null
          share_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_shares_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_fields: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string | null
          field_key: string
          field_label: string
          id: string
          origin: string
          period: string | null
          request_id: string
          source_excerpt: string | null
          status: string
          unit: string | null
          updated_at: string
          user_id: string
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id?: string | null
          field_key: string
          field_label: string
          id?: string
          origin?: string
          period?: string | null
          request_id: string
          source_excerpt?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id: string
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string | null
          field_key?: string
          field_label?: string
          id?: string
          origin?: string
          period?: string | null
          request_id?: string
          source_excerpt?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_fields_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_fields_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_key: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document_key: string
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document_key?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_review_scores: {
        Row: {
          created_at: string
          documentation: number | null
          financials: number | null
          id: string
          management: number | null
          private_comment: string
          provider_id: string
          review_id: string
          security: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          documentation?: number | null
          financials?: number | null
          id?: string
          management?: number | null
          private_comment?: string
          provider_id: string
          review_id: string
          security?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          documentation?: number | null
          financials?: number | null
          id?: string
          management?: number | null
          private_comment?: string
          provider_id?: string
          review_id?: string
          security?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_review_scores_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "provider_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_reviews: {
        Row: {
          closed: boolean
          closed_at: string | null
          created_at: string
          id: string
          notes: string
          owner_id: string
          provider_id: string
          provider_org: string | null
          request_id: string
          requested_docs: string[]
          share_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          closed?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          owner_id: string
          provider_id: string
          provider_org?: string | null
          request_id: string
          requested_docs?: string[]
          share_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          closed?: boolean
          closed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          owner_id?: string
          provider_id?: string
          provider_org?: string | null
          request_id?: string
          requested_docs?: string[]
          share_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_reviews_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: true
            referencedRelation: "dossier_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_notes: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          id: string
          request_id: string
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          request_id: string
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          request_id?: string
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "business" | "provider"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["business", "provider"],
    },
  },
} as const
