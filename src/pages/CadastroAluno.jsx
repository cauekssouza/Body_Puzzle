import { useState } from 'react';
import { supabase } from '../lib/superbase';
import { useNavigate } from 'react-router-dom';
import './Anamnese.css'; 

export default function CadastroAluno() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    
    // 1. Cria a conta de autenticação
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (authError) return window.alert('Erro ao criar conta: ' + authError.message);

    const userId = authData.user?.id;

    // 2. Salva os dados na tabela de alunos já vinculando o user_id do Auth
    const { error: dbError } = await supabase.from('alunos').insert([{
      nome,
      email,
      telefone,
      user_id: userId // Vinculo automático ao ID de login
    }]);

    if (dbError) return window.alert('Erro ao salvar dados: ' + dbError.message);

    window.alert('Conta criada com sucesso! Faça login para agendar.');
    navigate('/login');
  }

  return (
    <div className="anamnese-container">
      <h2 className="anamnese-title">Criar Conta de Aluno</h2>
      <form className="anamnese-form" onSubmit={handleCadastro}>
        <input type="text" className="anamnese-input" placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} required />
        <input type="email" className="anamnese-input" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="text" className="anamnese-input" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} required />
        <input type="password" className="anamnese-input" placeholder="Palavra-passe (mín. 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} required />
        
        <button className="anamnese-btn" type="submit">Finalizar Registo</button>
      </form>
    </div>
  );
}