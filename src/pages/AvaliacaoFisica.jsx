import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';

export default function AvaliacaoFisica() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [dadosAluno, setDadosAluno] = useState(null);
  
  // 1. CABEÇALHO
  const [dataAvaliacao, setDataAvaliacao] = useState(new Date().toISOString().split('T')[0]);
  const [avaliador, setAvaliador] = useState('Professor Body Puzzle');
  const [objetivos, setObjetivos] = useState('');
  
  // 2. ANTROPOMETRIA
  const [massa, setMassa] = useState('');
  const [estatura, setEstatura] = useState('');
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  const [dobras, setDobras] = useState({ triceps: '', subescapular: '', axilar: '', peitoral: '', suprailiaca: '', abdominal: '', coxa: '' });
  
  // 3. MOBILIDADE (Graus D/E)
  const [mobilidade, setMobilidade] = useState({
    rotIntOmbroD: '', rotIntOmbroE: '', rotExtOmbroD: '', rotExtOmbroE: '',
    rotIntQuadrilD: '', rotIntQuadrilE: '', rotExtQuadrilD: '', rotExtQuadrilE: '',
    isquiotibiaisD: '', isquiotibiaisE: '', dorsiflexaoD: '', dorsiflexaoE: ''
  });

  // 4. POTÊNCIA
  const [potencia, setPotencia] = useState({
    cmj: '', sj: '', medball: '', saltoHoriz: '', hopD: '', hopE: '', tripleHopD: '', tripleHopE: '',
    djBilatAlt: '', djBilatTempo: '', djUniDAlt: '', djUniDTempo: '', djUniEAlt: '', djUniETempo: ''
  });

  // 5. FORÇA
  const [forca, setForca] = useState({
    sentarLevantar: '', hangHold: '', kneePushUp: '', canoa: '', ponteGlutea: '', pushUp: '', prancha: '', chinUp: '',
    sqCarga: '', sqReps: '', dlCarga: '', dlReps: '', supCarga: '', supReps: ''
  });

  // 6. RESISTÊNCIA
  const [tc6Distancia, setTc6Distancia] = useState('');
  const [cooperDistancia, setCooperDistancia] = useState('');

  // RESULTADOS CALCULADOS EM TEMPO REAL
  const [calcBase, setCalcBase] = useState({ idade: 0, imc: 0, percGordura: 0, massaMagra: 0, massaGorda: 0, rcq: 0 });
  const [calcDinamicos, setCalcDinamicos] = useState({
    previstoTC6: 0, vo2Cooper: 0, rsiBilat: 0, rsiUniD: 0, rsiUniE: 0,
    rmSquat: 0, relSquat: 0, rmDeadlift: 0, relDeadlift: 0, rmSupino: 0, relSupino: 0
  });

  // CARREGAR DADOS
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('alunos').select('id, nome').order('nome');
      if (data) setAlunos(data);
    }
    init();
  }, []);

  useEffect(() => {
    async function carregarPerfil() {
      if (!alunoSelecionadoId) return setDadosAluno(null);
      const { data } = await supabase.from('anamneses').select('data_nascimento, sexo').eq('aluno_id', alunoSelecionadoId).single();
      if (data && data.data_nascimento) {
        const idade = new Date(dataAvaliacao).getFullYear() - new Date(data.data_nascimento).getFullYear();
        setDadosAluno({ ...data, idade });
      } else {
        setDadosAluno({ sexo: 'Não informado', idade: 25 });
      }
    }
    carregarPerfil();
  }, [alunoSelecionadoId, dataAvaliacao]);

  // MOTOR DE CÁLCULOS
  useEffect(() => {
    if (!dadosAluno) return;
    const m = parseFloat(massa) || 0;
    const e = parseFloat(estatura) || 0;
    let imc = 0, percGordura = 0, mGorda = 0, mMagra = 0, rcq = 0;

    if (m > 0 && e > 0) imc = m / (e * e);
    if (parseFloat(cintura) > 0 && parseFloat(quadril) > 0) rcq = parseFloat(cintura) / parseFloat(quadril);

    const somaDobras = Object.values(dobras).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (somaDobras > 0) {
      const d = 1.112 - (0.00043499 * somaDobras) + (0.00000055 * (somaDobras * somaDobras)) - (0.00028826 * dadosAluno.idade);
      if (d > 0) {
        percGordura = Math.max(0, ((4.95 / d) - 4.5) * 100);
        mGorda = m * (percGordura / 100);
        mMagra = m - mGorda;
      }
    }
    setCalcBase({ idade: dadosAluno.idade, imc: imc.toFixed(2), percGordura: percGordura.toFixed(2), massaMagra: mMagra.toFixed(1), massaGorda: mGorda.toFixed(1), rcq: rcq.toFixed(2) });

    // Resistência
    const sexoNum = (dadosAluno.sexo === 'Masculino') ? 1 : 0;
    const prevTC6 = tc6Distancia ? (890.46 - (6.11 * dadosAluno.idade) + (0.0345 * Math.pow(dadosAluno.idade, 2)) + (48.87 * sexoNum) - (4.87 * imc)) : 0;
    const vo2 = cooperDistancia ? ((parseFloat(cooperDistancia) - 504.9) / 44.73) : 0;

    // RSI (Potência)
    const calcRSI = (alt, tempo) => (parseFloat(alt) > 0 && parseFloat(tempo) > 0) ? ((parseFloat(alt) / 100) / parseFloat(tempo)) : 0;

    // 1RM de Epley (Força)
    const calc1RM = (cg, rp) => (parseFloat(cg) > 0 && parseFloat(rp) > 0) ? (parseFloat(cg) * (1 + parseFloat(rp) / 30)) : 0;
    
    const rmSq = calc1RM(forca.sqCarga, forca.sqReps);
    const rmDl = calc1RM(forca.dlCarga, forca.dlReps);
    const rmSup = calc1RM(forca.supCarga, forca.supReps);

    setCalcDinamicos({
      previstoTC6: prevTC6.toFixed(1), vo2Cooper: vo2.toFixed(1),
      rsiBilat: calcRSI(potencia.djBilatAlt, potencia.djBilatTempo).toFixed(2),
      rsiUniD: calcRSI(potencia.djUniDAlt, potencia.djUniDTempo).toFixed(2),
      rsiUniE: calcRSI(potencia.djUniEAlt, potencia.djUniETempo).toFixed(2),
      rmSquat: rmSq.toFixed(1), relSquat: m > 0 ? (rmSq / m).toFixed(2) : 0,
      rmDeadlift: rmDl.toFixed(1), relDeadlift: m > 0 ? (rmDl / m).toFixed(2) : 0,
      rmSupino: rmSup.toFixed(1), relSupino: m > 0 ? (rmSup / m).toFixed(2) : 0
    });

  }, [massa, estatura, cintura, quadril, dobras, tc6Distancia, cooperDistancia, potencia, forca, dadosAluno]);

  // FUNÇÃO SALVAR
  async function handleSalvarAvaliacao(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');

    const { error } = await supabase.from('avaliacoes').insert([{
      aluno_id: alunoSelecionadoId, data_avaliacao: dataAvaliacao, avaliador, idade: calcBase.idade, sexo: dadosAluno?.sexo, objetivos,
      massa: parseFloat(massa) || null, estatura: parseFloat(estatura) || null,
      imc: parseFloat(calcBase.imc) || null, perc_gordura: parseFloat(calcBase.percGordura) || null,
      massa_magra: parseFloat(calcBase.massaMagra) || null, massa_gorda: parseFloat(calcBase.massaGorda) || null, rcq: parseFloat(calcBase.rcq) || null,
      dobras, perimetros: { cintura, quadril }, mobilidade, potencia, forca,
      resistencia: { tc6: tc6Distancia, cooper: cooperDistancia, vo2: calcDinamicos.vo2Cooper }
    }]);

    if (error) window.alert('Erro ao salvar avaliação: ' + error.message);
    else {
      window.alert('Avaliação Física guardada com sucesso!');
      window.location.reload(); // Atualiza a página limpa para a próxima avaliação
    }
  }

  // ATUALIZADORES DE ESTADO
  const handleChange = (setter) => (campo, valor) => setter(prev => ({ ...prev, [campo]: valor }));
  const mChange = handleChange(setMobilidade);
  const pChange = handleChange(setPotencia);
  const fChange = handleChange(setForca);

  // ESTILOS
  const styles = {
    container: { maxWidth: '850px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    title: { textAlign: 'center', color: '#1e293b', fontSize: '24px', fontWeight: '800', marginBottom: '25px', textTransform: 'uppercase' },
    sectionBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '15px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
    label: { fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' },
    resultText: { fontSize: '12px', color: '#2563eb', fontWeight: 'bold', marginTop: '4px', display: 'block' },
    btnPrimary: { width: '100%', padding: '15px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Nova Avaliação Física</h2>
      
      <form onSubmit={handleSalvarAvaliacao}>
        {/* CABEÇALHO */}
        <div style={styles.sectionBox}>
          <div style={styles.grid4}>
            <div><label style={styles.label}>Aluno</label><select style={styles.input} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)} required><option value="">Selecione...</option>{alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
            <div><label style={styles.label}>Data</label><input type="date" style={styles.input} value={dataAvaliacao} onChange={e => setDataAvaliacao(e.target.value)} required /></div>
            <div style={{gridColumn: 'span 2'}}><label style={styles.label}>Dados: Idade {calcBase.idade} | Sexo {dadosAluno?.sexo || '-'}</label><input type="text" style={styles.input} placeholder="Objetivos do aluno (Opcional)" value={objetivos} onChange={e => setObjetivos(e.target.value)} /></div>
          </div>
        </div>

        {/* 1. ANTROPOMETRIA (Resumido para a UI) */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0' }}>1. Antropometria</h4>
          <div style={styles.grid4}>
            <div><label style={styles.label}>Massa (kg)</label><input type="number" step="0.1" style={styles.input} value={massa} onChange={e => setMassa(e.target.value)} /></div>
            <div><label style={styles.label}>Estatura (m)</label><input type="number" step="0.01" style={styles.input} value={estatura} onChange={e => setEstatura(e.target.value)} /></div>
            <div><label style={styles.label}>Cintura (cm)</label><input type="number" step="0.1" style={styles.input} value={cintura} onChange={e => setCintura(e.target.value)} /></div>
            <div><label style={styles.label}>Quadril (cm)</label><input type="number" step="0.1" style={styles.input} value={quadril} onChange={e => setQuadril(e.target.value)} /></div>
          </div>
          <div style={{fontSize: '13px', background: '#e0f2fe', padding: '10px', borderRadius: '6px', color: '#0369a1'}}><strong>Resultados:</strong> IMC: {calcBase.imc} | %Gordura: {calcBase.percGordura}% | M.Magra: {calcBase.massaMagra}kg</div>
        </div>

        {/* 3. MOBILIDADE */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0' }}>3. Mobilidade (Graus)</h4>
          <div style={styles.grid4}>
            <div><label style={styles.label}>RI Ombro (D/E)</label><div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="D" style={styles.input} onChange={e=>mChange('rotIntOmbroD', e.target.value)}/><input type="number" placeholder="E" style={styles.input} onChange={e=>mChange('rotIntOmbroE', e.target.value)}/></div></div>
            <div><label style={styles.label}>RE Ombro (D/E)</label><div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="D" style={styles.input} onChange={e=>mChange('rotExtOmbroD', e.target.value)}/><input type="number" placeholder="E" style={styles.input} onChange={e=>mChange('rotExtOmbroE', e.target.value)}/></div></div>
            <div><label style={styles.label}>Isquiotibiais (D/E)</label><div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="D" style={styles.input} onChange={e=>mChange('isquiotibiaisD', e.target.value)}/><input type="number" placeholder="E" style={styles.input} onChange={e=>mChange('isquiotibiaisE', e.target.value)}/></div></div>
            <div><label style={styles.label}>Dorsiflexão (D/E)</label><div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="D" style={styles.input} onChange={e=>mChange('dorsiflexaoD', e.target.value)}/><input type="number" placeholder="E" style={styles.input} onChange={e=>mChange('dorsiflexaoE', e.target.value)}/></div></div>
          </div>
        </div>

        {/* 4. POTÊNCIA E SALTOS */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0' }}>4. Potência</h4>
          <div style={styles.grid4}>
            <div><label style={styles.label}>CMJ / SJ Maior (cm)</label><div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="CMJ" style={styles.input} onChange={e=>pChange('cmj', e.target.value)}/><input type="number" placeholder="SJ" style={styles.input} onChange={e=>pChange('sj', e.target.value)}/></div></div>
            <div><label style={styles.label}>Salto Horiz (cm)</label><input type="number" style={styles.input} onChange={e=>pChange('saltoHoriz', e.target.value)} /></div>
            <div><label style={styles.label}>Medball 3kg (cm)</label><input type="number" style={styles.input} onChange={e=>pChange('medball', e.target.value)} /></div>
          </div>
          
          <label style={styles.label}>Drop Jumps (Altura cm / Tempo s) - Cálculo RSI Automático</label>
          <div style={styles.grid4}>
            <div>
              <label style={{fontSize:'11px', color:'#94a3b8'}}>Bilateral</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" step="0.1" placeholder="Alt" style={styles.input} onChange={e=>pChange('djBilatAlt', e.target.value)}/><input type="number" step="0.01" placeholder="Seg" style={styles.input} onChange={e=>pChange('djBilatTempo', e.target.value)}/></div>
              {calcDinamicos.rsiBilat > 0 && <span style={styles.resultText}>RSI: {calcDinamicos.rsiBilat}</span>}
            </div>
            <div>
              <label style={{fontSize:'11px', color:'#94a3b8'}}>Unilateral D</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" step="0.1" placeholder="Alt" style={styles.input} onChange={e=>pChange('djUniDAlt', e.target.value)}/><input type="number" step="0.01" placeholder="Seg" style={styles.input} onChange={e=>pChange('djUniDTempo', e.target.value)}/></div>
              {calcDinamicos.rsiUniD > 0 && <span style={styles.resultText}>RSI: {calcDinamicos.rsiUniD}</span>}
            </div>
            <div>
              <label style={{fontSize:'11px', color:'#94a3b8'}}>Unilateral E</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" step="0.1" placeholder="Alt" style={styles.input} onChange={e=>pChange('djUniEAlt', e.target.value)}/><input type="number" step="0.01" placeholder="Seg" style={styles.input} onChange={e=>pChange('djUniETempo', e.target.value)}/></div>
              {calcDinamicos.rsiUniE > 0 && <span style={styles.resultText}>RSI: {calcDinamicos.rsiUniE}</span>}
            </div>
          </div>
        </div>

        {/* 5. FORÇA MÁXIMA (1RM) */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0' }}>5. Força (Cálculo 1RM Epley)</h4>
          <div style={styles.grid4}>
            <div>
              <label style={styles.label}>Squat (Cg / Reps)</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="Kg" style={styles.input} onChange={e=>fChange('sqCarga', e.target.value)}/><input type="number" placeholder="Rps" style={styles.input} onChange={e=>fChange('sqReps', e.target.value)}/></div>
              {calcDinamicos.rmSquat > 0 && <span style={styles.resultText}>1RM: {calcDinamicos.rmSquat} | Rel: {calcDinamicos.relSquat}</span>}
            </div>
            <div>
              <label style={styles.label}>Deadlift (Cg / Reps)</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="Kg" style={styles.input} onChange={e=>fChange('dlCarga', e.target.value)}/><input type="number" placeholder="Rps" style={styles.input} onChange={e=>fChange('dlReps', e.target.value)}/></div>
              {calcDinamicos.rmDeadlift > 0 && <span style={styles.resultText}>1RM: {calcDinamicos.rmDeadlift} | Rel: {calcDinamicos.relDeadlift}</span>}
            </div>
            <div>
              <label style={styles.label}>Supino (Cg / Reps)</label>
              <div style={{display:'flex', gap:'5px'}}><input type="number" placeholder="Kg" style={styles.input} onChange={e=>fChange('supCarga', e.target.value)}/><input type="number" placeholder="Rps" style={styles.input} onChange={e=>fChange('supReps', e.target.value)}/></div>
              {calcDinamicos.rmSupino > 0 && <span style={styles.resultText}>1RM: {calcDinamicos.rmSupino} | Rel: {calcDinamicos.relSupino}</span>}
            </div>
          </div>
        </div>

        <button type="submit" style={styles.btnPrimary}>Guardar Avaliação Completa</button>
      </form>
    </div>
  );
}