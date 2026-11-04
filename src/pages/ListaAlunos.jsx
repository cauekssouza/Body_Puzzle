import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase'; 
import './ListaAlunos.css';

export default function ListaAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  useEffect(() => {
    carregarAlunos();
  }, []);

  async function carregarAlunos() {
    const { data, error } = await supabase.from('alunos').select('*').order('criado_em', { ascending: false });
    if (error) window.alert('Erro ao carregar: ' + error.message);
    else setAlunos(data);
  }

  async function deletarAluno(id) {
    if (!window.confirm('Tem certeza que deseja apagar este aluno?')) return;
    
    // Executa a exclusão diretamente na tabela 'alunos' do Supabase
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    
    if (error) {
      console.error('Erro detalhado do Supabase ao apagar:', error);
      window.alert('Erro ao apagar: ' + error.message);
    } else {
      // Remove da lista localmente e recarrega os dados do banco
      setAlunos(alunos.filter(aluno => aluno.id !== id));
      carregarAlunos();
    }
  }

  function iniciarEdicao(aluno) {
    setEditandoId(aluno.id);
    setEditNome(aluno.nome);
    setEditTelefone(aluno.telefone);
  }

  async function salvarEdicao(id) {
    const { error } = await supabase.from('alunos').update({ nome: editNome, telefone: editTelefone }).eq('id', id);
    if (error) {
      window.alert('Erro ao atualizar: ' + error.message);
    } else {
      setEditandoId(null);
      carregarAlunos();
    }
  }

  return (
    <div className="lista-container">
      <h2>Alunos Cadastrados</h2>
      <table className="lista-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map(aluno => (
            <tr key={aluno.id}>
              {editandoId === aluno.id ? (
                <>
                  <td><input value={editNome} onChange={(e) => setEditNome(e.target.value)} /></td>
                  <td><input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} /></td>
                  <td>
                    <button className="btn-salvar" onClick={() => salvarEdicao(aluno.id)}>Salvar</button>
                    <button className="btn-cancelar" onClick={() => setEditandoId(null)}>Cancelar</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{aluno.nome}</td>
                  <td>{aluno.telefone}</td>
                  <td>
                    <button className="btn-editar" onClick={() => iniciarEdicao(aluno)}>Editar</button>
                    <button className="btn-deletar" onClick={() => deletarAluno(aluno.id)}>Apagar</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}