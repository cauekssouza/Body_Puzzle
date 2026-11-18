-- =============================================================================
-- BODY PUZZLE — MIGRATION: PROGRESSÃO DE CARGA, SESSÕES E CALENDÁRIO DO MESOCICLO
-- (Seções 3, 4, 5 e 6 da Especificação de 18/11/2026)
-- Execute este script no SQL Editor do Supabase (Run).
-- Script 100% idempotente: pode ser executado múltiplas vezes com segurança.
-- =============================================================================

begin;

-- =============================================================================
-- 1. COLUNAS COMPLEMENTARES EM mesociclos E treinos (SEÇÃO 6)
-- =============================================================================

alter table public.mesociclos
  add column if not exists observacoes text default null;

alter table public.mesociclos
  add column if not exists excluido_em timestamptz default null;

alter table public.treinos
  add column if not exists ordem integer default null;

alter table public.treinos
  add column if not exists excluido_em timestamptz default null;

alter table public.treinos
  add column if not exists duracao_aquecimento_min integer default null;

alter table public.treinos
  add column if not exists updated_at timestamptz default now();

alter table public.treinos
  add column if not exists ultima_edicao_em timestamptz default null;

alter table public.treinos
  add column if not exists ultima_edicao_por uuid references auth.users(id) on delete set null;

alter table public.treinos
  add column if not exists ultima_edicao_por_nome text default null;

alter table public.treinos
  add column if not exists ultima_edicao_aula_em timestamptz default null;

alter table public.treinos
  add column if not exists ultima_edicao_aula_por uuid references auth.users(id) on delete set null;

alter table public.treinos
  add column if not exists ultima_edicao_aula_por_nome text default null;

-- =============================================================================
-- 2. TABELAS sessoes E sessao_itens (SEÇÃO 3)
-- Compatíveis automaticamente com o tipo de ID das tabelas existentes (uuid ou bigint)
-- =============================================================================

do $$
declare
  v_aluno_id_type text;
  v_mesociclo_id_type text;
  v_treino_id_type text;
  v_item_treino_id_type text;
  v_exercicio_id_type text;
begin
  select data_type into v_aluno_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'alunos' and column_name = 'id';

  select data_type into v_mesociclo_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'mesociclos' and column_name = 'id';

  select data_type into v_treino_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'treinos' and column_name = 'id';

  select data_type into v_item_treino_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'itens_treino' and column_name = 'id';

  select data_type into v_exercicio_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'exercicios' and column_name = 'id';

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sessoes'
  ) then
    execute format('
      create table public.sessoes (
        id uuid primary key default gen_random_uuid(),
        aluno_id %s not null references public.alunos(id) on delete cascade,
        mesociclo_id %s references public.mesociclos(id) on delete set null,
        treino_id %s not null references public.treinos(id) on delete cascade,
        data date not null default current_date,
        semana integer,
        professor_id uuid references auth.users(id) on delete set null,
        professor_nome text,
        observacao text,
        itens_texto_feitos jsonb default ''[]''::jsonb,
        excluido_em timestamptz,
        criado_em timestamptz default now()
      )',
      coalesce(v_aluno_id_type, 'uuid'),
      coalesce(v_mesociclo_id_type, 'uuid'),
      coalesce(v_treino_id_type, 'uuid')
    );
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sessao_itens'
  ) then
    execute format('
      create table public.sessao_itens (
        id uuid primary key default gen_random_uuid(),
        sessao_id uuid not null references public.sessoes(id) on delete cascade,
        item_treino_id %s references public.itens_treino(id) on delete set null,
        exercicio_id %s not null references public.exercicios(id),
        ordem integer default 0,
        series integer,
        repeticoes text,
        carga_kg numeric(6,2),
        observacao text
      )',
      coalesce(v_item_treino_id_type, 'uuid'),
      coalesce(v_exercicio_id_type, 'uuid')
    );
  end if;
end $$;

alter table public.sessoes add column if not exists semana integer;
alter table public.sessoes add column if not exists professor_id uuid references auth.users(id) on delete set null;
alter table public.sessoes add column if not exists professor_nome text;
alter table public.sessoes add column if not exists observacao text;
alter table public.sessoes add column if not exists itens_texto_feitos jsonb default '[]'::jsonb;
alter table public.sessoes add column if not exists excluido_em timestamptz;
alter table public.sessoes add column if not exists criado_em timestamptz default now();

alter table public.sessao_itens add column if not exists ordem integer default 0;
alter table public.sessao_itens add column if not exists series integer;
alter table public.sessao_itens add column if not exists repeticoes text;
alter table public.sessao_itens add column if not exists carga_kg numeric(6,2);
alter table public.sessao_itens add column if not exists observacao text;

create index if not exists idx_sessoes_aluno_data on public.sessoes (aluno_id, data);
create index if not exists idx_sessoes_mesociclo on public.sessoes (mesociclo_id, semana);
create index if not exists idx_sessoes_excluido_em on public.sessoes (excluido_em);
create index if not exists idx_sessao_itens_exercicio on public.sessao_itens (exercicio_id);
create index if not exists idx_sessao_itens_sessao on public.sessao_itens (sessao_id);

-- =============================================================================
-- 3. POLÍTICAS DE RLS (PROFESSORES E ALUNOS LOGADOS - SEÇÃO 3)
-- =============================================================================

alter table public.sessoes enable row level security;
alter table public.sessao_itens enable row level security;

drop policy if exists "Professores gerenciam sessoes" on public.sessoes;
create policy "Professores gerenciam sessoes"
  on public.sessoes for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

drop policy if exists "Aluno visualiza proprias sessoes" on public.sessoes;
create policy "Aluno visualiza proprias sessoes"
  on public.sessoes for select
  to authenticated
  using (
    excluido_em is null
    and exists (
      select 1 from public.alunos a
      where a.id::text = sessoes.aluno_id::text
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "Professores gerenciam sessao_itens" on public.sessao_itens;
create policy "Professores gerenciam sessao_itens"
  on public.sessao_itens for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

drop policy if exists "Aluno visualiza proprios sessao_itens" on public.sessao_itens;
create policy "Aluno visualiza proprios sessao_itens"
  on public.sessao_itens for select
  to authenticated
  using (
    exists (
      select 1
      from public.sessoes s
      join public.alunos a on a.id::text = s.aluno_id::text
      where s.id = sessao_itens.sessao_id
        and s.excluido_em is null
        and a.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

commit;
