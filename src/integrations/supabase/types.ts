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
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          confirmation_deadline: string | null
          created_at: string
          customer_id: string
          dispute_reason: string | null
          float_released_at: string | null
          id: string
          mpesa_receipt_number: string | null
          mpesa_transaction_id: string | null
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_ksh: number
          product_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          total_amount_ksh: number
          updated_at: string
          vendor_id: string
          vendor_payout_ksh: number
        }
        Insert: {
          confirmation_deadline?: string | null
          created_at?: string
          customer_id: string
          dispute_reason?: string | null
          float_released_at?: string | null
          id?: string
          mpesa_receipt_number?: string | null
          mpesa_transaction_id?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_ksh: number
          product_id: string
          quantity: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_ksh: number
          updated_at?: string
          vendor_id: string
          vendor_payout_ksh: number
        }
        Update: {
          confirmation_deadline?: string | null
          created_at?: string
          customer_id?: string
          dispute_reason?: string | null
          float_released_at?: string | null
          id?: string
          mpesa_receipt_number?: string | null
          mpesa_transaction_id?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_ksh?: number
          product_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_ksh?: number
          updated_at?: string
          vendor_id?: string
          vendor_payout_ksh?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_rating: number
          boost_expires_at: string | null
          brand: string
          category: Database["public"]["Enums"]["product_category"]
          condition: Database["public"]["Enums"]["product_condition"]
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean
          is_boosted: boolean
          model_name: string
          price_ksh: number
          quantity_in_stock: number
          updated_at: string
          vendor_id: string
          video_url: string | null
          warranty_duration_months: number | null
          warranty_status: boolean
          year_of_manufacture: number | null
        }
        Insert: {
          average_rating?: number
          boost_expires_at?: string | null
          brand: string
          category: Database["public"]["Enums"]["product_category"]
          condition: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_boosted?: boolean
          model_name: string
          price_ksh: number
          quantity_in_stock?: number
          updated_at?: string
          vendor_id: string
          video_url?: string | null
          warranty_duration_months?: number | null
          warranty_status?: boolean
          year_of_manufacture?: number | null
        }
        Update: {
          average_rating?: number
          boost_expires_at?: string | null
          brand?: string
          category?: Database["public"]["Enums"]["product_category"]
          condition?: Database["public"]["Enums"]["product_condition"]
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          is_boosted?: boolean
          model_name?: string
          price_ksh?: number
          quantity_in_stock?: number
          updated_at?: string
          vendor_id?: string
          video_url?: string | null
          warranty_duration_months?: number | null
          warranty_status?: boolean
          year_of_manufacture?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          amount_paid_ksh: number
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          product_id: string | null
          promotion_type: Database["public"]["Enums"]["promotion_type"]
          starts_at: string
          vendor_id: string
        }
        Insert: {
          amount_paid_ksh: number
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          promotion_type: Database["public"]["Enums"]["promotion_type"]
          starts_at?: string
          vendor_id: string
        }
        Update: {
          amount_paid_ksh?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          promotion_type?: Database["public"]["Enums"]["promotion_type"]
          starts_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_requests: {
        Row: {
          created_at: string
          customer_approved_quote: boolean
          customer_id: string
          device_description: string
          id: string
          mpesa_transaction_id: string | null
          payment_status: Database["public"]["Enums"]["repair_payment_status"]
          problem_description: string
          quoted_price_ksh: number | null
          repair_service_id: string | null
          status: Database["public"]["Enums"]["repair_status"]
          technician_notes: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_approved_quote?: boolean
          customer_id: string
          device_description: string
          id?: string
          mpesa_transaction_id?: string | null
          payment_status?: Database["public"]["Enums"]["repair_payment_status"]
          problem_description: string
          quoted_price_ksh?: number | null
          repair_service_id?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          technician_notes?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_approved_quote?: boolean
          customer_id?: string
          device_description?: string
          id?: string
          mpesa_transaction_id?: string | null
          payment_status?: Database["public"]["Enums"]["repair_payment_status"]
          problem_description?: string
          quoted_price_ksh?: number | null
          repair_service_id?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          technician_notes?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_repair_service_id_fkey"
            columns: ["repair_service_id"]
            isOneToOne: false
            referencedRelation: "repair_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_services: {
        Row: {
          created_at: string
          description: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          estimated_turnaround_days: number
          id: string
          is_active: boolean
          price_max_ksh: number
          price_min_ksh: number
          repair_type: string | null
          service_name: string
          vendor_id: string
          warranty_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          estimated_turnaround_days: number
          id?: string
          is_active?: boolean
          price_max_ksh: number
          price_min_ksh: number
          repair_type?: string | null
          service_name: string
          vendor_id: string
          warranty_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          device_type?: Database["public"]["Enums"]["device_type"]
          estimated_turnaround_days?: number
          id?: string
          is_active?: boolean
          price_max_ksh?: number
          price_min_ksh?: number
          repair_type?: string | null
          service_name?: string
          vendor_id?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          product_id: string
          product_rating: number
          service_rating: number
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          product_id: string
          product_rating: number
          service_rating: number
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          product_id?: string
          product_rating?: number
          service_rating?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_part_orders: {
        Row: {
          created_at: string
          id: string
          price_ksh: number
          product_id: string
          quantity: number
          repair_request_id: string
          status: Database["public"]["Enums"]["spare_part_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          price_ksh: number
          product_id: string
          quantity: number
          repair_request_id: string
          status?: Database["public"]["Enums"]["spare_part_status"]
        }
        Update: {
          created_at?: string
          id?: string
          price_ksh?: number
          product_id?: string
          quantity?: number
          repair_request_id?: string
          status?: Database["public"]["Enums"]["spare_part_status"]
        }
        Relationships: [
          {
            foreignKeyName: "spare_part_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_part_orders_repair_request_id_fkey"
            columns: ["repair_request_id"]
            isOneToOne: false
            referencedRelation: "repair_requests"
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
      vendor_profiles: {
        Row: {
          average_rating: number
          business_certificate_url: string | null
          business_name: string
          city: string | null
          completed_transactions_count: number
          county: string | null
          created_at: string
          email: string | null
          google_maps_link: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          id_document_url: string | null
          latitude: number | null
          longitude: number | null
          offers_products: boolean
          offers_repairs: boolean
          operating_hours: string | null
          owner_name: string | null
          phone: string | null
          physical_address: string
          rejection_reason: string | null
          shop_photo_urls: string[] | null
          sub_county: string | null
          subscription_expires_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          suspension_reason: string | null
          total_completed_transactions: number
          updated_at: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Insert: {
          average_rating?: number
          business_certificate_url?: string | null
          business_name: string
          city?: string | null
          completed_transactions_count?: number
          county?: string | null
          created_at?: string
          email?: string | null
          google_maps_link?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          id_document_url?: string | null
          latitude?: number | null
          longitude?: number | null
          offers_products?: boolean
          offers_repairs?: boolean
          operating_hours?: string | null
          owner_name?: string | null
          phone?: string | null
          physical_address: string
          rejection_reason?: string | null
          shop_photo_urls?: string[] | null
          sub_county?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspension_reason?: string | null
          total_completed_transactions?: number
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Update: {
          average_rating?: number
          business_certificate_url?: string | null
          business_name?: string
          city?: string | null
          completed_transactions_count?: number
          county?: string | null
          created_at?: string
          email?: string | null
          google_maps_link?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          id_document_url?: string | null
          latitude?: number | null
          longitude?: number | null
          offers_products?: boolean
          offers_repairs?: boolean
          operating_hours?: string | null
          owner_name?: string | null
          phone?: string | null
          physical_address?: string
          rejection_reason?: string | null
          shop_photo_urls?: string[] | null
          sub_county?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspension_reason?: string | null
          total_completed_transactions?: number
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_release_float: { Args: never; Returns: undefined }
      create_order_atomic: {
        Args: { _phone?: string; _product_id: string; _quantity: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_order_paid: {
        Args: { _mpesa_tx: string; _order_id: string; _receipt: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin"
      device_type: "laptop" | "smartphone" | "both"
      notification_type:
        | "order_update"
        | "payment"
        | "repair_update"
        | "review_request"
        | "promotion"
        | "dispute"
        | "vendor_application"
      order_payment_status:
        | "pending"
        | "paid_float"
        | "released"
        | "refunded"
        | "failed"
      order_status:
        | "pending_payment"
        | "payment_held"
        | "vendor_preparing"
        | "out_for_delivery"
        | "ready_for_pickup"
        | "delivered_awaiting_confirmation"
        | "confirmed"
        | "disputed"
        | "refunded"
        | "cancelled"
      product_category: "laptop" | "smartphone" | "accessory" | "spare_part"
      product_condition: "new" | "refurbished" | "used"
      promotion_type: "featured_homepage" | "top_search" | "trending_carousel"
      repair_payment_status: "unpaid" | "held" | "released"
      repair_status:
        | "submitted"
        | "received"
        | "diagnosing"
        | "in_repair"
        | "ready_for_collection"
        | "completed"
        | "cancelled"
        | "quotation_sent"
        | "repair_in_progress"
      spare_part_status:
        | "pending"
        | "approved_by_customer"
        | "ordered"
        | "delivered"
      subscription_tier: "basic" | "standard" | "premium"
      vendor_verification_status:
        | "pending"
        | "verified"
        | "suspended"
        | "approved"
        | "rejected"
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
      app_role: ["customer", "vendor", "admin"],
      device_type: ["laptop", "smartphone", "both"],
      notification_type: [
        "order_update",
        "payment",
        "repair_update",
        "review_request",
        "promotion",
        "dispute",
        "vendor_application",
      ],
      order_payment_status: [
        "pending",
        "paid_float",
        "released",
        "refunded",
        "failed",
      ],
      order_status: [
        "pending_payment",
        "payment_held",
        "vendor_preparing",
        "out_for_delivery",
        "ready_for_pickup",
        "delivered_awaiting_confirmation",
        "confirmed",
        "disputed",
        "refunded",
        "cancelled",
      ],
      product_category: ["laptop", "smartphone", "accessory", "spare_part"],
      product_condition: ["new", "refurbished", "used"],
      promotion_type: ["featured_homepage", "top_search", "trending_carousel"],
      repair_payment_status: ["unpaid", "held", "released"],
      repair_status: [
        "submitted",
        "received",
        "diagnosing",
        "in_repair",
        "ready_for_collection",
        "completed",
        "cancelled",
        "quotation_sent",
        "repair_in_progress",
      ],
      spare_part_status: [
        "pending",
        "approved_by_customer",
        "ordered",
        "delivered",
      ],
      subscription_tier: ["basic", "standard", "premium"],
      vendor_verification_status: [
        "pending",
        "verified",
        "suspended",
        "approved",
        "rejected",
      ],
    },
  },
} as const
