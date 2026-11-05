import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { menu } from "../data/contato"
import { supabase } from "../lib/superbase"
import "./Header.css"

function Header({ sessao }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('aluno');

  const emailAtual = sessao?.user?.email;

  const emailsAdmin = [
    'cauekssouza@gmail.com',
    'bodypuzzle.treinamento@gmail.com',
    'edususs@yahoo.com.br',
    'andre.goncalves03@hotmail.com'
  ];

  useEffect(() => {
    async function buscarPerfil() {
      if (!emailAtual) {
        setRole('aluno');
        return;
      }
      
      if (emailsAdmin.includes(emailAtual)) {
        setRole('admin');
        return;
      }

      if (!sessao?.user?.id) {
        setRole('aluno');
        return;
      }
      
      const { data } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', sessao.user.id)
        .single();

      if (data) {
        setRole(data.role);
      } else {
        setRole('aluno');
      }
    }
    buscarPerfil();
  }, [sessao, emailAtual]);

  const isAdmin = emailsAdmin.includes(emailAtual) || role === 'admin';
  const isViewer = emailAtual === 'bodypuzzle.treinamento@gmail.com';

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <header className="header band">
      <div className="wrap header-inner">
        <Link className="brand" to="/" aria-label="Body Puzzle, início">
          <img src="/Icone.png" alt="" style={{ height: 36, width: "auto", display: "block", flex: "none" }} />
          <b>Body<br />Puzzle</b>
        </Link>
        
        <nav className="header-nav">
          {menu.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          
          {/* Menu de Gestão Compacto para os Admins */}
          {isAdmin && (
            <div className="admin-menu-group">
              <span className="admin-badge-label">⚙️ Gestão:</span>
              <Link to="/dashboard">Painel</Link>
              <Link to="/anamneses-lista">Anamneses</Link>
              <Link to="/prescrever-treino">Prescrever</Link>
              <Link to="/cadastro">Cadastrar</Link>
              <Link to="/alunos">Alunos</Link>
              {/* NOVOS LINKS DA METODOLOGIA */}
              <Link to="/avaliacao">Avaliação</Link>
              <Link to="/carta-trunfo">Carta Trunfo</Link>
            </div>
          )}
          
          {/* Menu exclusivo para Alunos */}
          {sessao && !isAdmin && (
            <Link to="/meu-treino">Meu Treino</Link>
          )}
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {sessao ? (
            <>
              {!isViewer && !isAdmin && (
                <Link className="btn primary" to="/agendar" style={{ padding: '0.4rem 0.8rem', fontSize: '12.5px', textDecoration: 'none' }}>Agendar</Link>
              )}
              <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#007bff', whiteSpace: 'nowrap' }}>
                👤 {emailAtual ? emailAtual.split('@')[0] : ''}
              </span>
              <button onClick={handleLogout} className="btn primary header-cta" style={{ backgroundColor: '#dc3545', border: 'none', cursor: 'pointer', padding: '0.35rem 0.7rem', fontSize: '12.5px' }}>Sair</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>Entrar</Link>
              <Link className="btn primary header-cta" to="/cadastro">Cadastrar-se</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header