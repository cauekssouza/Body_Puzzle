// Ícone de barras com setas, igual ao slide "O que trabalhamos"
export function Bars({ color = "currentColor" }) {
  return (
    <svg className="bars" viewBox="0 0 52 60" aria-hidden="true" fill={color}>
      <rect x="2" y="26" width="5" height="26" />
      <rect x="11" y="18" width="5" height="34" />
      <rect x="20" y="9" width="5" height="43" />
      <rect x="29" y="0" width="5" height="52" />
      <path d="M2 52h5l6 4-6 4H2l6-4z M11 52h5l6 4-6 4h-5l6-4z M20 52h5l6 4-6 4h-5l6-4z M29 52h5l6 4-6 4h-5l6-4z" />
    </svg>
  )
}

// Ícones de linha da seção "Como funciona"
export function Icon({ name }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  }
  if (name === "user")
    return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
  if (name === "home")
    return <svg {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
  if (name === "clock")
    return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (name === "chart")
    return <svg {...props}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>
  return null
}

export function WhatsappIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#3fc35f" />
      <path fill="#fff" d="M22.6 18.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.2 2.9 1.2 3.4 1 4 .9.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z" />
    </svg>
  )
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fdb32b" />
          <stop offset=".5" stopColor="#e5306a" />
          <stop offset="1" stopColor="#7a35d4" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#ig-grad)" />
      <rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="3.8" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="21.3" cy="10.7" r="1.3" fill="#fff" />
    </svg>
  )
}
