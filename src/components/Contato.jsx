import { useState } from "react"
import { WhatsappIcon, InstagramIcon } from "./Icons"
import { contato } from "../data/contato"

function Canal({ icone, rotulo, valor, url }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Se o navegador bloquear, a pessoa ainda pode selecionar o texto
    }
  }

  return (
    <div className="channel">
      {icone}
      <div className="channel-info">
        <small>{rotulo}</small>
        <b>{valor}</b>
      </div>
      <div className="channel-actions">
        <button className="mini" type="button" onClick={copiar}>
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a className="mini solid" href={url} target="_blank" rel="noopener noreferrer">
          Abrir
        </a>
      </div>
    </div>
  )
}

function Contato() {
  return (
    <section className="contact band" id="contato">
      <div className="wrap contact-grid">
        <div>
          <span className="eyebrow">Contato</span>
          <h2>Dê o próximo passo</h2>
          <p>Entre em contato conosco para agendar a reunião inicial com a família.</p>
        </div>
        <div className="channels">
          <Canal icone={<WhatsappIcon />} rotulo="WhatsApp" valor={contato.whatsapp} url={contato.whatsappUrl} />
          <Canal icone={<InstagramIcon />} rotulo="Instagram" valor={contato.instagram} url={contato.instagramUrl} />
        </div>
      </div>
    </section>
  )
}

export default Contato
