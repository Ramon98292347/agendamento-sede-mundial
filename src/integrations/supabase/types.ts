export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agendamentos: {
        Row: {
          anotacoes_pastor: string | null
          audio_url: string | null
          created_at: string
          data_agendamento: string | null
          email: string | null
          horario_agendamento: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          pastor_selecionado: string | null
          status: string | null
          telefone: string
          tipo_agendamento: string | null
          updated_at: string
        }
        Insert: {
          anotacoes_pastor?: string | null
          audio_url?: string | null
          created_at?: string
          data_agendamento?: string | null
          email?: string | null
          horario_agendamento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          pastor_selecionado?: string | null
          status?: string | null
          telefone: string
          tipo_agendamento?: string | null
          updated_at?: string
        }
        Update: {
          anotacoes_pastor?: string | null
          audio_url?: string | null
          created_at?: string
          data_agendamento?: string | null
          email?: string | null
          horario_agendamento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          pastor_selecionado?: string | null
          status?: string | null
          telefone?: string
          tipo_agendamento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          contatos: Json | null
          created_at: string
          horarios_funcionamento: Json | null
          id: string
          informacoes: Json | null
          senha_admin: string | null
          updated_at: string
        }
        Insert: {
          contatos?: Json | null
          created_at?: string
          horarios_funcionamento?: Json | null
          id?: string
          informacoes?: Json | null
          senha_admin?: string | null
          updated_at?: string
        }
        Update: {
          contatos?: Json | null
          created_at?: string
          horarios_funcionamento?: Json | null
          id?: string
          informacoes?: Json | null
          senha_admin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      escalas: {
        Row: {
          created_at: string
          data_disponivel: string
          horario_fim: string
          horario_inicio: string
          id: string
          pastor_id: string
          updated_at: string
          intervalo_minutos?: number
        }
        Insert: {
          created_at?: string
          data_disponivel: string
          horario_fim: string
          horario_inicio: string
          id?: string
          pastor_id: string
          updated_at?: string
          intervalo_minutos?: number
        }
        Update: {
          created_at?: string
          data_disponivel?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          pastor_id?: string
          updated_at?: string
          intervalo_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "escalas_pastor_id_fkey"
            columns: ["pastor_id"]
            isOneToOne: false
            referencedRelation: "pastores"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_atendimento: {
        Row: {
          ativo: boolean
          created_at: string
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          horario_fim?: string
          horario_inicio?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      pastores: {
        Row: {
          created_at: string
          id: string
          nome: string
          senha: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          senha: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          senha?: string
          updated_at?: string
        }
        Relationships: []
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
