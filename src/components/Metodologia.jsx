import { etapas } from "../data/contato"

function Metodologia() {
  return (
    <section className="band" id="metodologia">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Nossa metodologia</span>
          <h2>Cada aluno é único</h2>
          <p className="lede">
            Por isso, nossa metodologia parte de uma análise individual para construir um
            processo seguro, progressivo e funcional. O trabalho acontece em etapas:
          </p>
        </div>
        <ol className="steps">
          {etapas.map((etapa, index) => (
            <li className="step" key={etapa.titulo}>
              <div className="step-num">
                <b style={{ background: etapa.cor }}>{index + 1}</b>
              </div>
              <h3>{etapa.titulo}</h3>
              <p>{etapa.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default Metodologia
