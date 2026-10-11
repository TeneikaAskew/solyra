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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      insight_research_messages: {
        Row: {
          answer: Json | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          owner_uid: string
          question: string | null
          role: string
          run_state: string
          session_id: string
        }
        Insert: {
          answer?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          owner_uid: string
          question?: string | null
          role: string
          run_state: string
          session_id: string
        }
        Update: {
          answer?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          owner_uid?: string
          question?: string | null
          role?: string
          run_state?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_research_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "insight_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_research_runs: {
        Row: {
          evidence_count: number
          failure_class: string | null
          finished_at: string | null
          gateway_run_id: string | null
          id: string
          message_id: string
          model_id: string
          owner_uid: string
          session_id: string
          started_at: string
          status: string
        }
        Insert: {
          evidence_count?: number
          failure_class?: string | null
          finished_at?: string | null
          gateway_run_id?: string | null
          id?: string
          message_id: string
          model_id: string
          owner_uid: string
          session_id: string
          started_at?: string
          status: string
        }
        Update: {
          evidence_count?: number
          failure_class?: string | null
          finished_at?: string | null
          gateway_run_id?: string | null
          id?: string
          message_id?: string
          model_id?: string
          owner_uid?: string
          session_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_research_runs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "insight_research_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_research_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "insight_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_research_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string
          owner_uid: string
          replay_cutoff: string | null
          status: string
          ticker: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          owner_uid: string
          replay_cutoff?: string | null
          status?: string
          ticker: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          owner_uid?: string
          replay_cutoff?: string | null
          status?: string
          ticker?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      insight_research_sources: {
        Row: {
          citation_id: string
          created_at: string
          excerpt: string | null
          freshness: string
          id: string
          message_id: string
          metadata: Json
          owner_uid: string
          payload_hash: string
          session_id: string
          source_as_of: string | null
          source_label: string
          source_type: string
          source_url: string
        }
        Insert: {
          citation_id: string
          created_at?: string
          excerpt?: string | null
          freshness: string
          id?: string
          message_id: string
          metadata?: Json
          owner_uid: string
          payload_hash: string
          session_id: string
          source_as_of?: string | null
          source_label: string
          source_type: string
          source_url: string
        }
        Update: {
          citation_id?: string
          created_at?: string
          excerpt?: string | null
          freshness?: string
          id?: string
          message_id?: string
          metadata?: Json
          owner_uid?: string
          payload_hash?: string
          session_id?: string
          source_as_of?: string | null
          source_label?: string
          source_type?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_research_sources_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "insight_research_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_research_sources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "insight_research_sessions"
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
