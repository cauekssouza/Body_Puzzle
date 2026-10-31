import { Bars } from "./Icons"
import { capacidades } from "../data/contato"

function Capacidades() {
  return (
    <section className="band tint" id="o-que-trabalhamos">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">O que trabalhamos</span>
          <h2>Seis capacidades, um corpo inteiro</h2>
        </div>
        <div className="caps">
          {capacidades.map((c) => (
            <div className="cap" key={c.nome}>
              <Bars color={c.cor} />
              <div>
                <h3>{c.nome}</h3>
                <p>{c.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Capacidades
