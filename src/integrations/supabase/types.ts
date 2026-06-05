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
          {
            foreignKeyName: "atividades_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          ip: string | null
          pagina: string | null
          tipo: string
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          pagina?: string | null
          tipo: string
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          pagina?: string | null
          tipo?: string
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      clientes_gc: {
        Row: {
          ativo: boolean | null
          celular: string | null
          cidade: string | null
          cnpj: string | null
          contato: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          financeiro_atrasado: boolean | null
          gc_id: string
          gc_synced_at: string | null
          geocodificado: boolean | null
          id: string
          inscricao_estadual: string | null
          latitude: number | null
          longitude: number | null
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
          valor_atrasado_gc: number | null
        }
        Insert: {
          ativo?: boolean | null
          celular?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          financeiro_atrasado?: boolean | null
          gc_id: string
          gc_synced_at?: string | null
          geocodificado?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          latitude?: number | null
          longitude?: number | null
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
          valor_atrasado_gc?: number | null
        }
        Update: {
          ativo?: boolean | null
          celular?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          financeiro_atrasado?: boolean | null
          gc_id?: string
          gc_synced_at?: string | null
          geocodificado?: boolean | null
          id?: string
          inscricao_estadual?: string | null
          latitude?: number | null
          longitude?: number | null
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
          valor_atrasado_gc?: number | null
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
      company_settings: {
        Row: {
          address: string | null
          brands: Json | null
          clients: Json | null
          cnpj: string | null
          email: string | null
          id: string
          logo_url: string | null
          mission: string | null
          name: string
          phone: string | null
          updated_at: string | null
          values: string[] | null
          vision: string | null
        }
        Insert: {
          address?: string | null
          brands?: Json | null
          clients?: Json | null
          cnpj?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mission?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          values?: string[] | null
          vision?: string | null
        }
        Update: {
          address?: string | null
          brands?: Json | null
          clients?: Json | null
          cnpj?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mission?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          values?: string[] | null
          vision?: string | null
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
      insumos_referencia: {
        Row: {
          aliases: string[] | null
          ativo: boolean | null
          atualizado_em: string | null
          categoria: string
          custo_por_porcao: number | null
          energia_kwh_porcao: number | null
          fonte_preco: string | null
          id: string
          nome: string
          porcao_padrao_g: number
          preco_kg_max: number | null
          preco_kg_min: number | null
          preco_kg_referencia: number
          qtd_oleo_ml_porcao: number | null
          rendimento_bruto: number
          rendimento_coccao: number
          rendimento_final: number | null
          tempo_preparo_min: number | null
          tipo_coccao: string[] | null
          usa_oleo: boolean | null
        }
        Insert: {
          aliases?: string[] | null
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria: string
          custo_por_porcao?: number | null
          energia_kwh_porcao?: number | null
          fonte_preco?: string | null
          id?: string
          nome: string
          porcao_padrao_g: number
          preco_kg_max?: number | null
          preco_kg_min?: number | null
          preco_kg_referencia: number
          qtd_oleo_ml_porcao?: number | null
          rendimento_bruto: number
          rendimento_coccao: number
          rendimento_final?: number | null
          tempo_preparo_min?: number | null
          tipo_coccao?: string[] | null
          usa_oleo?: boolean | null
        }
        Update: {
          aliases?: string[] | null
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria?: string
          custo_por_porcao?: number | null
          energia_kwh_porcao?: number | null
          fonte_preco?: string | null
          id?: string
          nome?: string
          porcao_padrao_g?: number
          preco_kg_max?: number | null
          preco_kg_min?: number | null
          preco_kg_referencia?: number
          qtd_oleo_ml_porcao?: number | null
          rendimento_bruto?: number
          rendimento_coccao?: number
          rendimento_final?: number | null
          tempo_preparo_min?: number | null
          tipo_coccao?: string[] | null
          usa_oleo?: boolean | null
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
          {
            foreignKeyName: "metas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
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
      notificacoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          lida: boolean | null
          link: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          tipo?: string
          titulo?: string
          usuario_id?: string
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
          {
            foreignKeyName: "oportunidades_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      precos_produto: {
        Row: {
          id: string
          lucro_percentual: number | null
          produto_id: string
          tabela_preco_id: string
          updated_at: string | null
          valor_custo: number | null
          valor_venda: number | null
        }
        Insert: {
          id?: string
          lucro_percentual?: number | null
          produto_id: string
          tabela_preco_id: string
          updated_at?: string | null
          valor_custo?: number | null
          valor_venda?: number | null
        }
        Update: {
          id?: string
          lucro_percentual?: number | null
          produto_id?: string
          tabela_preco_id?: string
          updated_at?: string | null
          valor_custo?: number | null
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "precos_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_produto_tabela_preco_id_fkey"
            columns: ["tabela_preco_id"]
            isOneToOne: false
            referencedRelation: "tabelas_preco"
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
          anexos: Json | null
          aprovado_em: string | null
          aprovado_ip: string | null
          aprovador_cpf: string | null
          aprovador_nome: string | null
          cliente_id: string | null
          condicoes_pagamento: string | null
          created_at: string | null
          desconto_total: number | null
          descricao: string | null
          entrada_percent: number | null
          forma_pagamento: string | null
          gc_orcamento_id: string | null
          gc_orcamento_url: string | null
          historico_versoes: Json | null
          id: string
          imagens: Json | null
          link_publico_uuid: string | null
          num_parcelas: number | null
          numero: string
          observacoes_internas: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          prazo_entrega: string | null
          produtos: Json
          status: string | null
          taxa_juros: number | null
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
          anexos?: Json | null
          aprovado_em?: string | null
          aprovado_ip?: string | null
          aprovador_cpf?: string | null
          aprovador_nome?: string | null
          cliente_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          desconto_total?: number | null
          descricao?: string | null
          entrada_percent?: number | null
          forma_pagamento?: string | null
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          historico_versoes?: Json | null
          id?: string
          imagens?: Json | null
          link_publico_uuid?: string | null
          num_parcelas?: number | null
          numero: string
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          prazo_entrega?: string | null
          produtos?: Json
          status?: string | null
          taxa_juros?: number | null
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
          anexos?: Json | null
          aprovado_em?: string | null
          aprovado_ip?: string | null
          aprovador_cpf?: string | null
          aprovador_nome?: string | null
          cliente_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string | null
          desconto_total?: number | null
          descricao?: string | null
          entrada_percent?: number | null
          forma_pagamento?: string | null
          gc_orcamento_id?: string | null
          gc_orcamento_url?: string | null
          historico_versoes?: Json | null
          id?: string
          imagens?: Json | null
          link_publico_uuid?: string | null
          num_parcelas?: number | null
          numero?: string
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          prazo_entrega?: string | null
          produtos?: Json
          status?: string | null
          taxa_juros?: number | null
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
          {
            foreignKeyName: "propostas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      prospects_rf: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cidade: string | null
          cnae_codigo: string
          cnae_descricao: string | null
          cnpj: string
          complemento: string | null
          contato_principal: string | null
          data_inicio_atividade: string | null
          eh_cliente_wedo: boolean | null
          email: string | null
          endereco_completo: string | null
          fonte: string | null
          geocodificado: boolean | null
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          porte: string | null
          razao_social: string | null
          regime_fiscal: string | null
          situacao_cadastral: string | null
          socios: Json | null
          telefone_1: string | null
          telefone_2: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_codigo: string
          cnae_descricao?: string | null
          cnpj: string
          complemento?: string | null
          contato_principal?: string | null
          data_inicio_atividade?: string | null
          eh_cliente_wedo?: boolean | null
          email?: string | null
          endereco_completo?: string | null
          fonte?: string | null
          geocodificado?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string | null
          regime_fiscal?: string | null
          situacao_cadastral?: string | null
          socios?: Json | null
          telefone_1?: string | null
          telefone_2?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_codigo?: string
          cnae_descricao?: string | null
          cnpj?: string
          complemento?: string | null
          contato_principal?: string | null
          data_inicio_atividade?: string | null
          eh_cliente_wedo?: boolean | null
          email?: string | null
          endereco_completo?: string | null
          fonte?: string | null
          geocodificado?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string | null
          regime_fiscal?: string | null
          situacao_cadastral?: string | null
          socios?: Json | null
          telefone_1?: string | null
          telefone_2?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      simulacoes_roi: {
        Row: {
          created_at: string
          custo_agua: number | null
          custo_energia: number | null
          custo_gordura: number | null
          custo_mao_obra: number | null
          dias_mes: number | null
          economia_anual: number | null
          economia_mensal: number | null
          id: string
          materias_primas: Json
          nome_restaurante: string
          refeicoes_dia: number | null
          resultado_analise: Json | null
          updated_at: string
          url_cardapio: string | null
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          custo_agua?: number | null
          custo_energia?: number | null
          custo_gordura?: number | null
          custo_mao_obra?: number | null
          dias_mes?: number | null
          economia_anual?: number | null
          economia_mensal?: number | null
          id?: string
          materias_primas?: Json
          nome_restaurante: string
          refeicoes_dia?: number | null
          resultado_analise?: Json | null
          updated_at?: string
          url_cardapio?: string | null
          vendedor_id: string
        }
        Update: {
          created_at?: string
          custo_agua?: number | null
          custo_energia?: number | null
          custo_gordura?: number | null
          custo_mao_obra?: number | null
          dias_mes?: number | null
          economia_anual?: number | null
          economia_mensal?: number | null
          id?: string
          materias_primas?: Json
          nome_restaurante?: string
          refeicoes_dia?: number | null
          resultado_analise?: Json | null
          updated_at?: string
          url_cardapio?: string | null
          vendedor_id?: string
        }
        Relationships: []
      }
      tabelas_preco: {
        Row: {
          ativa: boolean
          created_at: string | null
          gc_tipo_id: string
          id: string
          markup_padrao: number
          nome: string
          principal: boolean
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string | null
          gc_tipo_id: string
          id?: string
          markup_padrao?: number
          nome: string
          principal?: boolean
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string | null
          gc_tipo_id?: string
          id?: string
          markup_padrao?: number
          nome?: string
          principal?: boolean
          updated_at?: string | null
        }
        Relationships: []
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
      visitas: {
        Row: {
          checkin_at: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          checkout_at: string | null
          checkout_lat: number | null
          checkout_lng: number | null
          cliente_id: string
          created_at: string
          data_agendada: string | null
          duracao_minutos: number | null
          fotos: string[] | null
          id: string
          observacoes: string | null
          oportunidade_id: string | null
          proxima_acao: string | null
          proxima_data: string | null
          resultado: string | null
          satisfacao: number | null
          status: string
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          cliente_id: string
          created_at?: string
          data_agendada?: string | null
          duracao_minutos?: number | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          proxima_acao?: string | null
          proxima_data?: string | null
          resultado?: string | null
          satisfacao?: number | null
          status?: string
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          cliente_id?: string
          created_at?: string
          data_agendada?: string | null
          duracao_minutos?: number | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          proxima_acao?: string | null
          proxima_data?: string | null
          resultado?: string | null
          satisfacao?: number | null
          status?: string
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      wai_conversas: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          custo_estimado_usd: number | null
          id: string
          modelo: string | null
          modo: string
          oportunidade_id: string | null
          pergunta: string
          resposta: string
          tokens_prompt: number | null
          tokens_resposta: number | null
          tokens_total: number | null
          usuario_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string | null
          custo_estimado_usd?: number | null
          id?: string
          modelo?: string | null
          modo?: string
          oportunidade_id?: string | null
          pergunta: string
          resposta: string
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          usuario_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string | null
          custo_estimado_usd?: number | null
          id?: string
          modelo?: string | null
          modo?: string
          oportunidade_id?: string | null
          pergunta?: string
          resposta?: string
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wai_conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wai_conversas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wai_conversas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wai_conversas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      wai_log: {
        Row: {
          criado_em: string | null
          custo_estimado_usd: number | null
          id: string
          modo: string | null
          tokens_prompt: number | null
          tokens_resposta: number | null
          tokens_total: number | null
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string | null
          custo_estimado_usd?: number | null
          id?: string
          modo?: string | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string | null
          custo_estimado_usd?: number | null
          id?: string
          modo?: string | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wai_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wai_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "wai_custo_mes"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
    }
    Views: {
      prospects_stats: {
        Row: {
          cnae_codigo: string | null
          cnae_descricao: string | null
          com_email: number | null
          com_telefone: number | null
          geocodificados: number | null
          ja_clientes: number | null
          regime_fiscal: string | null
          total: number | null
          uf: string | null
        }
        Relationships: []
      }
      wai_custo_mes: {
        Row: {
          chamadas: number | null
          custo_usd: number | null
          nome: string | null
          tokens_total: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      atualizar_segmentos_clientes: { Args: never; Returns: undefined }
      get_team_members: {
        Args: never
        Returns: {
          email: string
          id: string
          nome: string
          perfil: string
        }[]
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
      marcar_prospects_clientes: { Args: never; Returns: undefined }
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
