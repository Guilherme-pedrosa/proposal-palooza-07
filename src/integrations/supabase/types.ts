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
      atividades: {
        Row: {
          cliente_id: string | null
          concluida: boolean | null
          created_at: string | null
          data_prevista: string | null
          data_realizada: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          latitude: number | null
          longitude: number | null
          oportunidade_id: string | null
          proxima_acao: string | null
          proxima_data: string | null
          resultado: string | null
          tipo: string
          titulo: string
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          concluida?: boolean | null
          created_at?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          oportunidade_id?: string | null
          proxima_acao?: string | null
          proxima_data?: string | null
          resultado?: string | null
          tipo: string
          titulo: string
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          concluida?: boolean | null
          created_at?: string | null
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          oportunidade_id?: string | null
          proxima_acao?: string | null
          proxima_data?: string | null
          resultado?: string | null
          tipo?: string
          titulo?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_gc: {
        Row: {
          ativo: boolean | null
          celular: string | null
          cidade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          gc_id: string
          gc_synced_at: string | null
          id: string
          nome: string
          observacoes: string | null
          porte: string | null
          razao_social: string | null
          segmento: string | null
          telefone: string | null
          tipo_pessoa: string | null
          total_compras_gc: number | null
          ultima_compra_gc: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          celular?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gc_id: string
          gc_synced_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          total_compras_gc?: number | null
          ultima_compra_gc?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          celular?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          gc_id?: string
          gc_synced_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          porte?: string | null
          razao_social?: string | null
          segmento?: string | null
          telefone?: string | null
          tipo_pessoa?: string | null
          total_compras_gc?: number | null
          ultima_compra_gc?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      gc_sync_log: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          entidade: string
          gc_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          entidade: string
          gc_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          entidade?: string
          gc_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          ano: number
          id: string
          mes: number
          meta_propostas: number | null
          meta_valor: number
          meta_visitas: number | null
          vendedor_id: string | null
        }
        Insert: {
          ano: number
          id?: string
          mes: number
          meta_propostas?: number | null
          meta_valor: number
          meta_visitas?: number | null
          vendedor_id?: string | null
        }
        Update: {
          ano?: number
          id?: string
          mes?: number
          meta_propostas?: number | null
          meta_valor?: number
          meta_visitas?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_perda: {
        Row: {
          ativo: boolean | null
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean | null
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean | null
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      oportunidades: {
        Row: {
          checklist_etapa: Json | null
          cliente_id: string | null
          created_at: string | null
          data_fechamento_prevista: string | null
          descricao_perda: string | null
          etapa: string
          gc_orcamento_id: string | null
          gc_orcamento_url: string | null
          id: string
          motivo_perda_id: string | null
          numero: number
          origem: string | null
          probabilidade: number | null
          produtos_interesse: string[] | null
          temperatura: string | null
          tipo_venda: string | null
          titulo: string
          ultima_atividade_em: string | null
          updated_at: string | null
          valor_estimado: number | null
          vendedor_id: string | null
        }
        Insert: {
          checklist_etapa?: Json | null
          cliente_id?: string | null
          created_at?: string | null
          data_fechamento_prevista?: string | null
          descricao_perda?: string | null
          etapa?: string
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          id?: string
          motivo_perda_id?: string | null
          numero?: number
          origem?: string | null
          probabilidade?: number | null
          produtos_interesse?: string[] | null
          temperatura?: string | null
          tipo_venda?: string | null
          titulo: string
          ultima_atividade_em?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Update: {
          checklist_etapa?: Json | null
          cliente_id?: string | null
          created_at?: string | null
          data_fechamento_prevista?: string | null
          descricao_perda?: string | null
          etapa?: string
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          id?: string
          motivo_perda_id?: string | null
          numero?: number
          origem?: string | null
          probabilidade?: number | null
          produtos_interesse?: string[] | null
          temperatura?: string | null
          tipo_venda?: string | null
          titulo?: string
          ultima_atividade_em?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_gc: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string | null
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          estoque_atual: number | null
          estoque_minimo: number | null
          ficha_tecnica_url: string | null
          foto_url: string | null
          fotos_urls: string[] | null
          gc_id: string
          gc_synced_at: string | null
          id: string
          nome: string
          preco_locacao_mensal: number | null
          preco_venda: number | null
          tipo: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          ficha_tecnica_url?: string | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          gc_id: string
          gc_synced_at?: string | null
          id?: string
          nome: string
          preco_locacao_mensal?: number | null
          preco_venda?: number | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          ficha_tecnica_url?: string | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          gc_id?: string
          gc_synced_at?: string | null
          id?: string
          nome?: string
          preco_locacao_mensal?: number | null
          preco_venda?: number | null
          tipo?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          number: string
          products: Json | null
          status: string
          template_id: string | null
          terms_conditions: Json | null
          title: string
          total_value: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          number: string
          products?: Json | null
          status?: string
          template_id?: string | null
          terms_conditions?: Json | null
          title: string
          total_value?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          number?: string
          products?: Json | null
          status?: string
          template_id?: string | null
          terms_conditions?: Json | null
          title?: string
          total_value?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          aberto_contagem: number | null
          aberto_em: string | null
          aberto_por_ip: string | null
          cliente_id: string | null
          created_at: string | null
          desconto_total: number | null
          descricao: string | null
          gc_orcamento_id: string | null
          gc_orcamento_url: string | null
          historico_versoes: Json | null
          id: string
          imagens: Json | null
          link_publico_uuid: string | null
          numero: string
          observacoes_internas: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          produtos: Json
          status: string | null
          template_id: string | null
          termos_condicoes: Json
          titulo: string
          updated_at: string | null
          validade_ate: string | null
          validade_dias: number | null
          valor_total: number | null
          vendedor_id: string | null
          versao: number
        }
        Insert: {
          aberto_contagem?: number | null
          aberto_em?: string | null
          aberto_por_ip?: string | null
          cliente_id?: string | null
          created_at?: string | null
          desconto_total?: number | null
          descricao?: string | null
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          historico_versoes?: Json | null
          id?: string
          imagens?: Json | null
          link_publico_uuid?: string | null
          numero: string
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          produtos?: Json
          status?: string | null
          template_id?: string | null
          termos_condicoes?: Json
          titulo: string
          updated_at?: string | null
          validade_ate?: string | null
          validade_dias?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
          versao?: number
        }
        Update: {
          aberto_contagem?: number | null
          aberto_em?: string | null
          aberto_por_ip?: string | null
          cliente_id?: string | null
          created_at?: string | null
          desconto_total?: number | null
          descricao?: string | null
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          historico_versoes?: Json | null
          id?: string
          imagens?: Json | null
          link_publico_uuid?: string | null
          numero?: string
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          produtos?: Json
          status?: string | null
          template_id?: string | null
          termos_condicoes?: Json
          titulo?: string
          updated_at?: string | null
          validade_ate?: string | null
          validade_dias?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          perfil: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          perfil: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          perfil?: string
          telefone?: string | null
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
