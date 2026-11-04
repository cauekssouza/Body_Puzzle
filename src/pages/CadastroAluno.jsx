import { useState } from 'react';
import { supabase } from '../lib/superbase';
import { useNavigate } from 'react-router-dom';
import './Anamnese.css';

export default function CadastroAluno() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function handleCadastrar(e) {
    e.preventDefault();
    setCarregando(true);

    try {
      // 1. Criar utilizador na autenticação do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Gravar o registo na tabela de alunos
        const { error: alunoError } = await supabase.from('alunos').insert([{
          user_id: authData.user.id,
          nome,
          email,
          telefone
        }]);

        if (alunoError) throw alunoError;

        // 3. Registar obrigatoriamente na tabela 'perfis' com role 'aluno'
        const { error: perfilError } = await supabase.from('perfis').insert([{
          id: authData.user.id,
          nome,
          email,
          role: 'aluno'
        }]);

        if (perfilError) throw perfilError;

        window.alert('Conta criada com sucesso!');
        navigate('/login');
      }
    } catch (error) {
      window.alert('Erro ao criar conta: ' + error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="anamnese-container" style={{ maxWidth: '500px' }}>
      <h2 className="anamnese-title">Cadastro de Novo Aluno</h2>
      
      <form className="anamnese-form" onSubmit={handleCadastrar}>
        <input 
          type="text" 
          className="anamnese-input" 
          placeholder="Nome Completo" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          required 
        />

        <input 
          type="email" 
          className="anamnese-input" 
          placeholder="E-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />

        <input 
          type="text" 
          className="anamnese-input" 
          placeholder="Telefone / WhatsApp" 
          value={telefone} 
          onChange={(e) => setTelefone(e.target.value)} 
          required 
        />

        <input 
          type="password" 
          className="anamnese-input" 
          placeholder="Palavra-passe (mínimo 6 carateres)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          minLength={6}
          required 
        />

        <button className="anamnese-btn" type="submit" disabled={carregando}>
          {carregando ? 'A criar conta...' : 'Concluir Cadastro'}
        </button>
      </form>
    </div>
  );
}