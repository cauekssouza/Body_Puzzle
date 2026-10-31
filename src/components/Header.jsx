import { Link } from "react-router-dom"
import { menu } from "../data/contato"
import "./Header.css"

function Header() {
  return (
    <header className="header band">
      <div className="wrap header-inner">
        <Link className="brand" to="/" aria-label="Body Puzzle, início">
          <img
            className="brand-logo"
            src="/Icone.png"
            alt=""
style={{ height: 48, width: 48, objectFit: "cover", transform: "scale(1.8)", display: "block" }}          />
          <b>Body<br />Puzzle</b>
        </Link>
        <nav className="header-nav">
          {menu.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <Link className="btn primary header-cta" to="/agendar">Agendar</Link>
      </div>
    </header>
  )
}

export default Header