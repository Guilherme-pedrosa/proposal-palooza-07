
-- USUÁRIOS E PERFIS
create table public.usuarios (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  email text not null,
  perfil text not null check (perfil in ('vendedor','gestor','admin')),
  telefone text,
  avatar_url text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- CLIENTES (sincronizados do GestãoClick)
create table public.clientes_gc (
  id uuid primary key default gen_random_uuid(),
  gc_id text unique not null,
  tipo_pessoa text check (tipo_pessoa in ('PF','PJ','ES')),
  nome text not null,
  razao_social text,
  cnpj text,
  cpf text,
  telefone text,
  celular text,
  email text,
  cidade text,
  estado text,
  endereco text,
  segmento text,
  porte text check (porte in ('pequeno','medio','grande','rede')),
  observacoes text,
  ativo boolean default true,
  ultima_compra_gc date,
  total_compras_gc numeric(12,2) default 0,
  gc_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRODUTOS (sincronizados do GestãoClick)
create table public.produtos_gc (
  id uuid primary key default gen_random_uuid(),
  gc_id text unique not null,
  codigo text,
  nome text not null,
  descricao text,
  categoria text,
  tipo text check (tipo in ('produto','servico')),
  preco_venda numeric(12,2),
  preco_locacao_mensal numeric(12,2),
  unidade text default 'UN',
  estoque_atual numeric(10,2) default 0,
  estoque_minimo numeric(10,2) default 0,
  foto_url text,
  fotos_urls text[] default '{}',
  ficha_tecnica_url text,
  destaque boolean default false,
  ativo boolean default true,
  gc_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MOTIVOS DE PERDA
create table public.motivos_perda (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  ativo boolean default true
);

-- OPORTUNIDADES
create table public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  titulo text not null,
  cliente_id uuid references public.clientes_gc(id),
  vendedor_id uuid references public.usuarios(id),
  etapa text not null default 'prospeccao' check (etapa in (
    'prospeccao','qualificacao','visita_tecnica',
    'proposta_enviada','negociacao','fechado_ganho','fechado_perdido'
  )),
  tipo_venda text check (tipo_venda in (
    'equipamento_novo','locacao','contrato_pcm','manutencao_avulsa',
    'higienizacao_coifa','quimicos','instalacao','treinamento','projeto_completo'
  )),
  valor_estimado numeric(12,2) default 0,
  probabilidade integer default 20 check (probabilidade between 0 and 100),
  data_fechamento_prevista date,
  motivo_perda_id uuid references public.motivos_perda(id),
  descricao_perda text,
  origem text check (origem in (
    'indicacao','visita_espontanea','prospeccao_ativa',
    'inbound_site','whatsapp','email','reativacao','renovacao_contrato'
  )),
  gc_orcamento_id text,
  gc_orcamento_url text,
  temperatura text check (temperatura in ('frio','morno','quente')) default 'frio',
  produtos_interesse uuid[] default '{}',
  ultima_atividade_em timestamptz,
  checklist_etapa jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ATIVIDADES
create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid references public.oportunidades(id),
  cliente_id uuid references public.clientes_gc(id),
  vendedor_id uuid references public.usuarios(id),
  tipo text not null check (tipo in (
    'ligacao','visita_tecnica','demo_produto','envio_proposta',
    'followup','email','whatsapp','reuniao_online','tarefa','nota'
  )),
  titulo text not null,
  descricao text,
  data_prevista timestamptz,
  data_realizada timestamptz,
  duracao_minutos integer,
  resultado text,
  proxima_acao text,
  proxima_data timestamptz,
  concluida boolean default false,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz default now()
);

-- PROPOSTAS CRM (nova tabela, separada da existente 'proposals')
create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  versao integer not null default 1,
  historico_versoes jsonb default '[]',
  oportunidade_id uuid references public.oportunidades(id),
  cliente_id uuid references public.clientes_gc(id),
  vendedor_id uuid references public.usuarios(id),
  titulo text not null,
  descricao text,
  template_id text,
  produtos jsonb not null default '[]',
  termos_condicoes jsonb not null default '[]',
  imagens jsonb default '[]',
  valor_total numeric(12,2) default 0,
  desconto_total numeric(12,2) default 0,
  validade_dias integer default 15,
  validade_ate date,
  status text default 'rascunho' check (status in (
    'rascunho','enviada','visualizada','aprovada','recusada','expirada','cancelada'
  )),
  aberto_em timestamptz,
  aberto_por_ip text,
  aberto_contagem integer default 0,
  link_publico_uuid uuid default gen_random_uuid(),
  pdf_url text,
  gc_orcamento_id text,
  gc_orcamento_url text,
  observacoes_internas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- METAS
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid references public.usuarios(id),
  mes integer not null,
  ano integer not null,
  meta_valor numeric(12,2) not null,
  meta_propostas integer default 0,
  meta_visitas integer default 0,
  unique(vendedor_id, mes, ano)
);

-- LOG DE SYNC GC
create table public.gc_sync_log (
  id uuid primary key default gen_random_uuid(),
  entidade text not null check (entidade in ('clientes','produtos','orcamento')),
  acao text not null,
  gc_id text,
  status text check (status in ('sucesso','erro','parcial')),
  detalhes jsonb,
  created_at timestamptz default now()
);

-- ÍNDICES
create index idx_oportunidades_etapa on public.oportunidades(etapa);
create index idx_oportunidades_vendedor on public.oportunidades(vendedor_id);
create index idx_oportunidades_cliente on public.oportunidades(cliente_id);
create index idx_atividades_vendedor_data on public.atividades(vendedor_id, data_prevista);
create index idx_propostas_link on public.propostas(link_publico_uuid);
create index idx_clientes_gc_gcid on public.clientes_gc(gc_id);
create index idx_produtos_gc_gcid on public.produtos_gc(gc_id);

-- SEEDS — MOTIVOS DE PERDA
insert into public.motivos_perda (descricao) values
  ('Preço acima do esperado'),
  ('Escolheu concorrente'),
  ('Sem orçamento aprovado'),
  ('Decisão adiada sem previsão'),
  ('Sem aprovação interna'),
  ('Escopo não atendido pela WeDo'),
  ('Interlocutor saiu da empresa'),
  ('Resolveu o problema internamente'),
  ('Não tinha necessidade real — qualificação errada'),
  ('Projeto cancelado pelo cliente');

-- RLS
alter table public.usuarios enable row level security;
alter table public.clientes_gc enable row level security;
alter table public.produtos_gc enable row level security;
alter table public.oportunidades enable row level security;
alter table public.atividades enable row level security;
alter table public.propostas enable row level security;
alter table public.metas enable row level security;
alter table public.gc_sync_log enable row level security;
alter table public.motivos_perda enable row level security;

-- RLS POLICIES
-- Usuarios: cada um vê o seu próprio perfil
create policy "usuario_ve_proprio_perfil" on public.usuarios
  for select using (id = auth.uid());

create policy "usuario_atualiza_proprio_perfil" on public.usuarios
  for update using (id = auth.uid());

-- Oportunidades: vendedor vê as suas
create policy "vendedor_ve_proprias_oportunidades" on public.oportunidades
  for all using (vendedor_id = auth.uid());

-- Atividades: vendedor vê as suas
create policy "vendedor_ve_proprias_atividades" on public.atividades
  for all using (vendedor_id = auth.uid());

-- Propostas CRM: vendedor vê as suas
create policy "vendedor_ve_proprias_propostas" on public.propostas
  for all using (vendedor_id = auth.uid());

-- Metas: vendedor vê as suas
create policy "vendedor_ve_proprias_metas" on public.metas
  for all using (vendedor_id = auth.uid());

-- Catálogo e clientes: todos os autenticados podem ler
create policy "autenticados_leem_clientes_gc" on public.clientes_gc
  for select using (auth.role() = 'authenticated');

create policy "autenticados_escrevem_clientes_gc" on public.clientes_gc
  for insert with check (auth.role() = 'authenticated');

create policy "autenticados_atualizam_clientes_gc" on public.clientes_gc
  for update using (auth.role() = 'authenticated');

create policy "autenticados_leem_produtos" on public.produtos_gc
  for select using (auth.role() = 'authenticated');

create policy "autenticados_leem_motivos_perda" on public.motivos_perda
  for select using (auth.role() = 'authenticated');

-- GC Sync Log: autenticados podem ler e inserir
create policy "autenticados_leem_sync_log" on public.gc_sync_log
  for select using (auth.role() = 'authenticated');

create policy "autenticados_inserem_sync_log" on public.gc_sync_log
  for insert with check (auth.role() = 'authenticated');

-- Trigger para updated_at nas novas tabelas
create trigger update_clientes_gc_updated_at before update on public.clientes_gc
  for each row execute function public.update_updated_at_column();

create trigger update_produtos_gc_updated_at before update on public.produtos_gc
  for each row execute function public.update_updated_at_column();

create trigger update_oportunidades_updated_at before update on public.oportunidades
  for each row execute function public.update_updated_at_column();

create trigger update_propostas_updated_at before update on public.propostas
  for each row execute function public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'perfil', 'vendedor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
