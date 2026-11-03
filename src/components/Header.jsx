import { Link, useNavigate } from "react-router-dom"
import { menu } from "../data/contato"
import { supabase } from "../lib/superbase"
import "./Header.css"

function Header({ sessao }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

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
          {/* Menus públicos */}
          {menu.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          
          {/* Menus restritos (só aparecem se estiver logado) */}
          {sessao && (
            <>
              <Link to="/cadastro">Cadastrar Aluno</Link>
              <Link to="/alunos">Ver Alunos</Link>
              <Link to="/anamnese">Anamnese</Link>
              <Link to="/anamneses-lista">Ver Anamneses</Link>
            </>
          )}
        </nav>
        
        {/* Área do Utilizador / Botão Final */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {sessao ? (
            <>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>
                👤 {sessao.user.email.split('@')[0]}
              </span>
              <button 
                onClick={handleLogout} 
                className="btn primary header-cta" 
                style={{ backgroundColor: '#dc3545', border: 'none', cursor: 'pointer' }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link className="btn primary header-cta" to="/agendar">Agendar</Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header