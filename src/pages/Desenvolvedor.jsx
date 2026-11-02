import { useState } from "react"
import "./Desenvolvedor.css"

const EMAIL = "cauekssouza@gmail.com"
const LINKEDIN = "https://www.linkedin.com/in/cauekssouza"
const GITHUB = "https://github.com/cauekssouza"
const TELEFONE = "(41) 99221-0636"
const WHATSAPP_URL = "https://wa.me/5541992210636"

const tecnologiasSite = [
  { nome: "React + Vite", uso: "Interface e páginas do site" },
  { nome: "React Router", uso: "Navegação entre a página inicial e o agendamento" },
  { nome: "Supabase", uso: "Banco de dados com regras de segurança (RLS)" },
  { nome: "Vercel", uso: "Hospedagem com publicação automática a cada push" },
]

const competencias = [
  "JavaScript (ES6+)", "TypeScript", "React.js", "Next.js", "Node.js",
  "API REST", "Spring Boot", "SQL", "MongoDB", "Tailwind CSS",
  "Styled Components", "AWS", "Git",
]

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
    <main className="dev band">
      <div className="wrap">
        {/* Apresentação */}
        <div className="dev-hero">
          <img className="dev-foto" src="/Caue.jpeg" alt="Foto de Cauê Souza" />
          <div className="dev-intro">
            <span className="eyebrow">Desenvolvido por</span>
            <h1>Cauê Souza</h1>
            <p className="dev-cargo">
              Engenheiro de Software em formação na PUCPR · Desenvolvedor Full Stack
            </p>
            <p className="dev-local">Curitiba, Paraná</p>

            <div className="dev-contatos">
              <div className="dev-contato">
                <small>E-mail</small>
                <b>{EMAIL}</b>
                <button type="button" className="mini" onClick={copiarEmail}>
                  {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
              <div className="dev-contato">
                <small>WhatsApp</small>
                <b>{TELEFONE}</b>
                <a className="mini" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Abrir
                </a>
              </div>
              <div className="cta-row">
                <a className="btn primary" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
                <a className="btn ghost" href={GITHUB} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sobre o site */}
        <div className="dev-bloco">
          <h2>Sobre este site</h2>
          <p className="lede">
            Criei o site da Body Puzzle a partir da apresentação do projeto: a página
            institucional e um sistema de agendamento onde as famílias escolhem dia e
            horário. O calendário mostra só horários livres, impede agendamentos duplicados
            e protege os dados de quem agenda.
          </p>
          <div className="dev-stack">
            {tecnologiasSite.map((t) => (
              <div className="dev-stack-item" key={t.nome}>
                <strong>{t.nome}</strong>
                <span>{t.uso}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="dev-bloco">
          <h2>Resumo</h2>
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
          <div className="dev-tags">
            {competencias.map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>

        {/* Experiência e formação */}
        <div className="dev-bloco dev-duas">
          <div>
            <h2>Experiência</h2>
            <article className="dev-item">
              <span className="dev-periodo">fev. 2026 – atual</span>
              <h3>Estagiário de Inteligência Artificial e Automação de Processos</h3>
              <p className="dev-org">Chaves na Mão · Curitiba</p>
              <ul>
                <li>Suporte na implantação de novas plataformas tecnológicas</li>
                <li>Manutenção e automatização dos processos de implantação de software</li>
                <li>Alimentação e atualização de banco de dados</li>
                <li>Coleta de dados quantitativos e qualitativos</li>
              </ul>
            </article>
          </div>
          <div>
            <h2>Formação</h2>
            <article className="dev-item">
              <span className="dev-periodo">mar. 2023 – dez. 2026</span>
              <h3>Bacharelado em Engenharia de Software</h3>
              <p className="dev-org">Pontifícia Universidade Católica do Paraná (PUCPR)</p>
            </article>

            <h2 className="dev-sub">Idiomas</h2>
            <ul className="dev-lista">
              <li><b>Inglês</b> · profissional completo</li>
              <li><b>Espanhol</b> · básico</li>
            </ul>

            <h2 className="dev-sub">Certificação</h2>
            <ul className="dev-lista">
              <li>Introdução ao Go</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Desenvolvedor