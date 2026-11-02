import { useState } from 'react';
import { supabase } from '../lib/superbase';
import './CadastroAluno.css';

export default function CadastroAluno() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    const { data, error } = await supabase
      .from('alunos')
      .insert([{ nome: nome, telefone: telefone }])
      .select();

    if (error) {
      window.alert('Erro ao guardar aluno: ' + error.message);
      return;
    }

    window.alert('Aluno registado com sucesso!');
    setNome('');
    setTelefone('');
  }

  return (
    <div className="cadastro-container">
      <h2 className="cadastro-title">Novo Aluno</h2>
      
      <form className="cadastro-form" onSubmit={handleSubmit}>
        <input 
          className="cadastro-input"
          type="text" 
          placeholder="Nome completo" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          required 
        />
        
        <input 
          className="cadastro-input"
          type="text" 
          placeholder="Telefone" 
          value={telefone} 
          onChange={(e) => setTelefone(e.target.value)} 
        />
        
        <button className="cadastro-btn" type="submit">
          Registar Aluno
        </button>
      </form>
    </div>
  );
}