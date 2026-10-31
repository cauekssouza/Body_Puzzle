import { impactos } from "../data/contato"

function Diagnostico() {
  return (
    <section className="band tint" id="diagnostico">
      <div className="wrap split">
        <div>
          <div className="head">
            <span className="eyebrow">Diagnóstico</span>
            <h2>A peça que costuma faltar</h2>
          </div>
          <p className="lede">
            Hoje, muitos jovens neurodivergentes recebem acompanhamento clínico, terapias e
            suporte cognitivo. Mas existe um ponto que quase sempre é deixado de lado.
          </p>
          <p className="gap-quote">O desenvolvimento físico.</p>
          <div className="lacks">
            <span>Falta força</span>
            <span>Falta autonomia</span>
            <span>Falta coordenação motora</span>
            <span>Falta confiança no próprio corpo</span>
          </div>
        </div>

        <div className="impacts">
          {impactos.map((i) => (
            <div className="impact" key={i.titulo}>
              <i style={{ background: i.cor }} />
              <strong>{i.titulo}</strong>
              <small>{i.texto}</small>
            </div>
          ))}
          <div className="result">
            Tudo isso impacta diretamente, e consequentemente, a
            <b>qualidade de vida</b>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Diagnostico
