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
          client_notes: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          hubspot_contact_id: string | null
          hubspot_disposition: string | null
          hubspot_engagement_id: string | null
          id: string
          is_decision_maker: boolean | null
          is_sql: boolean | null
          meeting_held: boolean | null
          meeting_scheduled_date: string | null
          meeting_status: string | null
          recording_last_retry: string | null
          recording_retry_count: number | null
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
          client_notes?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_contact_id?: string | null
          hubspot_disposition?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          is_decision_maker?: boolean | null
          is_sql?: boolean | null
          meeting_held?: boolean | null
          meeting_scheduled_date?: string | null
          meeting_status?: string | null
          recording_last_retry?: string | null
          recording_retry_count?: number | null
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
          client_notes?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_contact_id?: string | null
          hubspot_disposition?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          is_decision_maker?: boolean | null
          is_sql?: boolean | null
          meeting_held?: boolean | null
          meeting_scheduled_date?: string | null
          meeting_status?: string | null
          recording_last_retry?: string | null
          recording_retry_count?: number | null
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
      client_contacts: {
        Row: {
          client_id: string
          contact_name: string
          contact_title: string | null
          contact_type: string | null
          created_at: string | null
          email: string | null
          id: string
          portal_access: boolean | null
          status: string | null
        }
        Insert: {
          client_id: string
          contact_name: string
          contact_title?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          portal_access?: boolean | null
          status?: string | null
        }
        Update: {
          client_id?: string
          contact_name?: string
          contact_title?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          portal_access?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
          report_send_days: Json | null
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
          report_send_days?: Json | null
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
          report_send_days?: Json | null
          send_date?: string | null
          send_day?: string | null
          send_time?: string | null
          slack_webhook_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sdr_action_items: {
        Row: {
          completed_date: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          sdr_name: string
          status: string
          title: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          sdr_name: string
          status?: string
          title: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          sdr_name?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      sdr_alert_log: {
        Row: {
          alerted_at: string
          created_at: string | null
          id: string
          resolved_at: string | null
          sdr_name: string
        }
        Insert: {
          alerted_at: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          sdr_name: string
        }
        Update: {
          alerted_at?: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          sdr_name?: string
        }
        Relationships: []
      }
      sdr_coaching_notes: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          sdr_name: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role: string
          content: string
          created_at?: string
          id?: string
          sdr_name: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          sdr_name?: string
        }
        Relationships: []
      }
      sql_meetings: {
        Row: {
          booking_date: string
          client_id: string | null
          client_notes: string | null
          company_name: string | null
          contact_email: string | null
          contact_person: string
          created_at: string | null
          edited_in_dashboard: boolean | null
          hubspot_contact_id: string | null
          hubspot_deal_id: string | null
          hubspot_engagement_id: string | null
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          meeting_date: string | null
          meeting_held: boolean | null
          meeting_status: string | null
          meeting_time: string | null
          parent_sql_id: string | null
          remarks: string | null
          sdr_name: string | null
        }
        Insert: {
          booking_date: string
          client_id?: string | null
          client_notes?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person: string
          created_at?: string | null
          edited_in_dashboard?: boolean | null
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meeting_date?: string | null
          meeting_held?: boolean | null
          meeting_status?: string | null
          meeting_time?: string | null
          parent_sql_id?: string | null
          remarks?: string | null
          sdr_name?: string | null
        }
        Update: {
          booking_date?: string
          client_id?: string | null
          client_notes?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person?: string
          created_at?: string | null
          edited_in_dashboard?: boolean | null
          hubspot_contact_id?: string | null
          hubspot_deal_id?: string | null
          hubspot_engagement_id?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          meeting_date?: string | null
          meeting_held?: boolean | null
          meeting_status?: string | null
          meeting_time?: string | null
          parent_sql_id?: string | null
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
          {
            foreignKeyName: "sql_meetings_parent_sql_id_fkey"
            columns: ["parent_sql_id"]
            isOneToOne: false
            referencedRelation: "sql_meetings"
            referencedColumns: ["id"]
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
          invite_expires_at: string | null
          invite_sent_at: string | null
          invite_status: string | null
          invite_token: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
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
      webhook_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_payload: Json | null
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          object_id: string
          processed_at: string | null
          property_name: string | null
          property_value: string | null
          status: string | null
          subscription_type: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_payload?: Json | null
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          object_id: string
          processed_at?: string | null
          property_name?: string | null
          property_value?: string | null
          status?: string | null
          subscription_type?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_payload?: Json | null
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          object_id?: string
          processed_at?: string | null
          property_name?: string | null
          property_value?: string | null
          status?: string | null
          subscription_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_health_check: {
        Args: never
        Returns: {
          current_value: string
          health_status: string
          metric: string
        }[]
      }
      get_activity_breakdown: {
        Args: { p_client_id?: string; p_end_date: string; p_start_date: string }
        Returns: {
          answered: number
          client_id: string
          dials: number
          dm_conversations: number
          sdr_name: string
          sqls: number
        }[]
      }
      get_client_performance: {
        Args: never
        Returns: {
          answer_rate: number
          answered: number
          campaign_end: string
          campaign_start: string
          client_id: string
          client_name: string
          dials: number
          dm_conversations: number
          logo_url: string
          sqls: number
          target_sqls: number
        }[]
      }
      get_contact_auth_info: {
        Args: { p_client_id: string }
        Returns: {
          email: string
          invite_expires_at: string
          invite_sent_at: string
          last_sign_in_at: string
        }[]
      }
      get_daily_activity: {
        Args: { p_client_id?: string; p_end_date: string; p_start_date: string }
        Returns: {
          activity_day: string
          answered: number
          dials: number
          dm_conversations: number
        }[]
      }
      get_invite_records: {
        Args: never
        Returns: {
          client_id: string
          email: string
          id: string
          invite_expires_at: string
          invite_sent_at: string
          invite_status: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      get_live_today_activity: {
        Args: { p_client_id?: string; p_date: string }
        Returns: {
          answered: number
          client_id: string
          dials: number
          dm_conversations: number
          sdr_name: string
          sqls: number
        }[]
      }
      get_most_improved_sdr: {
        Args: { p_client_id?: string; p_end_date: string; p_start_date: string }
        Returns: {
          client_id: string
          current_answer_rate: number
          improvement: number
          previous_answer_rate: number
          sdr_name: string
        }[]
      }
      get_overview_kpis: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          answer_rate: number
          dm_conversations: number
          total_answered: number
          total_dials: number
        }[]
      }
      get_sdr_client_breakdown: {
        Args: { p_end_date: string; p_sdr_name: string; p_start_date: string }
        Returns: {
          client_id: string
          client_name: string
          conv_rate: number
          dials: number
          sqls: number
        }[]
      }
      get_sdr_heatmap: {
        Args: {
          p_client_id?: string
          p_end_date: string
          p_sdr_name: string
          p_start_date: string
        }
        Returns: {
          activity_day: string
          day_of_week: number
          dial_count: number
          week_start: string
        }[]
      }
      get_sdr_hourly_breakdown: {
        Args: { p_client_id?: string; p_date: string; p_sdr_name: string }
        Returns: {
          answered: number
          dials: number
          dms: number
          hour: number
          sqls_booked: number
        }[]
      }
      get_sdr_meetings_kpis: {
        Args: {
          p_client_id?: string
          p_end_date: string
          p_sdr_name: string
          p_start_date: string
        }
        Returns: {
          avg_days_to_meeting: number
          meetings_held: number
          show_up_rate: number
          total_meetings: number
        }[]
      }
      get_sdr_performance: {
        Args: {
          p_client_id?: string
          p_end_date: string
          p_sdr_name: string
          p_start_date: string
        }
        Returns: {
          answer_rate: number
          answered: number
          avg_talk_time_seconds: number
          conv_rate: number
          dm_conversations: number
          sqls: number
          total_dials: number
        }[]
      }
      get_sdr_weekly_trend: {
        Args: {
          p_client_id?: string
          p_end_date: string
          p_sdr_name: string
          p_start_date: string
        }
        Returns: {
          answered: number
          dials: number
          dm_conversations: number
          sqls: number
          week_start: string
        }[]
      }
      get_team_leaderboard: {
        Args: { p_client_id?: string; p_end_date: string; p_start_date: string }
        Returns: {
          answer_rate: number
          answered: number
          avg_talk_time_seconds: number
          client_id: string
          client_name: string
          conv_rate: number
          dm_conversations: number
          rank: number
          sdr_name: string
          sqls: number
          total_dials: number
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      revoke_client_access: { Args: { p_email: string }; Returns: undefined }
      revoke_user_access: { Args: { p_email: string }; Returns: undefined }
      sync_user_role: {
        Args: { p_client_id?: string; p_email: string; p_role: string }
        Returns: undefined
      }
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
