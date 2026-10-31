import { contato } from "../data/contato"

function Footer() {
  return (
    <footer className="footer band">
      <div className="wrap footer-inner">
        <span>Body Puzzle · Musculação neurodivergente</span>
        <span>{contato.whatsapp} · {contato.instagram}</span>
      </div>
    </footer>
  )
}

export default Footer
