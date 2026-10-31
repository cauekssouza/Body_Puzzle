import { equipe, capacitacoes } from "../data/contato"

function QuemSomos() {
  return (
    <section className="band" id="quem-somos">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Quem somos</span>
          <h2>Três profissionais, um olhar individual</h2>
          <p className="lede">
            Somos três profissionais de Educação Física com experiência prática e olhar
            individualizado para cada aluno. Nosso foco é transformar o treinamento em uma
            ferramenta real de desenvolvimento.
          </p>
        </div>

        <div className="team">
          {equipe.map((m) => (
            <div className="member" key={m.nome}>
              {m.foto ? (
                <img className="avatar avatar-foto" src={m.foto} alt={m.nome} style={{ borderColor: m.cor }} />
              ) : (
                <div className="avatar" style={{ background: m.cor }} aria-hidden="true">
                  {m.iniciais}
                </div>
              )}
              <div>
                <strong>{m.nome}</strong>
                <p className="member-role">Profissional de Educação Física</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="certs-title">Capacitações</h3>
        <div className="certs">
          {capacitacoes.map((c) => (
            <div className="cert" key={c.titulo}>
              <strong>{c.titulo}</strong>
              <span>{c.instituicao}</span>
            </div>
          ))}
        </div>
        <p className="certs-note">
          Os três profissionais realizaram todas as capacitações para atender com alta
          qualidade e sempre acompanhados da ciência.
        </p>
      </div>
    </section>
  )
}

export default QuemSomos