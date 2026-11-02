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

// Certificações: para adicionar uma, copie uma linha e troque os dados.
// Se não tiver instituição ou data, deixe as aspas vazias: ""
const certificacoes = [
  { nome: "Introdução ao Go", instituicao: "", data: "" },
]

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

            <Revelar className="dev-card" atraso={120}>
              <h3>Certificações</h3>
              <ul className="dev-certs">
                {certificacoes.map((c) => (
                  <li key={c.nome}>
                    <b>{c.nome}</b>
                    {(c.instituicao || c.data) && (
                      <span>{[c.instituicao, c.data].filter(Boolean).join(" · ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Revelar>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="dev-final band">
        <Revelar className="wrap dev-final-inner">
          <h2>Vamos conversar?</h2>
          <p>Estou aberto a oportunidades e novos projetos.</p>
          <div className="cta-row">
            <a className="btn dev-btn-claro" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
              Falar no LinkedIn
            </a>
            <a className="btn dev-btn-borda" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </Revelar>
      </section>
    </main>
  )
}

export default Desenvolvedor