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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          activity_date: string
          activity_type: string | null
          call_duration: number | null
          call_outcome: string | null
          client_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          hubspot_engagement_id: string | null
          id: string
          is_sql: boolean | null
          meeting_held: boolean | null
          meeting_scheduled_date: string | null
          recording_url: string | null
          remarks: string | null
          sdr_name: string | null
        }
        Insert: {
          activity_date: string
          activity_type?: string | null
          call_duration?: number | null
          call_outcome?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          is_sql?: boolean | null
          meeting_held?: boolean | null
          meeting_scheduled_date?: string | null
          recording_url?: string | null
          remarks?: string | null
          sdr_name?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string | null
          call_duration?: number | null
          call_outcome?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          is_sql?: boolean | null
          meeting_held?: boolean | null
          meeting_scheduled_date?: string | null
          recording_url?: string | null
          remarks?: string | null
          sdr_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      clients: {
        Row: {
          banner_gradient: string | null
          banner_url: string | null
          campaign_end: string | null
          campaign_start: string | null
          client_id: string
          client_name: string
          created_at: string | null
          hubspot_list_pattern: string | null
          id: string
          logo_url: string | null
          status: string | null
          target_sqls: number | null
          updated_at: string | null
        }
        Insert: {
          banner_gradient?: string | null
          banner_url?: string | null
          campaign_end?: string | null
          campaign_start?: string | null
          client_id: string
          client_name: string
          created_at?: string | null
          hubspot_list_pattern?: string | null
          id?: string
          logo_url?: string | null
          status?: string | null
          target_sqls?: number | null
          updated_at?: string | null
        }
        Update: {
          banner_gradient?: string | null
          banner_url?: string | null
          campaign_end?: string | null
          campaign_start?: string | null
          client_id?: string
          client_name?: string
          created_at?: string | null
          hubspot_list_pattern?: string | null
          id?: string
          logo_url?: string | null
          status?: string | null
          target_sqls?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          answer_rate: number | null
          answered: number | null
          attendance: string | null
          busy_signals: number | null
          calls_to_dm_rate: number | null
          client_id: string | null
          created_at: string | null
          dials: number | null
          dm_to_sql_rate: number | null
          dms_reached: number | null
          id: string
          mqls: number | null
          no_answers: number | null
          sdr_name: string | null
          snapshot_date: string
          sqls: number | null
          updated_at: string | null
          voicemails: number | null
        }
        Insert: {
          answer_rate?: number | null
          answered?: number | null
          attendance?: string | null
          busy_signals?: number | null
          calls_to_dm_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          dials?: number | null
          dm_to_sql_rate?: number | null
          dms_reached?: number | null
          id?: string
          mqls?: number | null
          no_answers?: number | null
          sdr_name?: string | null
          snapshot_date: string
          sqls?: number | null
          updated_at?: string | null
          voicemails?: number | null
        }
        Update: {
          answer_rate?: number | null
          answered?: number | null
          attendance?: string | null
          busy_signals?: number | null
          calls_to_dm_rate?: number | null
          client_id?: string | null
          created_at?: string | null
          dials?: number | null
          dm_to_sql_rate?: number | null
          dms_reached?: number | null
          id?: string
          mqls?: number | null
          no_answers?: number | null
          sdr_name?: string | null
          snapshot_date?: string
          sqls?: number | null
          updated_at?: string | null
          voicemails?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      hubspot_lists: {
        Row: {
          client_id: string | null
          contact_count: number | null
          created_at: string | null
          created_in_hubspot: string | null
          id: string
          last_synced: string | null
          list_id: string
          list_name: string
          list_number: number | null
          sdr_name: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          created_in_hubspot?: string | null
          id?: string
          last_synced?: string | null
          list_id: string
          list_name: string
          list_number?: number | null
          sdr_name?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          created_in_hubspot?: string | null
          id?: string
          last_synced?: string | null
          list_id?: string
          list_name?: string
          list_number?: number | null
          sdr_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_lists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          report_content: Json | null
          report_emails: string | null
          report_frequency: string | null
          send_date: string | null
          send_day: string | null
          send_time: string | null
          slack_webhook_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_content?: Json | null
          report_emails?: string | null
          report_frequency?: string | null
          send_date?: string | null
          send_day?: string | null
          send_time?: string | null
          slack_webhook_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_content?: Json | null
          report_emails?: string | null
          report_frequency?: string | null
          send_date?: string | null
          send_day?: string | null
          send_time?: string | null
          slack_webhook_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sql_meetings: {
        Row: {
          booking_date: string
          client_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_person: string
          created_at: string | null
          edited_in_dashboard: boolean | null
          hubspot_deal_id: string | null
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          meeting_date: string | null
          meeting_held: boolean | null
          remarks: string | null
          sdr_name: string | null
        }
        Insert: {
          booking_date: string
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person: string
          created_at?: string | null
          edited_in_dashboard?: boolean | null
          hubspot_deal_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meeting_date?: string | null
          meeting_held?: boolean | null
          remarks?: string | null
          sdr_name?: string | null
        }
        Update: {
          booking_date?: string
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person?: string
          created_at?: string | null
          edited_in_dashboard?: boolean | null
          hubspot_deal_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meeting_date?: string | null
          meeting_held?: boolean | null
          remarks?: string | null
          sdr_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sql_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      team_members: {
        Row: {
          client_id: string | null
          created_at: string | null
          email: string
          hubspot_owner_id: string | null
          id: string
          profile_photo_url: string | null
          role: string | null
          sdr_first_name: string | null
          sdr_name: string
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          email: string
          hubspot_owner_id?: string | null
          id?: string
          profile_photo_url?: string | null
          role?: string | null
          sdr_first_name?: string | null
          sdr_name: string
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          email?: string
          hubspot_owner_id?: string | null
          id?: string
          profile_photo_url?: string | null
          role?: string | null
          sdr_first_name?: string | null
          sdr_name?: string
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
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
