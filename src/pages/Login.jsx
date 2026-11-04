import { useState } from 'react';
import { supabase } from '../lib/superbase';
import { useNavigate, Link } from 'react-router-dom';
import './Anamnese.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    
    if (error) {
      window.alert('Erro no login: ' + error.message);
    } else {
      // Lista de e-mails da equipa administrativa
      const adminEmails = [
        'cauekssouza@gmail.com',
        'bodypuzzle.treinamento@gmail.com',
        'andre@exemplo.com', 
        'eduardo@exemplo.com', 
        'lucas@exemplo.com'
      ];

      // Se o e-mail que fez login estiver na lista de admins, vai para a página inicial
      if (adminEmails.includes(email)) {
        navigate('/');
      } else {
        // Se for um aluno comum, vai direto para a tela de agendamento
        navigate('/agendar');
      }
    }
  }

  return (
    <div className="anamnese-container">
      <h2 className="anamnese-title">Acesso Restrito - Equipe</h2>
      <form className="anamnese-form" onSubmit={handleLogin}>
        <input 
          type="email" 
          className="anamnese-input" 
          placeholder="E-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          className="anamnese-input" 
          placeholder="Palavra-passe" 
          value={senha} 
          onChange={(e) => setSenha(e.target.value)} 
          required 
        />
        <button className="anamnese-btn" type="submit">Entrar</button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/registro-equipe" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>
          Criar nova conta de profissional
        </Link>
      </div>
    </div>
  );
}