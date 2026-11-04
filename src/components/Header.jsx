import { Link, useNavigate } from "react-router-dom"
import { menu } from "../data/contato"
import { supabase } from "../lib/superbase" 
import "./Header.css"

function Header({ sessao }) {
  const navigate = useNavigate();

  const emailAtual = sessao?.user?.email;
  const isMaster = emailAtual === 'cauekssouza@gmail.com';
  const isViewer = emailAtual === 'bodypuzzle.treinamento@gmail.com';
  
  const podeGerenciar = isMaster || isViewer;

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
          
          {/* Menus para gestores / equipa */}
          {podeGerenciar && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/anamneses-lista">Ver Anamneses</Link>
              <Link to="/prescrever-treino">Prescrever Treino</Link>
            </>
          )}
          
          {/* Menus exclusivos do Master */}
          {isMaster && (
            <>
              <Link to="/cadastro">Cadastrar Aluno</Link>
              <Link to="/alunos">Ver Alunos</Link>
              <Link to="/anamnese">Nova Anamnese</Link>
            </>
          )}

          {/* Menu para o Aluno ver a sua própria ficha de treino */}
          {sessao && !podeGerenciar && (
            <Link to="/meu-treino">Meu Treino</Link>
          )}
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {sessao ? (
            <>
              {!isViewer && (
                <Link className="btn primary" to="/agendar" style={{ padding: '0.6rem 1.2rem', textDecoration: 'none' }}>Agendar Treino</Link>
              )}
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>
                👤 {emailAtual ? emailAtual.split('@')[0] : ''}
              </span>
              <button onClick={handleLogout} className="btn primary header-cta" style={{ backgroundColor: '#dc3545', border: 'none', cursor: 'pointer' }}>Sair</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Entrar</Link>
              <Link className="btn primary header-cta" to="/cadastro">Cadastrar-se</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header