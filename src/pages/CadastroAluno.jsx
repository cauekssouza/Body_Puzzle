import { useState } from 'react';
import { supabase } from '../lib/superbase'; 
import { useNavigate } from 'react-router-dom';
import './Anamnese.css';

export default function CadastroAluno() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function handleCadastrar(e) {
    e.preventDefault();
    setCarregando(true);

    try {
      // Gravar o registo APENAS na tabela de alunos (sem mexer na Autenticação)
      const { error: alunoError } = await supabase.from('alunos').insert([{
        nome,
        email,
        telefone
      }]);

      if (alunoError) throw alunoError;

      window.alert('Aluno cadastrado com sucesso!');
      
      // Limpa os campos após salvar
      setNome('');
      setEmail('');
      setTelefone('');
      
      // Opcional: Redirecionar para a lista de alunos após o cadastro
      // navigate('/alunos'); 
      
    } catch (error) {
      window.alert('Erro ao cadastrar aluno: ' + error.message);
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

        <button className="anamnese-btn" type="submit" disabled={carregando}>
          {carregando ? 'A salvar...' : 'Concluir Cadastro'}
        </button>
      </form>
    </div>
  );
}