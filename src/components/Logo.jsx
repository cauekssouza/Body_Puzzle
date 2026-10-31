function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--teal)" />
          <stop offset="1" stopColor="var(--blue)" />
        </linearGradient>
      </defs>
      <path d="M40 6a26 26 0 0 1 20 34" fill="none" stroke="var(--red)" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 8a20 20 0 0 1 20 16" fill="none" stroke="var(--orange)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="26" cy="22" r="11" fill="url(#logo-grad)" />
      <circle cx="16" cy="44" r="11" fill="url(#logo-grad)" />
      <circle cx="38" cy="44" r="11" fill="url(#logo-grad)" />
      <circle cx="26" cy="22" r="4.6" fill="var(--bg)" />
      <circle cx="16" cy="44" r="4.6" fill="var(--bg)" />
      <circle cx="38" cy="44" r="4.6" fill="var(--bg)" />
    </svg>
  )
}

export default Logo
