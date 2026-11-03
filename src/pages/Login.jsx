import { useState } from 'react';
import { supabase } from '../lib/superbase';
import { useNavigate } from 'react-router-dom';
import './Anamnese.css'; // Reaproveitamos o estilo do formulário

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
      navigate('/alunos');
    }
  }

  return (
    <div className="anamnese-container">
      <h2 className="anamnese-title">Acesso Restrito - Equipa</h2>
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
    </div>
  );
}