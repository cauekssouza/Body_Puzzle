import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';

export default function PrescricaoTreino() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [anamneseAluno, setAnamneseAluno] = useState(null);
  
  const [titulo, setTitulo] = useState('');
  const [biblioteca, setBiblioteca] = useState([]);
  const [exercicioSelecionadoId, setExercicioSelecionadoId] = useState('');
  const [detalhesExercicio, setDetalhesExercicio] = useState(null);
  
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [carga, setCarga] = useState('');
  
  const [listaExerciciosTreino, setListaExerciciosTreino] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      const { data: dadosAlunos } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (dadosAlunos) setAlunos(dadosAlunos);

      const { data: dadosExercicios } = await supabase.from('exercicios').select('*').order('padrao');
      if (dadosExercicios) setBiblioteca(dadosExercicios);
    }
    carregarDados();
  }, []);

  useEffect(() => {
    async function carregarAnamnese() {
      if (!alunoSelecionadoId) {
        setAnamneseAluno(null);
        return;
      }
      const { data } = await supabase.from('anamneses').select('*').eq('aluno_id', alunoSelecionadoId).single();
      setAnamneseAluno(data || null);
    }
    carregarAnamnese();
  }, [alunoSelecionadoId]);

  function handleSelecaoExercicio(e) {
    const id = e.target.value;
    setExercicioSelecionadoId(id);
    const exercicioCompleto = biblioteca.find(ex => ex.id === id);
    setDetalhesExercicio(exercicioCompleto || null);
  }

  function handleAdicionarALista(e) {
    e.preventDefault();
    if (!exercicioSelecionadoId || !series || !repeticoes) {
      return window.alert("Preencha o exercício, séries e repetições.");
    }

    const novoExercicio = {
      id_unico: Date.now(),
      nome: detalhesExercicio.nome,
      padrao: detalhesExercicio.padrao,
      equipamento: detalhesExercicio.equipamento,
      series,
      repeticoes,
      carga: carga || 'Livre',
      pontos_atencao: detalhesExercicio.pontos_atencao
    };

    setListaExerciciosTreino([...listaExerciciosTreino, novoExercicio]);
    
    setExercicioSelecionadoId('');
    setDetalhesExercicio(null);
    setSeries('');
    setRepeticoes('');
    setCarga('');
  }

  function removerDaLista(idParaRemover) {
    setListaExerciciosTreino(listaExerciciosTreino.filter(ex => ex.id_unico !== idParaRemover));
  }

  async function handleSalvarTreinoFinal(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');
    if (listaExerciciosTreino.length === 0) return window.alert('Adicione pelo menos um exercício ao treino!');

    const alunoObj = alunos.find(a => a.id === alunoSelecionadoId);

    const textoTreino = listaExerciciosTreino.map(ex => 
      `• ${ex.nome} (${ex.equipamento})\n  ${ex.series}x${ex.repeticoes} | Carga: ${ex.carga}kg\n  💡 Dica: ${ex.pontos_atencao}`
    ).join('\n\n');

    const { error } = await supabase.from('treinos').insert([{
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id,
      titulo,
      exercicios: textoTreino,
      observacoes_sensoriais: 'Criado pela Biblioteca Body Puzzle'
    }]);

    if (error) {
      window.alert('Erro ao salvar treino: ' + error.message);
    } else {
      window.alert('Treino prescrito com sucesso!');
      setTitulo('');
      setAlunoSelecionadoId('');
      setListaExerciciosTreino([]);
    }
  }

  // --- ESTILOS MODERNOS (Inline para garantir que funciona perfeitamente) ---
  const styles = {
    container: { maxWidth: '700px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' },
    title: { textAlign: 'center', color: '#1e293b', fontSize: '24px', fontWeight: '800', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' },
    input: { width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#334155', boxSizing: 'border-box', backgroundColor: '#f8fafc', marginBottom: '15px', outline: 'none' },
    sectionBox: { background: '#f1f5f9', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', marginBottom: '15px' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', textTransform: 'uppercase' },
    btnSecondary: { padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    btnRemove: { background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    cardExercicio: { background: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Prescrever Treino</h2>
      
      {/* 1. DADOS DO TREINO */}
      <select style={styles.input} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)} required>
        <option value="">👤 Selecione o Aluno...</option>
        {alunos.map((aluno) => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
      </select>

      {anamneseAluno && (
        <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '15px', fontSize: '14px', color: '#1e3a8a' }}>
          <strong>📋 Resumo:</strong> Condições: {anamneseAluno.condicoes_medicas || 'N/A'} | Gatilhos: {anamneseAluno.gatilhos_sensoriais || 'N/A'}
        </div>
      )}

      <input 
        type="text" 
        style={styles.input} 
        placeholder="📝 Título do Treino (Ex: Treino A - Hipertrofia)" 
        value={titulo} 
        onChange={(e) => setTitulo(e.target.value)} 
      />

      {/* 2. ADICIONAR EXERCÍCIOS */}
      <div style={styles.sectionBox}>
        <h4 style={{ margin: '0 0 15px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>+</span> Adicionar Exercício
        </h4>
        
        <select style={styles.input} value={exercicioSelecionadoId} onChange={handleSelecaoExercicio}>
          <option value="">🔍 Selecione um exercício da biblioteca...</option>
          {biblioteca.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.padrao} — {ex.nome}
            </option>
          ))}
        </select>

        {detalhesExercicio && (
          <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#475569', marginBottom: '15px', border: '1px dashed #cbd5e1' }}>
            <strong>💡 Foco:</strong> {detalhesExercicio.pontos_atencao || 'Sem observações específicas'}
          </div>
        )}

        <div style={styles.grid3}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginLeft: '5px' }}>Séries</label>
            <input type="number" style={{...styles.input, marginBottom: 0}} placeholder="Ex: 4" value={series} onChange={e => setSeries(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginLeft: '5px' }}>Repetições</label>
            <input type="number" style={{...styles.input, marginBottom: 0}} placeholder="Ex: 10" value={repeticoes} onChange={e => setRepeticoes(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginLeft: '5px' }}>Carga (kg)</label>
            <input type="number" style={{...styles.input, marginBottom: 0}} placeholder="Opcional" value={carga} onChange={e => setCarga(e.target.value)} />
          </div>
        </div>

        <button onClick={handleAdicionarALista} style={styles.btnSecondary}>
          Adicionar ao Treino
        </button>
      </div>

      {/* 3. LISTA DE EXERCÍCIOS ADICIONADOS */}
      {listaExerciciosTreino.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h4 style={{ color: '#1e293b', marginBottom: '15px' }}>🛒 Exercícios no Treino Atual ({listaExerciciosTreino.length}):</h4>
          
          {listaExerciciosTreino.map((ex, index) => (
            <div key={ex.id_unico} style={styles.cardExercicio}>
              <div>
                <strong style={{ color: '#0f172a', fontSize: '15px' }}>{index + 1}. {ex.nome}</strong>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {ex.series}x{ex.repeticoes} • {ex.carga}kg • {ex.equipamento}
                </div>
              </div>
              <button onClick={() => removerDaLista(ex.id_unico)} style={styles.btnRemove}>X</button>
            </div>
          ))}
          
          <div style={{ marginTop: '25px' }}>
            <button onClick={handleSalvarTreinoFinal} style={styles.btnPrimary}>
              Salvar Treino Finalizado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}