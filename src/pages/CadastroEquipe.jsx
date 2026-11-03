import { useState } from 'react';
import { supabase } from '../lib/superbase';
import { useNavigate, Link } from 'react-router-dom';
import './Anamnese.css'; 

export default function CadastroEquipe() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password: senha });
    
    if (error) {
      window.alert('Erro ao cadastrar: ' + error.message);
    } else {
      window.alert('Membro da equipe cadastrado com sucesso!');
      navigate('/login');
    }
  }

  return (
    <div className="anamnese-container">
      <h2 className="anamnese-title">Cadastrar Novo Profissional</h2>
      <form className="anamnese-form" onSubmit={handleCadastro}>
        <input 
          type="email" 
          className="anamnese-input" 
          placeholder="E-mail (ex: cauekssouza@gmail.com)" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          className="anamnese-input" 
          placeholder="Senha" 
          value={senha} 
          onChange={(e) => setSenha(e.target.value)} 
          required 
        />
        <button className="anamnese-btn" type="submit">Criar Conta</button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
}