import { Icon } from "./Icons"
import { comoFunciona } from "../data/contato"

function ComoFunciona() {
  return (
    <section className="band tint" id="como-funciona">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Como funciona</span>
          <h2>O treino vai até o aluno</h2>
        </div>
        <div className="features">
          {comoFunciona.map((item) => (
            <article className="feature" key={item.titulo}>
              <span className="feature-icon" style={{ background: item.cor }}>
                <Icon name={item.icone} />
              </span>
              {item.destaque && (
                <span className="stat">{item.destaque}<small>MIN</small></span>
              )}
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ComoFunciona
