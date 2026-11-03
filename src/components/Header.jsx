import { Link, useNavigate } from "react-router-dom"
import { menu } from "../data/contato"
import { supabase } from "../lib/superbase"
import "./Header.css"

function Header({ sessao }) {
  const navigate = useNavigate();

  // Defina aqui os e-mails exatos da equipa admin
  const adminEmails = [
    'cauekssouza@gmail.com', 
    'andre@exemplo.com', 
    'eduardo@exemplo.com', 
    'lucas@exemplo.com'
  ];
  
  // Verifica se quem está logado é um admin
  const isAdmin = sessao && adminEmails.includes(sessao.user.email);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <header className="header band">
      <div className="wrap header-inner">
        <Link className="brand" to="/" aria-label="Body Puzzle, início">
          <img src="/Icone.png" alt="" style={{ height: 40, width: "auto", display: "block", flex: "none" }} />
          <b>Body<br />Puzzle</b>
        </Link>
        <nav className="header-nav">
          {menu.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          
          {/* Aparece APENAS para os Admins */}
          {isAdmin && (
            <>
              <Link to="/alunos">Ver Alunos</Link>
              <Link to="/anamnese">Anamnese</Link>
              <Link to="/anamneses-lista">Ver Anamneses</Link>
            </>
          )}
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {sessao ? (
            <>
              {/* Agendar fica visível para todos que estão logados (Alunos e Admins) */}
              <Link className="btn primary" to="/agendar" style={{ padding: '0.6rem 1.2rem', textDecoration: 'none' }}>Agendar Treino</Link>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>
                👤 {sessao.user.email.split('@')[0]}
              </span>
              <button onClick={handleLogout} className="btn primary header-cta" style={{ backgroundColor: '#dc3545', border: 'none', cursor: 'pointer' }}>Sair</button>
            </>
          ) : (
            <>
              {/* Botões para quem ainda não entrou no site */}
              <Link to="/login" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Entrar</Link>
              <Link className="btn primary header-cta" to="/cadastro">Cadastrar-se</Link>

              {/* Aparece APENAS para os Admins */}
          {isAdmin && (
            <>
              <Link to="/cadastro">Cadastrar Aluno</Link>
              <Link to="/alunos">Ver Alunos</Link>
              <Link to="/anamnese">Anamnese</Link>
              <Link to="/anamneses-lista">Ver Anamneses</Link>
            </>
          )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header