import { Link } from "react-router-dom"
import { contato } from "../data/contato"

function Footer() {
  return (
    <footer className="footer band">
      <div className="wrap footer-inner">
        <span>Body Puzzle · Musculação neurodivergente</span>
        <span>{contato.whatsapp}</span>
        <Link className="footer-dev" to="/desenvolvedor">Site desenvolvido por Cauê Souza</Link>
      </div>
    </footer>
  )
}

export default Footer