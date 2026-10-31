import { Bars } from "./Icons"
import { capacidades, contato } from "../data/contato"
import { Link } from "react-router-dom"

function Hero() {
  return (
    <section className="hero band" id="inicio">
      <div className="wrap hero-grid">
        <div>
          <p className="hero-tag">Musculação neurodivergente</p>
          <h1>
            Movimento como <em>ferramenta real</em> de desenvolvimento
          </h1>
          <p className="lede">
            Treinamento físico individualizado para jovens neurodivergentes, na sua casa,
            para ganhar força, autonomia, coordenação e confiança no próprio corpo.
          </p>
          <div className="cta-row">
           <Link className="btn primary" to="/agendar">Agendar reunião inicial</Link>
            <a className="btn ghost" href="#metodologia">Ver a metodologia</a>
          </div>
        </div>

        <div className="board" aria-label="Capacidades trabalhadas">
          {capacidades.map((c) => (
            <div className="piece" key={c.nome} style={{ background: c.cor }}>
              <Bars />
              <span>{c.curto || c.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
