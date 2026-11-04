import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import './ListaAlunos.css';

export default function ListaAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  
  // Estados para exibir o treino do aluno selecionado no iPad da equipa
  const [treinoSelecionado, setTreinoSelecionado] = useState(null);
  const [alunoTreinoNome, setAlunoTreinoNome] = useState('');
  const [carregandoTreino, setCarregandoTreino] = useState(false);

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
    
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    
    if (error) {
      console.error('Erro detalhado do Supabase ao apagar:', error);
      window.alert('Erro ao apagar: ' + error.message);
    } else {
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

  // Função para buscar e exibir a rotina do aluno selecionado
  async function verTreinoAluno(aluno) {
    setCarregandoTreino(true);
    setAlunoTreinoNome(aluno.nome);
    
    const { data, error } = await supabase
      .from('treinos')
      .select('*')
      .eq('aluno_id', aluno.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar treino:', error);
      setTreinoSelecionado(null);
    } else {
      setTreinoSelecionado(data || null);
    }
    setCarregandoTreino(false);
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
                    <button 
                      onClick={() => verTreinoAluno(aluno)} 
                      style={{ background: '#17a2b8', color: '#fff', marginRight: '5px', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Ver Treino
                    </button>
                    <button className="btn-editar" onClick={() => iniciarEdicao(aluno)}>Editar</button>
                    <button className="btn-deletar" onClick={() => deletarAluno(aluno.id)}>Apagar</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Painel de Visualização do Treino (Ideal para consulta rápida nos iPads da equipa) */}
      {alunoTreinoNome && (
        <div style={{ marginTop: '30px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>🏋️ Rotina de Treino: {alunoTreinoNome}</h3>
            <button 
              onClick={() => setAlunoTreinoNome('')} 
              style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>

          {carregandoTreino ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>A carregar rotina...</p>
          ) : treinoSelecionado ? (
            <div>
              <h4 style={{ color: '#0056b3', marginBottom: '12px' }}>{treinoSelecionado.titulo}</h4>
              
              <div style={{ background: '#fff', padding: '15px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #28a745' }}>
                <strong style={{ color: '#28a745' }}>Exercícios do Dia:</strong>
                <p style={{ whiteSpace: 'pre-line', margin: '8px 0 0 0', color: '#495057', lineHeight: '1.5' }}>
                  {treinoSelecionado.exercicios}
                </p>
              </div>

              {treinoSelecionado.observacoes_sensoriais && (
                <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #ffc107' }}>
                  <strong style={{ color: '#856404' }}>Cuidados Sensoriais e Ambiente:</strong>
                  <p style={{ whiteSpace: 'pre-line', margin: '8px 0 0 0', color: '#856404', lineHeight: '1.5' }}>
                    {treinoSelecionado.observacoes_sensoriais}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Ainda não foi registada nenhuma rotina de treino para este aluno.</p>
          )}
        </div>
      )}
    </div>
  );
}