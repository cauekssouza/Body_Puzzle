import { useEffect, useRef, useState } from "react"
import "./Desenvolvedor.css"

const EMAIL = "cauekssouza@gmail.com"
const LINKEDIN = "https://www.linkedin.com/in/cauekssouza"
const GITHUB = "https://github.com/cauekssouza"
const TELEFONE = "(41) 99221-0636"
const WHATSAPP_URL = "https://wa.me/5541992210636"

// Tecnologias usadas neste site (cada uma com uma cor da marca)
const tecnologiasSite = [
  { nome: "React + Vite", uso: "Interface e páginas do site", cor: "var(--blue)" },
  { nome: "React Router", uso: "Navegação entre início, agendamento e esta página", cor: "var(--teal)" },
  { nome: "Supabase", uso: "Banco de dados com regras de segurança (RLS)", cor: "var(--orange)" },
  { nome: "Vercel", uso: "Hospedagem com publicação automática a cada push", cor: "var(--purple)" },
]

// O que o site faz
const entregas = [
  { numero: "3", texto: "páginas: início, agendamento e desenvolvedor" },
  { numero: "12", texto: "horários por dia útil, das 8h às 19h" },
  { numero: "0", texto: "chance de dois agendamentos no mesmo horário" },
]

const competencias = [
  "JavaScript (ES6+)", "TypeScript", "React.js", "Next.js", "Node.js",
  "API REST", "Spring Boot", "SQL", "MongoDB", "Tailwind CSS",
  "Styled Components", "AWS", "Git",
]
const coresTags = ["var(--blue)", "var(--teal)", "var(--yellow)", "var(--orange)", "var(--red)", "var(--purple)"]

// Certificados do LinkedIn, do mais recente para o mais antigo.
// Para adicionar um, copie uma linha e troque os dados.
// area: "Front-end", "Back-end", "Mobile", "Fundamentos" ou "Outros"
const certificacoes = [
  { nome: "Minicurso de Java", instituicao: "Rocketseat", data: "nov. 2026", area: "Back-end" },
  { nome: "Introdução ao Go", instituicao: "Rocketseat", data: "out. 2026", area: "Back-end" },
  { nome: "React Native", instituicao: "Alura", data: "jan. 2026", area: "Mobile" },
  { nome: "Lógica de Programação", instituicao: "Trybe", data: "dez. 2025", area: "Fundamentos" },
  { nome: "API Development Essentials: Node.js, Express e PostgreSQL", instituicao: "Udemy", data: "set. 2025", area: "Back-end" },
  { nome: "jQuery Course for Beginners", instituicao: "Udemy", data: "set. 2025", area: "Front-end" },
  { nome: "PostgreSQL", instituicao: "Alura", data: "jul. 2025", area: "Back-end" },
  { nome: "Spring Boot 3: desenvolva uma API Rest em Java", instituicao: "Alura", data: "jun. 2025", area: "Back-end" },
  { nome: "React: desenvolvendo com JavaScript", instituicao: "Alura", data: "mai. 2025", area: "Front-end" },
  { nome: "Learn C#", instituicao: "Codecademy", data: "mai. 2025", area: "Back-end" },
  { nome: "Learn TypeScript", instituicao: "Codecademy", data: "abr. 2025", area: "Front-end" },
  { nome: "Trilha de Arquiteto de Software", instituicao: "PUCPR", data: "fev. 2025", area: "Fundamentos" },
  { nome: "Desenvolvendo Aplicações Mobile com Android Studio", instituicao: "Fundação Bradesco", data: "fev. 2025", area: "Mobile" },
  { nome: "Trilha Desenvolvedor Web", instituicao: "PUCPR", data: "dez. 2024", area: "Front-end" },
  { nome: "Trilha Desenvolvedor de Sistemas Computacionais", instituicao: "PUCPR", data: "dez. 2024", area: "Back-end" },
  { nome: "Representante de Turma", instituicao: "PUCPR", data: "nov. 2024", area: "Outros" },
  { nome: "Ciência da Computação de Harvard no Brasil", instituicao: "Fundação Estudar", data: "jul. 2024", area: "Fundamentos" },
  { nome: "Excel do Básico ao Avançado", instituicao: "Veduca", data: "jul. 2024", area: "Outros" },
  { nome: "Curso de JavaScript", instituicao: "Curso em Vídeo", data: "jul. 2023", area: "Front-end" },
  { nome: "Python Mundo 3", instituicao: "Curso em Vídeo", data: "jun. 2023", area: "Fundamentos" },
  { nome: "Python Mundo 2", instituicao: "Curso em Vídeo", data: "jun. 2023", area: "Fundamentos" },
  { nome: "Python Mundo 1", instituicao: "Curso em Vídeo", data: "mai. 2023", area: "Fundamentos" },
]

const AREAS = ["Todos", "Front-end", "Back-end", "Mobile", "Fundamentos", "Outros"]
const corDaArea = {
  "Front-end": "var(--teal)",
  "Back-end": "var(--blue)",
  "Mobile": "var(--orange)",
  "Fundamentos": "var(--purple)",
  "Outros": "var(--yellow)",
}
const instituicoes = [...new Set(certificacoes.map((c) => c.instituicao))]

// Iniciais da instituição para o selo do cartão (ex.: "Curso em Vídeo" → "CV")
function iniciais(nome) {
  return nome.split(" ").filter((p) => p.length > 2 || p === nome).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

// Número que conta de 0 até o valor quando aparece na tela
function Contador({ ate }) {
  const ref = useRef(null)
  const [valor, setValor] = useState(0)

  useEffect(() => {
    const el = ref.current
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (!el || reduzir || !("IntersectionObserver" in window)) {
      setValor(ate)
      return
    }
    let quadro
    const obs = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return
      obs.disconnect()
      const inicio = performance.now()
      const passo = (agora) => {
        const t = Math.min((agora - inicio) / 1200, 1)
        setValor(Math.round(ate * (1 - Math.pow(1 - t, 3))))
        if (t < 1) quadro = requestAnimationFrame(passo)
      }
      quadro = requestAnimationFrame(passo)
    })
    obs.observe(el)
    return () => { obs.disconnect(); cancelAnimationFrame(quadro) }
  }, [ate])

  return <strong ref={ref}>{valor}</strong>
}

// Serviços oferecidos
const servicos = [
  {
    titulo: "Sites pessoais",
    texto: "Portfólio, currículo online ou página para o seu trabalho como profissional autônomo.",
    itens: ["Página com a sua cara", "Links para redes e contato", "Funciona no celular"],
    cor: "var(--teal)",
  },
  {
    titulo: "Sites para empresas",
    texto: "Site institucional para apresentar o seu negócio, os serviços e a equipe, como este da Body Puzzle.",
    itens: ["Apresentação do negócio", "Botão direto para o WhatsApp", "Endereço próprio na internet"],
    cor: "var(--blue)",
  },
  {
    titulo: "Sistemas sob medida",
    texto: "Agendamento online, formulários e cadastros que salvam tudo num banco de dados.",
    itens: ["Agenda com horários livres", "Dados salvos com segurança", "Painel para ver os pedidos"],
    cor: "var(--orange)",
  },
]

const etapasServico = [
  { titulo: "Conversa", texto: "Entendo o que você precisa e o que o site deve fazer." },
  { titulo: "Proposta", texto: "Mostro o escopo, o prazo e o valor antes de começar." },
  { titulo: "Construção", texto: "Desenvolvo e mostro o andamento para você ajustar." },
  { titulo: "No ar", texto: "Publico o site e ensino como acompanhar." },
]

const MENSAGEM_ORCAMENTO = "Olá, Cauê! Vi a página do site da Body Puzzle e quero um orçamento de site."
const WHATSAPP_ORCAMENTO = `${WHATSAPP_URL}?text=${encodeURIComponent(MENSAGEM_ORCAMENTO)}`

// Faz o bloco aparecer suavemente quando entra na tela
function Revelar({ children, className = "", atraso = 0 }) {
  const ref = useRef(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !("IntersectionObserver" in window)) {
      setVisivel(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`revelar ${visivel ? "visivel" : ""} ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  )
}

function Desenvolvedor() {
  const [copiado, setCopiado] = useState(false)
  const [area, setArea] = useState("Todos")
  const certsFiltrados = area === "Todos" ? certificacoes : certificacoes.filter((c) => c.area === area)

  async function copiarEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Se o navegador bloquear, o e-mail continua visível para selecionar
    }
  }

  return (
    <main className="dev">
      {/* Apresentação */}
      <section className="dev-hero band">
        <div className="dev-pecas" aria-hidden="true">
          <span className="peca p1" />
          <span className="peca p2" />
          <span className="peca p3" />
          <span className="peca p4" />
          <span className="peca p5" />
        </div>

        <div className="wrap dev-hero-grid">
          <div className="dev-foto-wrap entrar" style={{ "--d": "0ms" }}>
            <div className="dev-anel" />
            <img className="dev-foto" src="/Caue.jpeg" alt="Foto de Cauê Souza" />
            <span className="dev-selo">Full Stack</span>
          </div>

          <div className="dev-intro">
            <span className="eyebrow entrar" style={{ "--d": "100ms" }}>Desenvolvido por</span>
            <h1 className="entrar" style={{ "--d": "180ms" }}>
              Cauê <em>Souza</em>
            </h1>
            <p className="dev-cargo entrar" style={{ "--d": "260ms" }}>
              Engenheiro de Software em formação na PUCPR, desenvolvendo com React, Node.js e TypeScript.
            </p>
            <p className="dev-local entrar" style={{ "--d": "320ms" }}>📍 Curitiba, Paraná</p>
            <a className="dev-disponivel entrar" style={{ "--d": "360ms" }} href="#servicos">
              <span className="dev-pulso" aria-hidden="true" />
              Crio sites pessoais e para empresas
            </a>

            <div className="dev-contatos entrar" style={{ "--d": "400ms" }}>
              <div className="dev-contato">
                <small>E-mail</small>
                <b>{EMAIL}</b>
                <button type="button" className="mini" onClick={copiarEmail}>
                  {copiado ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
              <div className="dev-contato">
                <small>WhatsApp</small>
                <b>{TELEFONE}</b>
                <a className="mini" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Abrir
                </a>
              </div>
            </div>

            <div className="cta-row entrar" style={{ "--d": "480ms" }}>
              <a className="btn primary" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                Ver LinkedIn
              </a>
              <a className="btn ghost" href={GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre o site */}
      <section className="dev-secao band">
        <div className="wrap">
          <Revelar className="dev-cabeca">
            <span className="eyebrow">O projeto</span>
            <h2>Sobre este site</h2>
            <p className="lede">
              Criei o site da Body Puzzle a partir da apresentação do projeto: a página
              institucional e um sistema de agendamento onde as famílias escolhem dia e horário.
              O calendário mostra só horários livres, impede agendamentos duplicados e protege
              os dados de quem agenda.
            </p>
          </Revelar>

          <div className="dev-numeros">
            {entregas.map((e, i) => (
              <Revelar key={e.texto} atraso={i * 120} className="dev-numero">
                <strong>{e.numero}</strong>
                <span>{e.texto}</span>
              </Revelar>
            ))}
          </div>

          <div className="dev-stack">
            {tecnologiasSite.map((t, i) => (
              <Revelar key={t.nome} atraso={i * 100}>
                <div className="dev-stack-item" style={{ "--cor": t.cor }}>
                  <i />
                  <strong>{t.nome}</strong>
                  <span>{t.uso}</span>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="dev-secao dev-servicos band" id="servicos">
        <div className="wrap">
          <Revelar className="dev-cabeca">
            <span className="eyebrow">Serviços</span>
            <h2>Seu site, do jeito que você precisa</h2>
            <p className="lede">
              Faço sites para pessoas e para empresas: rápidos, bonitos no celular e fáceis de
              atualizar. Se você gostou deste site, posso fazer um para você também.
            </p>
          </Revelar>

          <div className="dev-servicos-grade">
            {servicos.map((sv, i) => (
              <Revelar key={sv.titulo} atraso={i * 120}>
                <article className="dev-servico" style={{ "--cor": sv.cor }}>
                  <i />
                  <h3>{sv.titulo}</h3>
                  <p>{sv.texto}</p>
                  <ul>
                    {sv.itens.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              </Revelar>
            ))}
          </div>

          <Revelar className="dev-processo" atraso={100}>
            <h3>Como funciona</h3>
            <ol>
              {etapasServico.map((e, i) => (
                <li key={e.titulo}>
                  <b>{i + 1}</b>
                  <div>
                    <strong>{e.titulo}</strong>
                    <span>{e.texto}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Revelar>

          <Revelar className="dev-orcamento" atraso={150}>
            <div>
              <strong>Quer um site para você ou para sua empresa?</strong>
              <span>Me chame no WhatsApp e conte o que precisa. O orçamento é sem compromisso.</span>
            </div>
            <a className="btn primary" href={WHATSAPP_ORCAMENTO} target="_blank" rel="noopener noreferrer">
              Pedir orçamento
            </a>
          </Revelar>
        </div>
      </section>

      {/* Resumo */}
      <section className="dev-secao dev-tinta band">
        <div className="wrap dev-resumo">
          <Revelar className="dev-cabeca">
            <span className="eyebrow">Quem sou</span>
            <h2>Resumo</h2>
          </Revelar>
          <Revelar atraso={100}>
            <p className="dev-texto">
              Desenvolvedor Full Stack em formação, com base acadêmica em engenharia de software
              e experiência prática no desenvolvimento de aplicações modernas. Atuo na criação de
              interfaces responsivas e escaláveis, com foco em JavaScript (ES6+), React.js e
              Node.js, usando TypeScript para segurança e manutenção do código.
            </p>
            <p className="dev-texto">
              Tenho experiência com Styled Components e Tailwind CSS, integração de APIs RESTful e
              bancos de dados relacionais e não relacionais (SQL e MongoDB). Aplico Clean Code,
              arquitetura de componentes e metodologias ágeis, transformando requisitos de negócio
              em soluções eficientes, com foco em performance e experiência do usuário.
            </p>
          </Revelar>
          <Revelar atraso={200} className="dev-tags">
            {competencias.map((c, i) => (
              <span key={c} style={{ "--cor": coresTags[i % coresTags.length] }}>{c}</span>
            ))}
          </Revelar>
        </div>
      </section>

      {/* Trajetória */}
      <section className="dev-secao band">
        <div className="wrap">
          <Revelar className="dev-cabeca">
            <span className="eyebrow">Trajetória</span>
            <h2>Experiência e formação</h2>
          </Revelar>

          <div className="dev-linha">
            <Revelar className="dev-marco" atraso={0}>
              <span className="dev-ponto" style={{ "--cor": "var(--teal)" }} />
              <span className="dev-periodo">fev. 2026 – atual</span>
              <h3>Estagiário de Inteligência Artificial e Automação de Processos</h3>
              <p className="dev-org">Chaves na Mão · Curitiba</p>
              <ul>
                <li>Suporte na implantação de novas plataformas tecnológicas</li>
                <li>Manutenção e automatização dos processos de implantação de software</li>
                <li>Alimentação e atualização de banco de dados</li>
                <li>Coleta de dados quantitativos e qualitativos</li>
              </ul>
            </Revelar>

            <Revelar className="dev-marco" atraso={120}>
              <span className="dev-ponto" style={{ "--cor": "var(--blue)" }} />
              <span className="dev-periodo">mar. 2023 – dez. 2026</span>
              <h3>Bacharelado em Engenharia de Software</h3>
              <p className="dev-org">Pontifícia Universidade Católica do Paraná (PUCPR)</p>
            </Revelar>
          </div>

          <div className="dev-extras">
            <Revelar className="dev-card" atraso={0}>
              <h3>Idiomas</h3>
              <div className="dev-idioma">
                <div><b>Inglês</b><span>Profissional completo</span></div>
                <div className="dev-barra"><i style={{ "--nivel": "90%" }} /></div>
              </div>
              <div className="dev-idioma">
                <div><b>Espanhol</b><span>Básico</span></div>
                <div className="dev-barra"><i style={{ "--nivel": "30%" }} /></div>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      {/* Certificados */}
      <section className="dev-secao dev-tinta band" id="certificados">
        <div className="wrap">
          <Revelar className="dev-cabeca">
            <span className="eyebrow">Aprendizado contínuo</span>
            <h2>Certificados</h2>
          </Revelar>

          <Revelar className="dev-cert-resumo" atraso={100}>
            <div><Contador ate={certificacoes.length} /><span>certificados</span></div>
            <div><Contador ate={instituicoes.length} /><span>instituições</span></div>
            <div><Contador ate={2023} /><span>estudando desde</span></div>
          </Revelar>
        </div>

        {/* Faixa rolando com as instituições */}
        <div className="dev-faixa" aria-label={`Instituições: ${instituicoes.join(", ")}`}>
          <div className="dev-faixa-trilho">
            {[...instituicoes, ...instituicoes].map((nome, i) => (
              <span key={`${nome}-${i}`} aria-hidden={i >= instituicoes.length}>{nome}</span>
            ))}
          </div>
        </div>

        <div className="wrap">
          <div className="dev-filtros" role="group" aria-label="Filtrar certificados por área">
            {AREAS.map((a) => {
              const total = a === "Todos" ? certificacoes.length : certificacoes.filter((c) => c.area === a).length
              return (
                <button
                  key={a}
                  type="button"
                  className={a === area ? "ativo" : ""}
                  style={{ "--cor": corDaArea[a] || "var(--ink)" }}
                  aria-pressed={a === area}
                  onClick={() => setArea(a)}
                >
                  {a} <small>{total}</small>
                </button>
              )
            })}
          </div>

          <div className="dev-certs-grade">
            {certsFiltrados.map((c, i) => (
              <article
                key={`${area}-${c.nome}`}
                className="dev-cert"
                style={{ "--cor": corDaArea[c.area], "--i": i }}
              >
                <div className="dev-cert-topo">
                  <span className="dev-cert-selo">{iniciais(c.instituicao)}</span>
                  <span className="dev-cert-area">{c.area}</span>
                </div>
                <h3>{c.nome}</h3>
                <p>{c.instituicao} · {c.data}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="dev-final band">
        <Revelar className="wrap dev-final-inner">
          <h2>Vamos criar o seu site?</h2>
          <p>Faço sites pessoais e para empresas, e estou aberto a oportunidades como desenvolvedor.</p>
          <div className="cta-row">
            <a className="btn dev-btn-claro" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              Falar no LinkedIn
            </a>
            <a className="btn dev-btn-borda" href={WHATSAPP_ORCAMENTO} target="_blank" rel="noopener noreferrer">
              Pedir orçamento no WhatsApp
            </a>
          </div>
        </Revelar>
      </section>
    </main>
  )
}

export default Desenvolvedor