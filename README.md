# Body Puzzle | Musculação Neurodivergente

Site da **Body Puzzle**, serviço de treinamento físico individualizado para jovens neurodivergentes, com atendimento na residência do aluno.

O site apresenta o serviço e permite que as famílias **agendem uma sessão** escolhendo dia e horário em um calendário. Os agendamentos ficam salvos em um banco de dados no Supabase.

🔗 **Site no ar:** https://body-puzzle-j9z1.vercel.app

---

## Funcionalidades

- **Página inicial** com as seções da apresentação: Diagnóstico, Como nascemos, Como funciona, Metodologia, O que trabalhamos, Quem somos e Contato.
- **Página de agendamento** (`/agendar`):
  - calendário que libera apenas dias úteis, a partir de hoje;
  - horários das 8h às 19h (sessões de 60 minutos, a última termina às 20h);
  - horários já ocupados aparecem riscados;
  - o banco impede que duas pessoas marquem o mesmo horário;
  - botão para avisar a Body Puzzle pelo WhatsApp com uma mensagem pronta.
- **Layout responsivo**, funciona no computador e no celular.

## Tecnologias

| Ferramenta | Para que serve |
|---|---|
| [React](https://react.dev) | Interface do site |
| [Vite](https://vite.dev) | Servidor de desenvolvimento e build |
| [React Router](https://reactrouter.com) | Navegação entre as páginas (`/` e `/agendar`) |
| [Supabase](https://supabase.com) | Banco de dados dos agendamentos |
| [Vercel](https://vercel.com) | Hospedagem do site |

## Estrutura de pastas

```
body-puzzle/
├── public/              # Fotos da equipe (lucas.jpg, andre.jpg, eduardo.jpg)
├── src/
│   ├── components/      # Seções do site (Header, Hero, Contato...) e estilos
│   ├── data/
│   │   └── contato.js   # Todos os textos do site, contatos e equipe
│   ├── lib/
│   │   └── supabase.js  # Conexão com o banco de dados
│   ├── pages/
│   │   ├── Home.jsx     # Página inicial
│   │   └── Agendar.jsx  # Página de agendamento com o calendário
│   ├── App.jsx          # Rotas do site
│   ├── main.jsx         # Ponto de entrada do React
│   └── index.css        # Cores, fontes e estilos gerais
├── .env                 # Chaves do Supabase (não vai para o GitHub)
├── vercel.json          # Faz a rota /agendar funcionar na Vercel
└── package.json
```

## Como rodar no computador

**Pré-requisito:** [Node.js](https://nodejs.org) versão 20 ou mais nova.

1. Clone o repositório e entre na pasta:

```bash
git clone https://github.com/cauekssouza/Body_Puzzle.git
cd Body_Puzzle
```

2. Instale as dependências:

```bash
npm install
```

3. Crie um arquivo `.env` na raiz do projeto (ao lado do `package.json`) com as chaves do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-publishable-key
```

As chaves ficam no Supabase em **Project Settings → API Keys** (use a *publishable key*, nunca a *secret key*) e **Project Settings → Data API** (Project URL).

4. Ligue o servidor:

```bash
npm run dev
```

5. Abra http://localhost:5173

## Banco de dados (Supabase)

A tabela `agendamentos` guarda nome, telefone, data e hora de cada sessão. Para criar o banco em um projeto novo do Supabase, rode no **SQL Editor**:

```sql
create table public.agendamentos (
  id bigint generated always as identity primary key,
  nome text not null,
  telefone text not null,
  data date not null,
  hora time not null,
  criado_em timestamptz not null default now(),
  unique (data, hora)
);

alter table public.agendamentos enable row level security;

-- O site só pode criar agendamentos em dias úteis, das 8h às 19h, a partir de hoje
create policy "site pode agendar"
  on public.agendamentos for insert to anon
  with check (
    data >= current_date
    and extract(isodow from data) between 1 and 5
    and hora between '08:00' and '19:00'
  );

-- O site só enxerga os horários ocupados, nunca nomes ou telefones
create or replace function public.horarios_ocupados(inicio date, fim date)
returns table (data date, hora time)
language sql
security definer
set search_path = public
as $$
  select data, hora from agendamentos where data between inicio and fim
$$;

grant execute on function public.horarios_ocupados(date, date) to anon;
grant insert on public.agendamentos to anon;
```

**Para ver os agendamentos:** no Supabase, abra **Table Editor → agendamentos**.

## Publicação (Vercel)

O site é publicado automaticamente pela Vercel a cada `git push` na branch `main`.

Para atualizar o site:

```bash
git add .
git commit -m "descreva a mudança"
git push
```

Em cerca de 1 minuto a nova versão está no ar.

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam estar cadastradas na Vercel em **Settings → Environment Variables**. Depois de alterar uma variável, faça um **Redeploy** para ela valer.

## Como editar o conteúdo

| O que mudar | Onde |
|---|---|
| Textos, WhatsApp, Instagram, equipe, capacitações | `src/data/contato.js` |
| Fotos da equipe | Substitua os arquivos em `public/` mantendo os nomes |
| Horários disponíveis para agendamento | Lista `HORARIOS` em `src/pages/Agendar.jsx` (e a regra no Supabase) |
| Cores e fontes | Variáveis no topo de `src/index.css` |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Liga o servidor de desenvolvimento |
| `npm run build` | Gera a versão final do site na pasta `dist` |
| `npm run preview` | Mostra a versão final localmente |

## Contato

- **WhatsApp:** (41) 99164-2002
- **Instagram:** [@body.puzzle](https://www.instagram.com/body.puzzle/)

Equipe: Lucas Boff, André Martins e Eduardo Suss, profissionais de Educação Física.
