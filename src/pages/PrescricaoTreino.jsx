import { useState, useEffect } from 'react';
import { supabase } from '../database/db';
import { useNavigate } from 'react-router-dom';
import './Anamnese.css';

export default function PrescricaoTreino() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [anamneseAluno, setAnamneseAluno] = useState(null);
  
  const [titulo, setTitulo] = useState('');
  const [exercicios, setExercicios] = useState('');
  const [obsSensoriais, setObsSensoriais] = useState('');
  const navigate = useNavigate();

  // Trava de segurança: Apenas o Cauê (Master) pode entrar aqui
  useEffect(() => {
    async function verificarPermissao() {
      const { data: { user } } = await supabase.auth.getUser();
      const isMaster = user?.email === 'cauekssouza@gmail.com';
      
      if (!isMaster) {
        window.alert('Acesso negado. Área restrita a administradores.');
        navigate('/agendar'); // Envia o aluno de volta para a área dele
      }
    }
    verificarPermissao();
  }, [navigate]);

  useEffect(() => {
    async function carregarAlunos() {
      const { data } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (data) setAlunos(data);
    }
    carregarAlunos();
  }, []);

  // ... restante do código da página ...

  // Sempre que mudar o aluno, busca a anamnese dele para ajudar na prescrição
  useEffect(() => {
    async function carregarAnamnese() {
      if (!alunoSelecionadoId) {
        setAnamneseAluno(null);
        return;
      }
      const { data } = await supabase
        .from('anamneses')
        .select('*')
        .eq('aluno_id', alunoSelecionadoId)
        .single();
      
      setAnamneseAluno(data || null);
    }
    carregarAnamnese();
  }, [alunoSelecionadoId]);

  async function handleSalvarTreino(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');

    const alunoObj = alunos.find(a => a.id === alunoSelecionadoId);

    const { error } = await supabase.from('treinos').insert([{
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id,
      titulo,
      exercicios,
      observacoes_sensoriais: obsSensoriais
    }]);

    if (error) {
      window.alert('Erro ao salvar treino: ' + error.message);
    } else {
      window.alert('Treino prescrito com sucesso!');
      setTitulo('');
      setExercicios('');
      setObsSensoriais('');
      setAlunoSelecionadoId('');
    }
  }

  return (
    <div className="anamnese-container" style={{ maxWidth: '800px' }}>
      <h2 className="anamnese-title">Prescrever Treino Personalizado</h2>
      
      <form className="anamnese-form" onSubmit={handleSalvarTreino}>
        <select 
          className="anamnese-input" 
          value={alunoSelecionadoId} 
          onChange={(e) => setAlunoSelecionadoId(e.target.value)} 
          required
        >
          <option value="">Selecione o Aluno...</option>
          {alunos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
          ))}
        </select>

        {/* Exibe o resumo da anamnese do aluno selecionado para orientar o treino */}
        {anamneseAluno && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #007bff', textAlign: 'left', fontSize: '14px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>📋 Resumo da Anamnese:</h4>
            <p style={{ margin: '4px 0' }}><strong>Condições:</strong> {anamneseAluno.condicoes_medicas || 'Não informado'}</p>
            <p style={{ margin: '4px 0' }}><strong>Gatilhos Sensoriais:</strong> {anamneseAluno.gatilhos_sensoriais || 'Nenhum'}</p>
            <p style={{ margin: '4px 0' }}><strong>Medicamentos:</strong> {anamneseAluno.medicamentos || 'Nenhum'}</p>
          </div>
        )}

        <input 
          type="text" 
          className="anamnese-input" 
          placeholder="Título do Treino (Ex: Treino A - Força e Estabilidade)" 
          value={titulo} 
          onChange={(e) => setTitulo(e.target.value)} 
          required 
        />

        <textarea 
          className="anamnese-textarea" 
          placeholder="Lista de Exercícios (Ex: Supino com halteres - 3x10, Puxada alta - 3x12...)" 
          value={exercicios} 
          onChange={(e) => setExercicios(e.target.value)} 
          required 
        />

        <textarea 
          className="anamnese-textarea" 
          placeholder="Cuidados Sensoriais Específicos (Ex: Evitar luz direta, permitir fones de ouvido...)" 
          value={obsSensoriais} 
          onChange={(e) => setObsSensoriais(e.target.value)} 
        />

        <button className="anamnese-btn" type="submit">Salvar e Enviar Ficha</button>
      </form>
    </div>
  );
}