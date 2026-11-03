import { Link } from "react-router-dom"

function Footer() {
  return (
    <footer className="footer band">
      <div className="wrap footer-inner">
        <span>Body Puzzle · Musculação neurodivergente</span>
        <span>@body.puzzle</span>
        <Link className="footer-dev" to="/desenvolvedor">Site desenvolvido por Cauê Souza</Link>
        <Link className="footer-dev" to="/login" style={{ marginLeft: "15px", opacity: 0.7 }}>Acesso da Equipe</Link>
      </div>
    </footer>
  )
}

export default Footer