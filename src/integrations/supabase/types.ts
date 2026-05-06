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
      analysts: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string
          watermark_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string
          watermark_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string
          watermark_text?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          assigned_term_id: string | null
          assigned_to: string | null
          brand: string
          client_id: string
          created_at: string
          id: string
          is_legacy: boolean
          legacy_delivered_at: string | null
          legacy_user_email: string | null
          legacy_user_name: string | null
          model: string
          observations: string | null
          patrimony: string | null
          serial_number: string
          status: Database["public"]["Enums"]["equipment_status"]
          type: string
          updated_at: string
        }
        Insert: {
          assigned_term_id?: string | null
          assigned_to?: string | null
          brand: string
          client_id?: string
          created_at?: string
          id?: string
          is_legacy?: boolean
          legacy_delivered_at?: string | null
          legacy_user_email?: string | null
          legacy_user_name?: string | null
          model: string
          observations?: string | null
          patrimony?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["equipment_status"]
          type: string
          updated_at?: string
        }
        Update: {
          assigned_term_id?: string | null
          assigned_to?: string | null
          brand?: string
          client_id?: string
          created_at?: string
          id?: string
          is_legacy?: boolean
          legacy_delivered_at?: string | null
          legacy_user_email?: string | null
          legacy_user_name?: string | null
          model?: string
          observations?: string | null
          patrimony?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["equipment_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_term"
            columns: ["assigned_term_id"]
            isOneToOne: false
            referencedRelation: "responsibility_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibility_terms: {
        Row: {
          analyst_id: string
          analyst_name: string
          client_id: string
          collaborator_name: string
          created_at: string
          equipment_description: string
          equipment_id: string | null
          id: string
          patrimony: string | null
          returned_at: string | null
          returned_by: string | null
          serial_number: string
          status: Database["public"]["Enums"]["term_status"]
          term_text: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          analyst_id: string
          analyst_name: string
          client_id?: string
          collaborator_name: string
          created_at?: string
          equipment_description: string
          equipment_id?: string | null
          id?: string
          patrimony?: string | null
          returned_at?: string | null
          returned_by?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["term_status"]
          term_text: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          analyst_id?: string
          analyst_name?: string
          client_id?: string
          collaborator_name?: string
          created_at?: string
          equipment_description?: string
          equipment_id?: string | null
          id?: string
          patrimony?: string | null
          returned_at?: string | null
          returned_by?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["term_status"]
          term_text?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_terms_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "analysts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsibility_terms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsibility_terms_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          client_id: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          client_id?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          client_id?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          client_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_client_id: { Args: { _uid: string }; Returns: string }
      is_auksys_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      equipment_status:
        | "disponivel"
        | "entregue"
        | "em_manutencao"
        | "reservado"
        | "baixado"
      equipment_type:
        | "notebook"
        | "mouse"
        | "teclado"
        | "projetor"
        | "workstation"
        | "monitor"
        | "tablet"
        | "celular"
        | "outros"
      term_status:
        | "pendente"
        | "enviado_para_assinatura"
        | "fechado"
        | "cancelado"
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
    Enums: {
      equipment_status: [
        "disponivel",
        "entregue",
        "em_manutencao",
        "reservado",
        "baixado",
      ],
      equipment_type: [
        "notebook",
        "mouse",
        "teclado",
        "projetor",
        "workstation",
        "monitor",
        "tablet",
        "celular",
        "outros",
      ],
      term_status: [
        "pendente",
        "enviado_para_assinatura",
        "fechado",
        "cancelado",
      ],
    },
  },
} as const
