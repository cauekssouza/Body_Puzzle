-- =============================================================================
-- BODY PUZZLE — MIGRATION: PRESCRIÇÃO E EXPOSIÇÃO DE TREINOS (SEÇÕES 3.1, 6, 7, 8 e 9)
-- Execute este script no SQL Editor do Supabase (Run).
-- Script 100% idempotente: pode ser executado múltiplas vezes com segurança.
-- =============================================================================

begin;

-- =============================================================================
-- 1. SOFT DELETE (LIXEIRA) EM mesociclos E treinos (SEÇÃO 3.1)
-- =============================================================================

alter table public.mesociclos
  add column if not exists excluido_em timestamptz default null;

alter table public.treinos
  add column if not exists excluido_em timestamptz default null;

create index if not exists idx_mesociclos_excluido_em on public.mesociclos (excluido_em);
create index if not exists idx_treinos_excluido_em on public.treinos (excluido_em);

-- Atualiza políticas de leitura dos alunos para ocultar itens na lixeira
drop policy if exists "Aluno visualiza proprios mesociclos" on public.mesociclos;
create policy "Aluno visualiza proprios mesociclos"
  on public.mesociclos for select
  to authenticated
  using (
    excluido_em is null
    and exists (
      select 1 from public.alunos a
      where a.id::text = mesociclos.aluno_id::text
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "Aluno visualiza proprios treinos" on public.treinos;
create policy "Aluno visualiza proprios treinos"
  on public.treinos for select
  to authenticated
  using (
    excluido_em is null
    and (
      treinos.user_id = auth.uid()
      or exists (
        select 1 from public.alunos a
        where a.id::text = treinos.aluno_id::text
          and a.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- 2. BLOCO DE AQUECIMENTO (bloco = 0) E TIPOS EM itens_treino / treinos (SEÇÃO 7)
-- =============================================================================

alter table public.treinos
  add column if not exists duracao_aquecimento_min integer default null;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'blocos'
  ) then
    alter table public.blocos
      add column if not exists duracao_aquecimento_min integer default null;
  end if;
end $$;

-- Garante que itens_treino aceite bloco = '0' (Aquecimento), exercicio_id nulo e tipo in ('exercicio', 'cardio', 'texto')
alter table public.itens_treino add column if not exists tipo text not null default 'exercicio';
alter table public.itens_treino add column if not exists bloco text;
alter table public.itens_treino add column if not exists ordem integer default 0;
alter table public.itens_treino add column if not exists series text;
alter table public.itens_treino add column if not exists repeticoes text;
alter table public.itens_treino add column if not exists carga text;
alter table public.itens_treino add column if not exists intervalo text;
alter table public.itens_treino add column if not exists observacao text;
alter table public.itens_treino add column if not exists titulo text;
alter table public.itens_treino add column if not exists descricao text;
alter table public.itens_treino add column if not exists duracao_min integer;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'itens_treino'
      and column_name = 'exercicio_id'
      and is_nullable = 'NO'
  ) then
    alter table public.itens_treino alter column exercicio_id drop not null;
  end if;
end $$;

-- Remove constraints antigas de tipo ou bloco se existirem e recria constraint permitindo ('exercicio', 'cardio', 'texto')
do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.itens_treino'::regclass
      and contype = 'c'
      and (conname ilike '%tipo%' or conname ilike '%bloco%')
  ) loop
    execute format('alter table public.itens_treino drop constraint if exists %I', r.conname);
  end loop;

  alter table public.itens_treino
    add constraint itens_treino_tipo_check
    check (tipo in ('exercicio', 'cardio', 'texto'));
end $$;

-- =============================================================================
-- 3. AUDITORIA, HISTÓRICO E RPC salvar_edicao_exposicao (SEÇÃO 9)
-- =============================================================================

alter table public.treinos
  add column if not exists updated_at timestamptz default now();

alter table public.treinos
  add column if not exists ultima_edicao_aula_em timestamptz default null;

alter table public.treinos
  add column if not exists ultima_edicao_aula_por uuid references auth.users(id) on delete set null;

alter table public.treinos
  add column if not exists ultima_edicao_aula_por_nome text default null;

alter table public.treinos
  add column if not exists ultima_execucao_em timestamptz default null;

update public.treinos
set updated_at = coalesce(updated_at, criado_em, now())
where updated_at is null;

-- Trigger para atualizar updated_at automaticamente em public.treinos
create or replace function public.set_treinos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_treinos_set_updated_at on public.treinos;
create trigger trg_treinos_set_updated_at
  before update on public.treinos
  for each row
  execute function public.set_treinos_updated_at();

-- Criação da tabela treinos_historico compatível com o tipo de treinos.id (uuid ou bigint)
do $$
declare
  v_treino_id_type text;
begin
  select data_type into v_treino_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'treinos'
    and column_name = 'id';

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'treinos_historico'
  ) then
    execute format('
      create table public.treinos_historico (
        id uuid primary key default gen_random_uuid(),
        treino_id %s not null references public.treinos(id) on delete cascade,
        professor_id uuid references auth.users(id) on delete set null,
        professor_nome text,
        snapshot_itens jsonb not null default ''[]''::jsonb,
        criado_em timestamptz not null default now()
      )',
      coalesce(v_treino_id_type, 'uuid')
    );
  end if;
end $$;

alter table public.treinos_historico add column if not exists professor_id uuid references auth.users(id) on delete set null;
alter table public.treinos_historico add column if not exists professor_nome text;
alter table public.treinos_historico add column if not exists snapshot_itens jsonb not null default '[]'::jsonb;
alter table public.treinos_historico add column if not exists criado_em timestamptz not null default now();

create index if not exists idx_treinos_historico_treino_id on public.treinos_historico (treino_id, criado_em desc);

alter table public.treinos_historico enable row level security;

drop policy if exists "Professores gerenciam treinos_historico" on public.treinos_historico;
create policy "Professores gerenciam treinos_historico"
  on public.treinos_historico for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

-- RPC transacional: salvar_edicao_exposicao
-- Valida concorrência via updated_at, grava snapshot anterior em treinos_historico,
-- substitui os itens em itens_treino e atualiza o treino com metadados de auditoria.
create or replace function public.salvar_edicao_exposicao(
  p_treino_id text,
  p_itens_estruturados jsonb,
  p_exercicios_texto text default null,
  p_duracao_aquecimento_min integer default null,
  p_expected_updated_at timestamptz default null,
  p_professor_nome text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_treino public.treinos%rowtype;
  v_treino_atualizado public.treinos%rowtype;
  v_prof_nome text;
begin
  if not public.is_professor() then
    raise exception 'Acesso negado: apenas professores podem salvar alterações de treino durante a exposição.';
  end if;

  select *
  into v_treino
  from public.treinos
  where id::text = p_treino_id
  for update;

  if not found then
    raise exception 'Treino não encontrado (ID: %).', p_treino_id;
  end if;

  -- Validação de conflito de edição simultânea (optimistic locking por updated_at)
  if p_expected_updated_at is not null and v_treino.updated_at is not null then
    if abs(extract(epoch from (v_treino.updated_at - p_expected_updated_at))) > 1 then
      raise exception 'CONFLITO_CONCORRENCIA: Este treino foi modificado em outro dispositivo ou aba (atualizado em %). Recarregue antes de salvar.',
        to_char(v_treino.updated_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS')
        using errcode = '40001';
    end if;
  end if;

  v_prof_nome := coalesce(
    nullif(trim(p_professor_nome), ''),
    nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
    'Professor'
  );

  -- 1. Salva snapshot anterior em treinos_historico
  insert into public.treinos_historico (
    treino_id,
    professor_id,
    professor_nome,
    snapshot_itens,
    criado_em
  )
  values (
    v_treino.id,
    auth.uid(),
    v_prof_nome,
    coalesce(v_treino.itens_estruturados, '[]'::jsonb),
    now()
  );

  -- 2. Substitui os itens na tabela itens_treino
  delete from public.itens_treino
  where treino_id = v_treino.id;

  if jsonb_typeof(coalesce(p_itens_estruturados, '[]'::jsonb)) = 'array'
     and jsonb_array_length(coalesce(p_itens_estruturados, '[]'::jsonb)) > 0 then
    insert into public.itens_treino (
      treino_id,
      exercicio_id,
      tipo,
      bloco,
      ordem,
      series,
      repeticoes,
      carga,
      intervalo,
      observacao,
      titulo,
      descricao,
      duracao_min
    )
    select
      v_treino.id,
      case
        when (item ->> 'exercicio_id') is not null
         and (item ->> 'exercicio_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (item ->> 'exercicio_id')::uuid
        else null
      end,
      case
        when coalesce(item ->> 'tipo', 'exercicio') in ('exercicio', 'cardio', 'texto')
        then coalesce(item ->> 'tipo', 'exercicio')
        else 'exercicio'
      end,
      coalesce(item ->> 'bloco', '1'),
      coalesce((item ->> 'ordem')::integer, ord::integer),
      nullif(item ->> 'series', ''),
      nullif(item ->> 'repeticoes', ''),
      nullif(item ->> 'carga', ''),
      nullif(item ->> 'intervalo', ''),
      nullif(item ->> 'observacao', ''),
      coalesce(nullif(item ->> 'titulo', ''), nullif(item ->> 'nome', '')),
      nullif(item ->> 'descricao', ''),
      case
        when (item ->> 'duracao_min') is not null and (item ->> 'duracao_min') ~ '^[0-9]+$'
        then (item ->> 'duracao_min')::integer
        else null
      end
    from jsonb_array_elements(p_itens_estruturados) with ordinality as t(item, ord);
  end if;

  -- 3. Atualiza o treino e metadados de auditoria
  update public.treinos
  set
    itens_estruturados = coalesce(p_itens_estruturados, '[]'::jsonb),
    exercicios = coalesce(p_exercicios_texto, exercicios),
    duracao_aquecimento_min = p_duracao_aquecimento_min,
    ultima_edicao_aula_em = now(),
    ultima_edicao_aula_por = auth.uid(),
    ultima_edicao_aula_por_nome = v_prof_nome,
    updated_at = now()
  where id = v_treino.id
  returning * into v_treino_atualizado;

  return to_jsonb(v_treino_atualizado);
end;
$$;

grant execute on function public.salvar_edicao_exposicao(text, jsonb, text, integer, timestamptz, text) to authenticated;

-- =============================================================================
-- 4. PROGRESSÃO DE CARGA E CALENDÁRIO DO MESOCICLO: sessoes E sessao_itens (SEÇÕES 3, 4, 5 e 6)
-- =============================================================================

alter table public.mesociclos
  add column if not exists observacoes text default null;

alter table public.treinos
  add column if not exists ordem integer default null;

alter table public.treinos
  add column if not exists ultima_edicao_em timestamptz default null;

alter table public.treinos
  add column if not exists ultima_edicao_por uuid references auth.users(id) on delete set null;

alter table public.treinos
  add column if not exists ultima_edicao_por_nome text default null;

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
