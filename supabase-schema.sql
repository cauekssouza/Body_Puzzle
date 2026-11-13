-- ============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS — BODY PUZZLE (Supabase / PostgreSQL)
-- ============================================================================

-- 1. ALUNOS
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  telefone text,
  ativo boolean not null default true,
  valor_mensal numeric(10, 2),
  dia_vencimento integer check (dia_vencimento between 1 and 31),
  criado_em timestamptz not null default now()
);

alter table public.alunos add column if not exists ativo boolean not null default true;
alter table public.alunos add column if not exists valor_mensal numeric(10, 2);
alter table public.alunos add column if not exists dia_vencimento integer;

-- 2. ANAMNESES (1 por aluno, editável, 7 blocos + triagem de risco)
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  data_nascimento date,
  sexo char(1) check (sexo in ('M', 'F')),
  dados_completos jsonb not null default '{}'::jsonb,
  situacao_triagem text check (situacao_triagem in ('verde', 'laranja', 'vermelho')),
  liberacao_medica boolean not null default false,
  data_liberacao date,
  anexo_liberacao text,
  condicoes_medicas text,
  gatilhos_sensoriais text,
  medicamentos text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.anamneses add column if not exists data_nascimento date;
alter table public.anamneses add column if not exists sexo char(1);
alter table public.anamneses add column if not exists dados_completos jsonb not null default '{}'::jsonb;
alter table public.anamneses add column if not exists situacao_triagem text;
alter table public.anamneses add column if not exists liberacao_medica boolean not null default false;
alter table public.anamneses add column if not exists data_liberacao date;
alter table public.anamneses add column if not exists anexo_liberacao text;
alter table public.anamneses add column if not exists atualizado_em timestamptz not null default now();

-- 3. AVALIAÇÕES FÍSICAS E CARTA TRUNFO
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  data_avaliacao date not null,
  avaliador text,
  objetivos text[] default '{}',
  idade integer,
  sexo char(1),
  massa numeric(6, 2),
  estatura numeric(4, 2),
  perc_gordura numeric(5, 2),
  antropometria jsonb not null default '{}'::jsonb,
  movimento jsonb not null default '{}'::jsonb,
  mobilidade jsonb not null default '{}'::jsonb,
  potencia jsonb not null default '{}'::jsonb,
  forca jsonb not null default '{}'::jsonb,
  resistencia jsonb not null default '{}'::jsonb,
  comentarios text,
  notas_carta jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.avaliacoes add column if not exists avaliador text;
alter table public.avaliacoes add column if not exists objetivos text[] default '{}';
alter table public.avaliacoes add column if not exists idade integer;
alter table public.avaliacoes add column if not exists sexo char(1);
alter table public.avaliacoes add column if not exists antropometria jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists movimento jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists mobilidade jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists potencia jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists forca jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists resistencia jsonb not null default '{}'::jsonb;
alter table public.avaliacoes add column if not exists comentarios text;
alter table public.avaliacoes add column if not exists notas_carta jsonb not null default '{}'::jsonb;

-- 4. BIBLIOTECA DE EXERCÍCIOS (168 exercícios + chave única nome + padrao)
create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome varchar not null,
  padrao varchar not null,
  subpadrao varchar,
  nivel numeric,
  ordem numeric,
  tipo varchar not null default 'Força',
  equipamentos text[] default '{}',
  equipamento_original text,
  adaptacoes text,
  pontos_atencao text,
  criterios_progressao text,
  observacoes text,
  status varchar not null default 'Metodologia',
  midia_url text,
  criado_em timestamptz not null default now(),
  unique (nome, padrao)
);

-- 5. MESOCICLOS E TREINOS
create table if not exists public.mesociclos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  nome text not null,
  data_inicio date,
  semanas integer,
  data_fim date,
  objetivo text,
  frequencia integer,
  status text default 'Ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  mesociclo_id uuid references public.mesociclos(id) on delete set null,
  titulo text,
  exercicios text,
  itens_estruturados jsonb default '[]'::jsonb,
  observacoes_sensoriais text,
  criado_em timestamptz not null default now()
);

alter table public.treinos add column if not exists itens_estruturados jsonb default '[]'::jsonb;

-- 6. PAGAMENTOS
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  referencia text not null, -- formato MM/AAAA
  valor numeric(10, 2) not null,
  data_pagamento date not null,
  forma text not null default 'Pix',
  observacao text,
  registrado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
