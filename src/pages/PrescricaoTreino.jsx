import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';

export default function PrescricaoTreino() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  
  // Estados para Mesociclos
  const [mesociclos, setMesociclos] = useState([]);
  const [mesocicloSelecionadoId, setMesocicloSelecionadoId] = useState('');
  const [criandoMesociclo, setCriandoMesociclo] = useState(false);
  const [novoMeso, setNovoMeso] = useState({ nome: '', dataInicio: '', semanas: '', objetivo: '', frequencia: '' });
  
  const [titulo, setTitulo] = useState('');
  const [biblioteca, setBiblioteca] = useState([]);
  
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [exercicioSelecionadoId, setExercicioSelecionadoId] = useState('');
  const [detalhesExercicio, setDetalhesExercicio] = useState(null);
  
  // Campos do Exercício no Treino
  const [bloco, setBloco] = useState('1'); // Novo: Bloco 1, 2, 3...
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [carga, setCarga] = useState('');
  const [intervalo, setIntervalo] = useState(''); // Novo: Intervalo
  const [observacaoExercicio, setObservacaoExercicio] = useState(''); 
  
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

  // Carregar Mesociclos quando seleciona o aluno
  useEffect(() => {
    async function carregarMesociclos() {
      if (!alunoSelecionadoId) {
        setMesociclos([]);
        setMesocicloSelecionadoId('');
        return;
      }
      const { data } = await supabase.from('mesociclos').select('*').eq('aluno_id', alunoSelecionadoId).order('created_at', { ascending: false });
      if (data) setMesociclos(data);
    }
    carregarMesociclos();
  }, [alunoSelecionadoId]);

  async function handleSalvarNovoMesociclo(e) {
    e.preventDefault();
    
    // Cálculo automático da Data de Fim (Início + Semanas)
    const dataInicioObj = new Date(novoMeso.dataInicio);
    const dataFimObj = new Date(dataInicioObj.setDate(dataInicioObj.getDate() + (parseInt(novoMeso.semanas) * 7)));
    const dataFimFormatada = dataFimObj.toISOString().split('T')[0];

    const { data, error } = await supabase.from('mesociclos').insert([{
      aluno_id: alunoSelecionadoId,
      nome: novoMeso.nome,
      data_inicio: novoMeso.dataInicio,
      semanas: parseInt(novoMeso.semanas),
      data_fim: dataFimFormatada,
      objetivo: novoMeso.objetivo,
      frequencia: parseInt(novoMeso.frequencia),
      status: 'Ativo'
    }]).select().single();

    if (error) return window.alert('Erro ao criar mesociclo: ' + error.message);
    
    setMesociclos([data, ...mesociclos]);
    setMesocicloSelecionadoId(data.id);
    setCriandoMesociclo(false);
    setNovoMeso({ nome: '', dataInicio: '', semanas: '', objetivo: '', frequencia: '' });
  }

  const exerciciosFiltrados = biblioteca.filter(ex => 
    ex.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
    ex.padrao.toLowerCase().includes(termoPesquisa.toLowerCase())
  );

  function selecionarExercicio(ex) {
    setExercicioSelecionadoId(ex.id);
    setDetalhesExercicio(ex);
    setTermoPesquisa(`${ex.padrao} — ${ex.nome}`);
    setMostrarDropdown(false);
  }

  function handleAdicionarALista(e) {
    e.preventDefault();
    if (!exercicioSelecionadoId || !series || !repeticoes || !bloco) {
      return window.alert("Preencha o Bloco, Exercício, Séries e Repetições.");
    }

    const novoExercicio = {
      id_unico: Date.now(),
      bloco,
      nome: detalhesExercicio.nome,
      equipamento: detalhesExercicio.equipamento,
      series,
      repeticoes,
      carga: carga || '-',
      intervalo: intervalo || '-',
      observacao: observacaoExercicio,
      pontos_atencao: detalhesExercicio.pontos_atencao
    };

    setListaExerciciosTreino([...listaExerciciosTreino, novoExercicio].sort((a, b) => a.bloco - b.bloco));
    
    setExercicioSelecionadoId('');
    setDetalhesExercicio(null);
    setTermoPesquisa('');
    setSeries('');
    setRepeticoes('');
    setCarga('');
    setIntervalo('');
    setObservacaoExercicio(''); 
  }

  function removerDaLista(idParaRemover) {
    setListaExerciciosTreino(listaExerciciosTreino.filter(ex => ex.id_unico !== idParaRemover));
  }

  async function handleSalvarTreinoFinal(e) {
    e.preventDefault();
    if (!mesocicloSelecionadoId) return window.alert('Selecione ou crie um Mesociclo primeiro!');
    if (listaExerciciosTreino.length === 0) return window.alert('Adicione exercícios!');

    const alunoObj = alunos.find(a => a.id === alunoSelecionadoId);

    // Formata agrupando por blocos
    const textoTreino = listaExerciciosTreino.map(ex => {
      let textoBase = `[BLOCO ${ex.bloco}] • ${ex.nome} (${ex.equipamento})\n  ${ex.series}x${ex.repeticoes} | Carga: ${ex.carga}kg | Intervalo: ${ex.intervalo}\n  💡 Dica: ${ex.pontos_atencao}`;
      if (ex.observacao) textoBase += `\n  📝 Obs: ${ex.observacao}`;
      return textoBase;
    }).join('\n\n');

    const { error } = await supabase.from('treinos').insert([{
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id,
      mesociclo_id: mesocicloSelecionadoId,
      titulo,
      exercicios: textoTreino,
      observacoes_sensoriais: 'Criado pela Biblioteca Body Puzzle'
    }]);

    if (error) {
      window.alert('Erro ao salvar: ' + error.message);
    } else {
      window.alert('Treino salvo no Mesociclo com sucesso!');
      setTitulo('');
      setListaExerciciosTreino([]);
    }
  }

  const styles = {
    container: { maxWidth: '700px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' },
    title: { textAlign: 'center', color: '#1e293b', fontSize: '24px', fontWeight: '800', marginBottom: '25px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#334155', boxSizing: 'border-box', backgroundColor: '#f8fafc', marginBottom: '15px', outline: 'none' },
    sectionBox: { background: '#f1f5f9', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
    btnSecondary: { padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    btnOutline: { padding: '10px', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px', width: '100%' },
    searchContainer: { position: 'relative', marginBottom: '15px' },
    dropdownList: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
    dropdownItem: { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '14px', color: '#334155' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Prescrever Treino</h2>
      
      {/* 1. SELEÇÃO DE ALUNO E MESOCICLO */}
      <div style={styles.sectionBox}>
        <select style={styles.input} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)} required>
          <option value="">👤 Selecione o Aluno...</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        {alunoSelecionadoId && (
          <>
            <select style={styles.input} value={mesocicloSelecionadoId} onChange={(e) => setMesocicloSelecionadoId(e.target.value)}>
              <option value="">📅 Selecione o Mesociclo...</option>
              {mesociclos.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.semanas} semanas)</option>)}
            </select>
            
            <button style={styles.btnOutline} onClick={() => setCriandoMesociclo(!criandoMesociclo)}>
              {criandoMesociclo ? 'Cancelar Criação' : '+ Criar Novo Mesociclo'}
            </button>

            {criandoMesociclo && (
              <form onSubmit={handleSalvarNovoMesociclo} style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0 }}>Criar Novo Mesociclo</h4>
                <input type="text" style={styles.input} placeholder="Nome (Ex: Mesociclo 1-2026)" value={novoMeso.nome} onChange={e => setNovoMeso({...novoMeso, nome: e.target.value})} required />
                <div style={styles.grid2}>
                  <div><label style={{fontSize:'12px', fontWeight:'bold'}}>Data Início</label><input type="date" style={styles.input} value={novoMeso.dataInicio} onChange={e => setNovoMeso({...novoMeso, dataInicio: e.target.value})} required /></div>
                  <div><label style={{fontSize:'12px', fontWeight:'bold'}}>Semanas (Ex: 4)</label><input type="number" style={styles.input} value={novoMeso.semanas} onChange={e => setNovoMeso({...novoMeso, semanas: e.target.value})} required /></div>
                </div>
                <div style={styles.grid2}>
                  <input type="text" style={styles.input} placeholder="Foco (Ex: Força Base)" value={novoMeso.objetivo} onChange={e => setNovoMeso({...novoMeso, objetivo: e.target.value})} />
                  <input type="number" style={styles.input} placeholder="Frequência (Ex: 2)" value={novoMeso.frequencia} onChange={e => setNovoMeso({...novoMeso, frequencia: e.target.value})} />
                </div>
                <button type="submit" style={styles.btnSecondary}>Salvar Mesociclo</button>
              </form>
            )}
          </>
        )}
      </div>

      <input type="text" style={styles.input} placeholder="📝 Título do Treino (Ex: Treino A)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />

      {/* 2. ADICIONAR EXERCÍCIOS POR BLOCO */}
      <div style={styles.sectionBox}>
        <h4 style={{ margin: '0 0 15px 0' }}>+ Adicionar Exercício</h4>
        
        <div style={styles.searchContainer}>
          <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="🔍 Pesquisar exercício..." value={termoPesquisa} onChange={(e) => { setTermoPesquisa(e.target.value); setMostrarDropdown(true); setExercicioSelecionadoId(''); setDetalhesExercicio(null); }} onFocus={() => setMostrarDropdown(true)} onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)} />
          {mostrarDropdown && exerciciosFiltrados.length > 0 && (
            <div style={styles.dropdownList}>
              {exerciciosFiltrados.map(ex => (
                <div key={ex.id} style={styles.dropdownItem} onClick={() => selecionarExercicio(ex)} onMouseEnter={(e) => e.target.style.background = '#f8fafc'} onMouseLeave={(e) => e.target.style.background = '#fff'}>
                  <strong>{ex.nome}</strong> <span style={{fontSize: '12px'}}>— {ex.padrao}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.grid4}>
          <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>Bloco</label><select style={styles.input} value={bloco} onChange={e => setBloco(e.target.value)}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
          <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>Séries</label><input type="text" style={styles.input} placeholder="Ex: 4" value={series} onChange={e => setSeries(e.target.value)} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>Reps</label><input type="text" style={styles.input} placeholder="Ex: 8-10" value={repeticoes} onChange={e => setRepeticoes(e.target.value)} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>Intervalo</label><input type="text" style={styles.input} placeholder="Ex: 60s" value={intervalo} onChange={e => setIntervalo(e.target.value)} /></div>
        </div>

        <button onClick={handleAdicionarALista} style={styles.btnSecondary}>Adicionar ao Treino</button>
      </div>

      {/* 3. LISTA DO TREINO ORGANIZADA POR BLOCOS */}
      {listaExerciciosTreino.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h4>🛒 Exercícios no Treino:</h4>
          {listaExerciciosTreino.map((ex, index) => (
            <div key={ex.id_unico} style={{ background: '#fff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>[Bloco {ex.bloco}] {ex.nome}</strong>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{ex.series}x{ex.repeticoes} • Intervalo: {ex.intervalo}</div>
              </div>
              <button onClick={() => removerDaLista(ex.id_unico)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>X</button>
            </div>
          ))}
          <div style={{ marginTop: '25px' }}><button onClick={handleSalvarTreinoFinal} style={styles.btnPrimary}>Salvar Treino no Mesociclo</button></div>
        </div>
      )}
    </div>
  );
}