import { Link } from "react-router-dom"
import { menu } from "../data/contato"
import "./Header.css"

function Header() {
  return (
    <header className="header band">
      <div className="wrap header-inner">
        <Link className="brand" to="/" aria-label="Body Puzzle, início">
          <img
            src="/Icone.png"
            alt=""
            style={{ height: 40, width: "auto", display: "block", flex: "none" }}
          />
          <b>Body<br />Puzzle</b>
        </Link>
        <nav className="header-nav">
          {menu.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          {/* O link para a página de cadastro foi adicionado aqui */}
          <Link to="/cadastro">Cadastrar Aluno</Link>
          {/* Novo link para a lista de alunos */}
          <Link to="/alunos">Ver Alunos</Link>
        </nav>
        <Link className="btn primary header-cta" to="/agendar">Agendar</Link>
      </div>
    </header>
  )
}

export default Header