-- =============================================================================
-- BODY PUZZLE — SCRIPT CONSOLIDADO DE CORREÇÕES (SEÇÃO 2) E MELHORIAS (SEÇÕES 4 e 5)
-- Execute este script completo no SQL Editor do Supabase (Run).
-- Ele é idempotente: pode ser rodado mais de uma vez com segurança.
-- =============================================================================

begin;

-- =============================================================================
-- 1. FUNÇÃO is_professor() E TABELA perfis (ERRO 2.1)
-- =============================================================================

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'aluno',
  created_at timestamptz default now()
);

alter table public.perfis enable row level security;

drop policy if exists "Usuarios leem proprio perfil ou professor le todos" on public.perfis;
create policy "Usuarios leem proprio perfil ou professor le todos"
  on public.perfis for select
  to authenticated
  using (id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'cauekssouza@gmail.com',
    'bodypuzzle.treinamento@gmail.com',
    'edususs@yahoo.com.br',
    'andre.goncalves03@hotmail.com'
  ));

create or replace function public.is_professor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_email in (
    'cauekssouza@gmail.com',
    'bodypuzzle.treinamento@gmail.com',
    'edususs@yahoo.com.br',
    'andre.goncalves03@hotmail.com'
  ) then
    return true;
  end if;

  select role into v_role
  from public.perfis
  where id = auth.uid();

  if v_role in ('admin', 'professor') then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.is_professor() to authenticated, anon;

-- =============================================================================
-- 2. TABELA exercicios — COLUNAS DA BIBLIOTECA E RLS (ERROS 2.2 e 2.3)
-- =============================================================================

create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  padrao text not null,
  subpadrao text,
  nivel integer,
  ordem integer,
  tipo text default 'Força',
  equipamentos text[] default '{}',
  equipamento_original text,
  adaptacoes text,
  pontos_atencao text,
  criterios_progressao text,
  observacoes text,
  status text default 'Metodologia',
  midia_url text,
  created_at timestamptz default now()
);

alter table public.exercicios add column if not exists nome text;
alter table public.exercicios add column if not exists padrao text;
alter table public.exercicios add column if not exists subpadrao text;
alter table public.exercicios add column if not exists nivel integer;
alter table public.exercicios add column if not exists ordem integer;
alter table public.exercicios add column if not exists tipo text default 'Força';
alter table public.exercicios add column if not exists equipamentos text[] default '{}';
alter table public.exercicios add column if not exists equipamento_original text;
alter table public.exercicios add column if not exists adaptacoes text;
alter table public.exercicios add column if not exists pontos_atencao text;
alter table public.exercicios add column if not exists criterios_progressao text;
alter table public.exercicios add column if not exists observacoes text;
alter table public.exercicios add column if not exists status text default 'Metodologia';
alter table public.exercicios add column if not exists midia_url text;
alter table public.exercicios add column if not exists created_at timestamptz default now();

-- Garante que nenhum exercício fique com status nulo ou equipamentos nulo
update public.exercicios set status = 'Metodologia' where status is null or trim(status) = '';
update public.exercicios set equipamentos = '{}' where equipamentos is null;

-- Garante constraint UNIQUE (nome, padrao) para importação do biblioteca-exercicios.csv via upsert
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.exercicios'::regclass
      and contype = 'u'
      and conname = 'exercicios_nome_padrao_key'
  ) then
    -- Remove eventuais duplicatas exatas mantendo o registro mais antigo antes de criar a constraint
    delete from public.exercicios a
    using public.exercicios b
    where a.ctid > b.ctid
      and a.nome = b.nome
      and a.padrao = b.padrao;

    alter table public.exercicios
      add constraint exercicios_nome_padrao_key unique (nome, padrao);
  end if;
exception
  when others then
    raise notice 'Constraint unique (nome, padrao) ja existente ou ignorada: %', sqlerrm;
end $$;

alter table public.exercicios enable row level security;

drop policy if exists "Professores podem ler exercicios" on public.exercicios;
drop policy if exists "Professores podem inserir exercicios" on public.exercicios;
drop policy if exists "Professores gerenciam exercicios" on public.exercicios;
drop policy if exists "Usuarios autenticados leem exercicios" on public.exercicios;

-- Política SELECT para professores e autenticados
create policy "Usuarios autenticados leem exercicios"
  on public.exercicios for select
  to authenticated
  using (true);

-- Política FOR ALL (incluindo INSERT, UPDATE, DELETE) para professores
create policy "Professores gerenciam exercicios"
  on public.exercicios for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

-- =============================================================================
-- 3. TABELA mesociclos — ESTRUTURA, ORIGEM DE CÓPIA E RLS (ERRO 2.1 e MELHORIA 4)
-- =============================================================================

create table if not exists public.mesociclos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid,
  nome text not null,
  data_inicio date,
  semanas integer,
  data_fim date,
  objetivo text,
  frequencia integer,
  status text default 'Ativo',
  created_at timestamptz default now()
);

alter table public.mesociclos add column if not exists nome text;
alter table public.mesociclos add column if not exists data_inicio date;
alter table public.mesociclos add column if not exists semanas integer;
alter table public.mesociclos add column if not exists data_fim date;
alter table public.mesociclos add column if not exists objetivo text;
alter table public.mesociclos add column if not exists frequencia integer;
alter table public.mesociclos add column if not exists status text default 'Ativo';
alter table public.mesociclos add column if not exists created_at timestamptz default now();

-- Adiciona coluna copiado_de_mesociclo_id respeitando o tipo da PK de mesociclos (uuid ou bigint)
do $$
declare
  v_id_type text;
begin
  select data_type into v_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'mesociclos'
    and column_name = 'id';

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mesociclos'
      and column_name = 'copiado_de_mesociclo_id'
  ) then
    if v_id_type = 'uuid' then
      execute 'alter table public.mesociclos add column copiado_de_mesociclo_id uuid references public.mesociclos(id) on delete set null';
    else
      execute 'alter table public.mesociclos add column copiado_de_mesociclo_id bigint references public.mesociclos(id) on delete set null';
    end if;
  end if;
end $$;

alter table public.mesociclos enable row level security;

drop policy if exists "Professores gerenciam mesociclos" on public.mesociclos;
drop policy if exists "Aluno visualiza proprios mesociclos" on public.mesociclos;

create policy "Professores gerenciam mesociclos"
  on public.mesociclos for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "Aluno visualiza proprios mesociclos"
  on public.mesociclos for select
  to authenticated
  using (
    exists (
      select 1 from public.alunos a
      where a.id::text = mesociclos.aluno_id::text
        and a.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. TABELA treinos — ESTRUTURA E RLS (ERRO 2.1)
-- =============================================================================

create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid,
  user_id uuid,
  mesociclo_id uuid,
  titulo text,
  exercicios text,
  itens_estruturados jsonb default '[]'::jsonb,
  observacoes_sensoriais text,
  criado_em timestamptz default now()
);

alter table public.treinos add column if not exists aluno_id uuid;
alter table public.treinos add column if not exists user_id uuid;
alter table public.treinos add column if not exists titulo text;
alter table public.treinos add column if not exists exercicios text;
alter table public.treinos add column if not exists itens_estruturados jsonb default '[]'::jsonb;
alter table public.treinos add column if not exists observacoes_sensoriais text;
alter table public.treinos add column if not exists criado_em timestamptz default now();

-- Adiciona mesociclo_id caso não exista, compatível com o tipo de mesociclos.id
do $$
declare
  v_meso_id_type text;
begin
  select data_type into v_meso_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'mesociclos'
    and column_name = 'id';

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'treinos'
      and column_name = 'mesociclo_id'
  ) then
    if v_meso_id_type = 'uuid' then
      execute 'alter table public.treinos add column mesociclo_id uuid references public.mesociclos(id) on delete set null';
    else
      execute 'alter table public.treinos add column mesociclo_id bigint references public.mesociclos(id) on delete set null';
    end if;
  end if;
end $$;

alter table public.treinos enable row level security;

drop policy if exists "Professores gerenciam treinos" on public.treinos;
drop policy if exists "Aluno visualiza proprios treinos" on public.treinos;

create policy "Professores gerenciam treinos"
  on public.treinos for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "Aluno visualiza proprios treinos"
  on public.treinos for select
  to authenticated
  using (
    treinos.user_id = auth.uid()
    or exists (
      select 1 from public.alunos a
      where a.id::text = treinos.aluno_id::text
        and a.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. TABELAS blocos E itens_treino — CARDIO E RLS (ERRO 2.1 e MELHORIA 5)
-- =============================================================================

-- Cria tabela blocos caso não exista (compatível com o tipo de treinos.id)
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
    where table_schema = 'public' and table_name = 'blocos'
  ) then
    if v_treino_id_type = 'uuid' then
      execute '
        create table public.blocos (
          id uuid primary key default gen_random_uuid(),
          treino_id uuid references public.treinos(id) on delete cascade,
          nome text not null default ''Bloco 1'',
          ordem integer default 1,
          created_at timestamptz default now()
        )';
    else
      execute '
        create table public.blocos (
          id bigint generated always as identity primary key,
          treino_id bigint references public.treinos(id) on delete cascade,
          nome text not null default ''Bloco 1'',
          ordem integer default 1,
          created_at timestamptz default now()
        )';
    end if;
  end if;
end $$;

alter table public.blocos enable row level security;

drop policy if exists "Professores gerenciam blocos" on public.blocos;
drop policy if exists "Aluno visualiza proprios blocos" on public.blocos;

create policy "Professores gerenciam blocos"
  on public.blocos for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "Aluno visualiza proprios blocos"
  on public.blocos for select
  to authenticated
  using (true);

-- Cria tabela itens_treino caso não exista e ajusta colunas para suportar bloco cardiorrespiratório (Melhoria 5)
do $$
declare
  v_treino_id_type text;
  v_ex_id_type text;
begin
  select data_type into v_treino_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'treinos' and column_name = 'id';

  select data_type into v_ex_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'exercicios' and column_name = 'id';

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'itens_treino'
  ) then
    execute format('
      create table public.itens_treino (
        id uuid primary key default gen_random_uuid(),
        treino_id %s references public.treinos(id) on delete cascade,
        exercicio_id %s references public.exercicios(id) on delete set null,
        tipo text not null default ''exercicio'',
        bloco text,
        ordem integer default 0,
        series text,
        repeticoes text,
        carga text,
        intervalo text,
        observacao text,
        titulo text,
        descricao text,
        duracao_min integer,
        created_at timestamptz default now()
      )',
      coalesce(v_treino_id_type, 'uuid'),
      coalesce(v_ex_id_type, 'uuid')
    );
  end if;
end $$;

-- Garante que todas as colunas de itens_treino (incluindo cardio) existam e que exercicio_id seja anulável
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
alter table public.itens_treino add column if not exists created_at timestamptz default now();

-- Torna exercicio_id anulável (necessário para itens com tipo = 'cardio')
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

alter table public.itens_treino enable row level security;

drop policy if exists "Professores gerenciam itens_treino" on public.itens_treino;
drop policy if exists "Aluno visualiza proprios itens_treino" on public.itens_treino;

create policy "Professores gerenciam itens_treino"
  on public.itens_treino for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "Aluno visualiza proprios itens_treino"
  on public.itens_treino for select
  to authenticated
  using (
    exists (
      select 1 from public.treinos t
      left join public.alunos a on a.id::text = t.aluno_id::text
      where t.id::text = itens_treino.treino_id::text
        and (t.user_id = auth.uid() or a.user_id = auth.uid())
    )
  );

-- =============================================================================
-- 6. SOFT DELETE (SEÇÃO 3.1), AQUECIMENTO (SEÇÃO 7) E AUDITORIA / EXPOSIÇÃO (SEÇÃO 9)
-- =============================================================================

alter table public.mesociclos
  add column if not exists excluido_em timestamptz default null;

alter table public.treinos
  add column if not exists excluido_em timestamptz default null;

alter table public.treinos
  add column if not exists duracao_aquecimento_min integer default null;

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

create index if not exists idx_mesociclos_excluido_em on public.mesociclos (excluido_em);
create index if not exists idx_treinos_excluido_em on public.treinos (excluido_em);

-- Atualiza políticas de leitura dos alunos para filtrar excluido_em is null
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

-- Garante que itens_treino aceite tipo in ('exercicio', 'cardio', 'texto') e bloco = '0'
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

-- Trigger para atualizar updated_at em public.treinos
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

-- Tabela treinos_historico (Seção 9)
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

-- RPC transacional: salvar_edicao_exposicao (Seção 9)
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
-- 7. RECARREGAR CACHE DO POSTGREST / SUPABASE (ERRO 2.2)
-- =============================================================================

notify pgrst, 'reload schema';

commit;
