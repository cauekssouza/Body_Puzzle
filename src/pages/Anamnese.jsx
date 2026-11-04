import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase'; // Caminho corrigido para evitar erro na Vercel
import './Anamnese.css';

export default function Anamnese() {
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState('');
  const [condicoes, setCondicoes] = useState('');
  const [gatilhos, setGatilhos] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    async function carregarAlunos() {
      const { data } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (data) setAlunos(data);
    }
    carregarAlunos();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!alunoId) return window.alert('Selecione um aluno primeiro!');

    // Descobre qual é o user_id do aluno selecionado na lista
    const alunoSelecionado = alunos.find(a => a.id === alunoId);
    const userIdAluno = alunoSelecionado ? alunoSelecionado.user_id : null;

    const { error } = await supabase.from('anamneses').insert([{
      aluno_id: alunoId,
      user_id: userIdAluno, // Vincula o user_id do Auth automaticamente
      condicoes_medicas: condicoes,
      gatilhos_sensoriais: gatilhos,
      medicamentos: medicamentos,
      observacoes: observacoes
    }]);

    if (error) {
      window.alert('Erro ao salvar anamnese: ' + error.message);
    } else {
      window.alert('Anamnese registrada com sucesso!');
      setAlunoId(''); setCondicoes(''); setGatilhos(''); setMedicamentos(''); setObservacoes('');
    }
  }

  return (
    <div className="anamnese-container">
      <h2 className="anamnese-title">Registrar Anamnese</h2>
      <form className="anamnese-form" onSubmit={handleSubmit}>
        <select className="anamnese-input" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required>
          <option value="">Selecione o Aluno...</option>
          {alunos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
          ))}
        </select>
        
        <textarea className="anamnese-textarea" placeholder="Condições Médicas (Ex: TDAH, Autismo, etc)" value={condicoes} onChange={(e) => setCondicoes(e.target.value)} />
        <textarea className="anamnese-textarea" placeholder="Gatilhos Sensoriais (Ex: Luz forte, barulho alto)" value={gatilhos} onChange={(e) => setGatilhos(e.target.value)} />
        <textarea className="anamnese-textarea" placeholder="Medicamentos em uso" value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} />
        <textarea className="anamnese-textarea" placeholder="Observações adicionais para o treino" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        
        <button className="anamnese-btn" type="submit">Salvar Anamnese</button>
      </form>
    </div>
  );
}