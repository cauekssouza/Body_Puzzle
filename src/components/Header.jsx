import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { menu } from "../data/contato"
import { supabase } from "../lib/superbase"
import "./Header.css"

function Header({ sessao }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('aluno');

  const emailAtual = sessao?.user?.email;

  useEffect(() => {
    async function buscarPerfil() {
      if (!sessao?.user?.id) {
        setRole('aluno');
        return;
      }
      
      // Consulta a tabela de perfis para obter o papel exato do utilizador
      const { data } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', sessao.user.id)
        .single();

      if (data) {
        setRole(data.role); // 'admin' ou 'aluno'
      } else {
        // Fallback para contas principais de gestão por segurança
        if (emailAtual === 'cauekssouza@gmail.com' || emailAtual === 'bodypuzzle.treinamento@gmail.com' || emailAtual === 'edususs@yahoo.com.br' || emailAtual === 'andre.goncalves03@hotmail.com') {
          setRole('admin');
        } else {
          setRole('aluno');
        }
      }
    }
    buscarPerfil();
  }, [sessao, emailAtual]);

  const isAdmin = role === 'admin';
  const isViewer = emailAtual === 'bodypuzzle.treinamento@gmail.com';
  const podeGerenciar = isAdmin;

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
          
          {/* Menus de gestão exclusivos para administradores */}
          {podeGerenciar && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/anamneses-lista">Ver Anamneses</Link>
              <Link to="/prescrever-treino">Prescrever Treino</Link>
              <Link to="/cadastro">Cadastrar Aluno</Link>
              <Link to="/alunos">Ver Alunos</Link>
              <Link to="/anamnese">Nova Anamnese</Link>
            </>
          )}
          
          {/* Menu exclusivo para Alunos verem o seu treino */}
          {sessao && !podeGerenciar && (
            <Link to="/meu-treino">Meu Treino</Link>
          )}
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {sessao ? (
            <>
              {!isViewer && !podeGerenciar && (
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