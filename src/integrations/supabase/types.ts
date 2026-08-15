export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_activity_events: {
        Row: {
          completed_at: string | null;
          duration_ms: number | null;
          event_type: string;
          id: string;
          medical_request_id: string;
          message: string;
          metadata: Json | null;
          started_at: string;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          duration_ms?: number | null;
          event_type: string;
          id?: string;
          medical_request_id: string;
          message?: string;
          metadata?: Json | null;
          started_at?: string;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          duration_ms?: number | null;
          event_type?: string;
          id?: string;
          medical_request_id?: string;
          message?: string;
          metadata?: Json | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_activity_events_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: false;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          medical_request_id: string | null;
          new_value: Json | null;
          old_value: Json | null;
        };
        Insert: {
          action: string;
          actor?: string;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          medical_request_id?: string | null;
          new_value?: Json | null;
          old_value?: Json | null;
        };
        Update: {
          action?: string;
          actor?: string;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          medical_request_id?: string | null;
          new_value?: Json | null;
          old_value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: false;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      doctor_reviews: {
        Row: {
          appointment_at: string | null;
          comments: string | null;
          created_at: string;
          doctor_id: string | null;
          estimated_duration_minutes: number | null;
          id: string;
          medical_request_id: string;
          proposed_treatment: string | null;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["review_status"];
        };
        Insert: {
          appointment_at?: string | null;
          comments?: string | null;
          created_at?: string;
          doctor_id?: string | null;
          estimated_duration_minutes?: number | null;
          id?: string;
          medical_request_id: string;
          proposed_treatment?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Update: {
          appointment_at?: string | null;
          comments?: string | null;
          created_at?: string;
          doctor_id?: string | null;
          estimated_duration_minutes?: number | null;
          id?: string;
          medical_request_id?: string;
          proposed_treatment?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Relationships: [
          {
            foreignKeyName: "doctor_reviews_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctor_reviews_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: false;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      doctors: {
        Row: {
          created_at: string;
          hospital_id: string;
          id: string;
          languages: string[];
          license_reference: string;
          name: string;
          specialty: string;
          status: Database["public"]["Enums"]["record_status"];
          years_experience: number;
        };
        Insert: {
          created_at?: string;
          hospital_id: string;
          id?: string;
          languages?: string[];
          license_reference: string;
          name: string;
          specialty: string;
          status?: Database["public"]["Enums"]["record_status"];
          years_experience?: number;
        };
        Update: {
          created_at?: string;
          hospital_id?: string;
          id?: string;
          languages?: string[];
          license_reference?: string;
          name?: string;
          specialty?: string;
          status?: Database["public"]["Enums"]["record_status"];
          years_experience?: number;
        };
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
        ];
      };
      ferry_options: {
        Row: {
          destination_terminal: string;
          estimated_cost_sgd: number;
          estimated_duration_minutes: number;
          id: string;
          operator_name: string;
          origin_terminal: string;
          status: Database["public"]["Enums"]["record_status"];
        };
        Insert: {
          destination_terminal: string;
          estimated_cost_sgd: number;
          estimated_duration_minutes?: number;
          id?: string;
          operator_name: string;
          origin_terminal: string;
          status?: Database["public"]["Enums"]["record_status"];
        };
        Update: {
          destination_terminal?: string;
          estimated_cost_sgd?: number;
          estimated_duration_minutes?: number;
          id?: string;
          operator_name?: string;
          origin_terminal?: string;
          status?: Database["public"]["Enums"]["record_status"];
        };
        Relationships: [];
      };
      hospital_treatment_prices: {
        Row: {
          currency: string;
          diagnostics_sgd: number;
          doctor_fee_sgd: number;
          hospital_fee_sgd: number;
          hospital_id: string;
          id: string;
          medication_sgd: number;
          price_sgd: number;
          status: Database["public"]["Enums"]["record_status"];
          treatment_id: string;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          currency?: string;
          diagnostics_sgd?: number;
          doctor_fee_sgd?: number;
          hospital_fee_sgd?: number;
          hospital_id: string;
          id?: string;
          medication_sgd?: number;
          price_sgd: number;
          status?: Database["public"]["Enums"]["record_status"];
          treatment_id: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Update: {
          currency?: string;
          diagnostics_sgd?: number;
          doctor_fee_sgd?: number;
          hospital_fee_sgd?: number;
          hospital_id?: string;
          id?: string;
          medication_sgd?: number;
          price_sgd?: number;
          status?: Database["public"]["Enums"]["record_status"];
          treatment_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hospital_treatment_prices_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hospital_treatment_prices_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      hospitals: {
        Row: {
          accreditation: string;
          address: string;
          contact_email: string;
          contact_phone: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          specialties: string[];
          status: Database["public"]["Enums"]["record_status"];
          updated_at: string;
        };
        Insert: {
          accreditation?: string;
          address: string;
          contact_email: string;
          contact_phone: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          specialties?: string[];
          status?: Database["public"]["Enums"]["record_status"];
          updated_at?: string;
        };
        Update: {
          accreditation?: string;
          address?: string;
          contact_email?: string;
          contact_phone?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          specialties?: string[];
          status?: Database["public"]["Enums"]["record_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      hotels: {
        Row: {
          address: string;
          distance_to_hospital_km: number;
          id: string;
          location: string;
          name: string;
          price_per_night_sgd: number;
          rating: number;
          status: Database["public"]["Enums"]["record_status"];
        };
        Insert: {
          address?: string;
          distance_to_hospital_km?: number;
          id?: string;
          location: string;
          name: string;
          price_per_night_sgd: number;
          rating?: number;
          status?: Database["public"]["Enums"]["record_status"];
        };
        Update: {
          address?: string;
          distance_to_hospital_km?: number;
          id?: string;
          location?: string;
          name?: string;
          price_per_night_sgd?: number;
          rating?: number;
          status?: Database["public"]["Enums"]["record_status"];
        };
        Relationships: [];
      };
      itineraries: {
        Row: {
          created_at: string;
          currency: string;
          diagnostics_cost_sgd: number;
          doctor_fee_sgd: number;
          doctor_id: string | null;
          estimated_savings_percentage: number;
          estimated_savings_sgd: number;
          expires_at: string;
          ferry_cost_sgd: number;
          hospital_fee_sgd: number;
          hospital_id: string | null;
          hotel_cost_sgd: number;
          id: string;
          medical_request_id: string;
          medication_cost_sgd: number;
          other_cost_sgd: number;
          public_token: string;
          singapore_benchmark_accommodation_sgd: number;
          singapore_benchmark_sgd: number;
          singapore_benchmark_travel_sgd: number;
          status: Database["public"]["Enums"]["itinerary_status"];
          total_batam_sgd: number;
          transport_cost_sgd: number;
          treatment_cost_sgd: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          diagnostics_cost_sgd?: number;
          doctor_fee_sgd?: number;
          doctor_id?: string | null;
          estimated_savings_percentage?: number;
          estimated_savings_sgd?: number;
          expires_at?: string;
          ferry_cost_sgd?: number;
          hospital_fee_sgd?: number;
          hospital_id?: string | null;
          hotel_cost_sgd?: number;
          id?: string;
          medical_request_id: string;
          medication_cost_sgd?: number;
          other_cost_sgd?: number;
          public_token?: string;
          singapore_benchmark_accommodation_sgd?: number;
          singapore_benchmark_sgd?: number;
          singapore_benchmark_travel_sgd?: number;
          status?: Database["public"]["Enums"]["itinerary_status"];
          total_batam_sgd?: number;
          transport_cost_sgd?: number;
          treatment_cost_sgd?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          diagnostics_cost_sgd?: number;
          doctor_fee_sgd?: number;
          doctor_id?: string | null;
          estimated_savings_percentage?: number;
          estimated_savings_sgd?: number;
          expires_at?: string;
          ferry_cost_sgd?: number;
          hospital_fee_sgd?: number;
          hospital_id?: string | null;
          hotel_cost_sgd?: number;
          id?: string;
          medical_request_id?: string;
          medication_cost_sgd?: number;
          other_cost_sgd?: number;
          public_token?: string;
          singapore_benchmark_accommodation_sgd?: number;
          singapore_benchmark_sgd?: number;
          singapore_benchmark_travel_sgd?: number;
          status?: Database["public"]["Enums"]["itinerary_status"];
          total_batam_sgd?: number;
          transport_cost_sgd?: number;
          treatment_cost_sgd?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itineraries_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itineraries_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "itineraries_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: true;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      itinerary_items: {
        Row: {
          day_number: number;
          description: string;
          id: string;
          itinerary_id: string;
          location: string;
          sort_order: number;
          status: Database["public"]["Enums"]["item_status"];
          time: string;
          title: string;
          type: string;
        };
        Insert: {
          day_number?: number;
          description?: string;
          id?: string;
          itinerary_id: string;
          location?: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["item_status"];
          time?: string;
          title: string;
          type: string;
        };
        Update: {
          day_number?: number;
          description?: string;
          id?: string;
          itinerary_id?: string;
          location?: string;
          sort_order?: number;
          status?: Database["public"]["Enums"]["item_status"];
          time?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey";
            columns: ["itinerary_id"];
            isOneToOne: false;
            referencedRelation: "itineraries";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_requests: {
        Row: {
          ai_confidence: number | null;
          ai_request: Json;
          channel: Database["public"]["Enums"]["channel"];
          created_at: string;
          hospital_id: string | null;
          hospital_review: Database["public"]["Enums"]["review_status"] | null;
          human_takeover: boolean;
          id: string;
          intent: string;
          original_message: string;
          patient_id: string;
          preferred_date: string | null;
          preferred_nights: number;
          priority: Database["public"]["Enums"]["priority"];
          reference: string;
          status: Database["public"]["Enums"]["request_status"];
          takeover_opened_at: string | null;
          takeover_reasons: string[];
          takeover_staff: string | null;
          traveller_count: number;
          treatment_id: string | null;
          updated_at: string;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_request?: Json;
          channel?: Database["public"]["Enums"]["channel"];
          created_at?: string;
          hospital_id?: string | null;
          hospital_review?: Database["public"]["Enums"]["review_status"] | null;
          human_takeover?: boolean;
          id?: string;
          intent?: string;
          original_message?: string;
          patient_id: string;
          preferred_date?: string | null;
          preferred_nights?: number;
          priority?: Database["public"]["Enums"]["priority"];
          reference?: string;
          status?: Database["public"]["Enums"]["request_status"];
          takeover_opened_at?: string | null;
          takeover_reasons?: string[];
          takeover_staff?: string | null;
          traveller_count?: number;
          treatment_id?: string | null;
          updated_at?: string;
        };
        Update: {
          ai_confidence?: number | null;
          ai_request?: Json;
          channel?: Database["public"]["Enums"]["channel"];
          created_at?: string;
          hospital_id?: string | null;
          hospital_review?: Database["public"]["Enums"]["review_status"] | null;
          human_takeover?: boolean;
          id?: string;
          intent?: string;
          original_message?: string;
          patient_id?: string;
          preferred_date?: string | null;
          preferred_nights?: number;
          priority?: Database["public"]["Enums"]["priority"];
          reference?: string;
          status?: Database["public"]["Enums"]["request_status"];
          takeover_opened_at?: string | null;
          takeover_reasons?: string[];
          takeover_staff?: string | null;
          traveller_count?: number;
          treatment_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_requests_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_requests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_requests_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          channel: Database["public"]["Enums"]["channel"];
          delivery_status: string;
          direction: Database["public"]["Enums"]["message_direction"];
          id: string;
          medical_request_id: string | null;
          message_type: Database["public"]["Enums"]["message_author"];
          patient_id: string;
          raw_text: string;
          sent_at: string;
          structured_data: Json | null;
          suggested: boolean;
        };
        Insert: {
          channel: Database["public"]["Enums"]["channel"];
          delivery_status?: string;
          direction: Database["public"]["Enums"]["message_direction"];
          id?: string;
          medical_request_id?: string | null;
          message_type: Database["public"]["Enums"]["message_author"];
          patient_id: string;
          raw_text?: string;
          sent_at?: string;
          structured_data?: Json | null;
          suggested?: boolean;
        };
        Update: {
          channel?: Database["public"]["Enums"]["channel"];
          delivery_status?: string;
          direction?: Database["public"]["Enums"]["message_direction"];
          id?: string;
          medical_request_id?: string | null;
          message_type?: Database["public"]["Enums"]["message_author"];
          patient_id?: string;
          raw_text?: string;
          sent_at?: string;
          structured_data?: Json | null;
          suggested?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "messages_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: false;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          country: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          preferred_channel: Database["public"]["Enums"]["channel"];
          preferred_language: string;
          telegram_id: string | null;
          traveller_count: number;
          updated_at: string;
          whatsapp_id: string | null;
        };
        Insert: {
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          preferred_channel?: Database["public"]["Enums"]["channel"];
          preferred_language?: string;
          telegram_id?: string | null;
          traveller_count?: number;
          updated_at?: string;
          whatsapp_id?: string | null;
        };
        Update: {
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          preferred_channel?: Database["public"]["Enums"]["channel"];
          preferred_language?: string;
          telegram_id?: string | null;
          traveller_count?: number;
          updated_at?: string;
          whatsapp_id?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          approved_at: string | null;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          itinerary_id: string;
          notes: string | null;
          sent_at: string | null;
          source: string;
          status: Database["public"]["Enums"]["quote_status"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          itinerary_id: string;
          notes?: string | null;
          sent_at?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          itinerary_id?: string;
          notes?: string | null;
          sent_at?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_itinerary_id_fkey";
            columns: ["itinerary_id"];
            isOneToOne: false;
            referencedRelation: "itineraries";
            referencedColumns: ["id"];
          },
        ];
      };
      singapore_benchmarks: {
        Row: {
          benchmark_accommodation_sgd: number;
          benchmark_average_sgd: number;
          benchmark_max_sgd: number;
          benchmark_min_sgd: number;
          benchmark_travel_sgd: number;
          id: string;
          source_date: string;
          source_name: string;
          status: Database["public"]["Enums"]["record_status"];
          treatment_id: string;
        };
        Insert: {
          benchmark_accommodation_sgd?: number;
          benchmark_average_sgd: number;
          benchmark_max_sgd: number;
          benchmark_min_sgd: number;
          benchmark_travel_sgd?: number;
          id?: string;
          source_date: string;
          source_name: string;
          status?: Database["public"]["Enums"]["record_status"];
          treatment_id: string;
        };
        Update: {
          benchmark_accommodation_sgd?: number;
          benchmark_average_sgd?: number;
          benchmark_max_sgd?: number;
          benchmark_min_sgd?: number;
          benchmark_travel_sgd?: number;
          id?: string;
          source_date?: string;
          source_name?: string;
          status?: Database["public"]["Enums"]["record_status"];
          treatment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "singapore_benchmarks_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      transport_options: {
        Row: {
          destination: string;
          estimated_cost_sgd: number;
          estimated_duration_minutes: number;
          id: string;
          name: string;
          origin: string;
          status: Database["public"]["Enums"]["record_status"];
          type: string;
        };
        Insert: {
          destination: string;
          estimated_cost_sgd: number;
          estimated_duration_minutes?: number;
          id?: string;
          name?: string;
          origin: string;
          status?: Database["public"]["Enums"]["record_status"];
          type: string;
        };
        Update: {
          destination?: string;
          estimated_cost_sgd?: number;
          estimated_duration_minutes?: number;
          id?: string;
          name?: string;
          origin?: string;
          status?: Database["public"]["Enums"]["record_status"];
          type?: string;
        };
        Relationships: [];
      };
      treatments: {
        Row: {
          active: boolean;
          category: string;
          description: string;
          duration_minutes: number;
          id: string;
          keywords: string[];
          name: string;
          recovery_days: number;
        };
        Insert: {
          active?: boolean;
          category: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          keywords?: string[];
          name: string;
          recovery_days?: number;
        };
        Update: {
          active?: boolean;
          category?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          keywords?: string[];
          name?: string;
          recovery_days?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          hospital_id: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hospital_id?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          hospital_id?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
        ];
      };
      web_chat_sessions: {
        Row: {
          created_at: string;
          id: string;
          itinerary_id: string | null;
          medical_request_id: string | null;
          patient_id: string | null;
          selections: Json;
          slots: Json;
          stage: string;
          token: string;
          transcript: Json;
          updated_at: string;
          visitor_name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          itinerary_id?: string | null;
          medical_request_id?: string | null;
          patient_id?: string | null;
          selections?: Json;
          slots?: Json;
          stage?: string;
          token?: string;
          transcript?: Json;
          updated_at?: string;
          visitor_name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          itinerary_id?: string | null;
          medical_request_id?: string | null;
          patient_id?: string | null;
          selections?: Json;
          slots?: Json;
          stage?: string;
          token?: string;
          transcript?: Json;
          updated_at?: string;
          visitor_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "web_chat_sessions_itinerary_id_fkey";
            columns: ["itinerary_id"];
            isOneToOne: false;
            referencedRelation: "itineraries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "web_chat_sessions_medical_request_id_fkey";
            columns: ["medical_request_id"];
            isOneToOne: false;
            referencedRelation: "medical_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "web_chat_sessions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "hospital_staff" | "doctor";
      channel: "TELEGRAM" | "WHATSAPP" | "WEB";
      item_status: "ESTIMATED" | "PENDING" | "CONFIRMED" | "COMPLETED";
      itinerary_status: "DRAFT" | "HOSPITAL_CONFIRMED" | "SENT" | "PATIENT_CONFIRMED" | "REJECTED";
      message_author: "PATIENT" | "AI" | "HOSPITAL" | "SYSTEM";
      message_direction: "INBOUND" | "OUTBOUND";
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      quote_status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
      record_status: "ACTIVE" | "INACTIVE";
      request_status:
        | "NEW_INQUIRY"
        | "AI_PROCESSING"
        | "AI_ITINERARY_READY"
        | "HOSPITAL_REVIEW_REQUIRED"
        | "DOCTOR_REVIEW_REQUIRED"
        | "QUOTE_APPROVED"
        | "PATIENT_CONFIRMATION_PENDING"
        | "CONFIRMED_BOOKING"
        | "TRAVEL_READY"
        | "COMPLETED"
        | "REJECTED"
        | "HUMAN_TAKEOVER";
      review_status: "PENDING" | "APPROVED" | "MODIFIED" | "REJECTED" | "MORE_INFORMATION_REQUIRED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hospital_staff", "doctor"],
      channel: ["TELEGRAM", "WHATSAPP", "WEB"],
      item_status: ["ESTIMATED", "PENDING", "CONFIRMED", "COMPLETED"],
      itinerary_status: ["DRAFT", "HOSPITAL_CONFIRMED", "SENT", "PATIENT_CONFIRMED", "REJECTED"],
      message_author: ["PATIENT", "AI", "HOSPITAL", "SYSTEM"],
      message_direction: ["INBOUND", "OUTBOUND"],
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
      quote_status: ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "EXPIRED"],
      record_status: ["ACTIVE", "INACTIVE"],
      request_status: [
        "NEW_INQUIRY",
        "AI_PROCESSING",
        "AI_ITINERARY_READY",
        "HOSPITAL_REVIEW_REQUIRED",
        "DOCTOR_REVIEW_REQUIRED",
        "QUOTE_APPROVED",
        "PATIENT_CONFIRMATION_PENDING",
        "CONFIRMED_BOOKING",
        "TRAVEL_READY",
        "COMPLETED",
        "REJECTED",
        "HUMAN_TAKEOVER",
      ],
      review_status: ["PENDING", "APPROVED", "MODIFIED", "REJECTED", "MORE_INFORMATION_REQUIRED"],
    },
  },
} as const;
