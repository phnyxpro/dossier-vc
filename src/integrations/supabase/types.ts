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
          user_id: string
        }
        Insert: {
          amount_sought?: number | null
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
          user_id: string
        }
        Update: {
          amount_sought?: number | null
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
    Enums: {},
  },
} as const
