import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      decks: {
        Row: {
          id: number;
          owner: string;
          title: string;
          description: string;
          tags: string[];
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner: string;
          title: string;
          description?: string;
          tags?: string[];
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          owner?: string;
          title?: string;
          description?: string;
          tags?: string[];
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      flashcards: {
        Row: {
          id: number;
          deck_id: number;
          front_text: string;
          back_text: string;
          front_image_url: string | null;
          back_image_url: string | null;
          hint: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          deck_id: number;
          front_text?: string;
          back_text?: string;
          front_image_url?: string | null;
          back_image_url?: string | null;
          hint?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          deck_id?: number;
          front_text?: string;
          back_text?: string;
          front_image_url?: string | null;
          back_image_url?: string | null;
          hint?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      study_sessions: {
        Row: {
          id: number;
          user_id: string;
          deck_id: number;
          started_at: string;
          ended_at: string | null;
          total_reviewed: number;
          correct: number;
        };
        Insert: {
          user_id: string;
          deck_id: number;
          started_at?: string;
          ended_at?: string | null;
          total_reviewed?: number;
          correct?: number;
        };
        Update: {
          id?: number;
          user_id?: string;
          deck_id?: number;
          started_at?: string;
          ended_at?: string | null;
          total_reviewed?: number;
          correct?: number;
        };
      };
      reviews: {
        Row: {
          id: number;
          user_id: string;
          flashcard_id: number;
          reviewed_at: string;
          response_quality: number;
          ease: number;
          interval_days: number;
          next_due_date: string;
        };
        Insert: {
          user_id: string;
          flashcard_id: number;
          reviewed_at?: string;
          response_quality: number;
          ease?: number;
          interval_days?: number;
          next_due_date: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          flashcard_id?: number;
          reviewed_at?: string;
          response_quality?: number;
          ease?: number;
          interval_days?: number;
          next_due_date?: string;
        };
      };
      imports: {
        Row: {
          id: number;
          user_id: string;
          source_type: 'paste' | 'pdf' | 'youtube' | 'csv';
          source_meta: Record<string, any>;
          status: 'pending' | 'done' | 'error';
          created_at: string;
          error_message: string;
        };
        Insert: {
          user_id: string;
          source_type: 'paste' | 'pdf' | 'youtube' | 'csv';
          source_meta?: Record<string, any>;
          status?: 'pending' | 'done' | 'error';
          created_at?: string;
          error_message?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          source_type?: 'paste' | 'pdf' | 'youtube' | 'csv';
          source_meta?: Record<string, any>;
          status?: 'pending' | 'done' | 'error';
          created_at?: string;
          error_message?: string;
        };
      };
    };
  };
};