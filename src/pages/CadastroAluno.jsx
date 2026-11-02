import { useState } from 'react';
import { supabase } from '../lib/superbase'; // Importa a configuração que você fez

export default function CadastroAluno() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    // Aqui usamos o supabase para inserir os dados na tabela que você criou
    const { data, error } = await supabase
      .from('alunos')
      .insert([
        { nome: nome, telefone: telefone }
      ])
      .select();

    if (error) {
      alert('Erro ao salvar aluno: ' + error.message);
      return;
    }

    alert('Aluno cadastrado com sucesso!');
    setNome('');
    setTelefone('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
      <h2>Novo Aluno</h2>
      
      <input 
        type="text" 
        placeholder="Nome completo" 
        value={nome} 
        onChange={(e) => setNome(e.target.value)} 
        required 
      />
      
      <input 
        type="text" 
        placeholder="Telefone" 
        value={telefone} 
        onChange={(e) => setTelefone(e.target.value)} 
      />
      
      <button type="submit">Cadastrar Aluno</button>
    </form>
  );
}