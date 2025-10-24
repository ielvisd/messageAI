// Stub type definitions for Supabase
// TODO: Generate actual types from Supabase schema using:
// npx supabase gen types typescript --project-id zjqktoqpsaaigpaygtmm > src/types/supabase.ts

export interface Database {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          locations: unknown;
          settings: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          locations?: unknown;
          settings?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          locations?: unknown;
          settings?: unknown;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          gym_id: string;
          invited_by: string;
          email: string;
          role: string;
          status: string;
          token: string;
          metadata: unknown;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          invited_by: string;
          email: string;
          role: string;
          status?: string;
          token: string;
          metadata?: unknown;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          invited_by?: string;
          email?: string;
          role?: string;
          status?: string;
          token?: string;
          metadata?: unknown;
          expires_at?: string;
          created_at?: string;
        };
      };
      class_rsvps: {
        Row: {
          id: string;
          schedule_id: string;
          user_id: string;
          rsvp_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          user_id: string;
          rsvp_date: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          user_id?: string;
          rsvp_date?: string;
          status?: string;
          created_at?: string;
        };
      };
      gym_schedules: {
        Row: {
          id: string;
          gym_id: string;
          instructor_id: string;
          instructor_name?: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          class_type: string;
          gym_location: string;
          max_capacity: number | null;
          current_rsvps: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          instructor_id: string;
          instructor_name?: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          class_type: string;
          gym_location: string;
          max_capacity?: number | null;
          current_rsvps?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          instructor_id?: string;
          instructor_name?: string;
          day_of_week?: string;
          start_time?: string;
          end_time?: string;
          class_type?: string;
          gym_location?: string;
          max_capacity?: number | null;
          current_rsvps?: number | null;
          created_at?: string;
        };
      };
    };
  };
}
