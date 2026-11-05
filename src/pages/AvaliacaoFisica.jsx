import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase'; // Confirma se o teu ficheiro é superbase ou supabase

export default function AvaliacaoFisica() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [dadosAluno, setDadosAluno] = useState(null);
  
  // CABEÇALHO
  const [dataAvaliacao, setDataAvaliacao] = useState(new Date().toISOString().split('T')[0]);
  const [avaliador, setAvaliador] = useState('Professor Body Puzzle');
  const [objetivos, setObjetivos] = useState('');
  
  // ANTROPOMETRIA
  const [massa, setMassa] = useState('');
  const [estatura, setEstatura] = useState('');
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  
  // Dobras
  const [dobras, setDobras] = useState({ triceps: '', subescapular: '', axilar: '', peitoral: '', suprailiaca: '', abdominal: '', coxa: '' });
  
  // Resultados Calculados (Dashboard Azul)
  const [resultadosCalculados, setResultadosCalculados] = useState({
    idade: 0, imc: 0, somaDobras: 0, densidade: 0, percGordura: 0, massaMagra: 0, massaGorda: 0, rcq: 0
  });

  // RESISTÊNCIA
  const [tc6Distancia, setTc6Distancia] = useState('');
  const [cooperDistancia, setCooperDistancia] = useState('');
  const [resistenciaCalculada, setResistenciaCalculada] = useState({ previstoTC6: 0, vo2Cooper: 0 });

  // 1. Carregar lista de alunos
  useEffect(() => {
    async function carregarAlunos() {
      const { data } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (data) setAlunos(data);
    }
    carregarAlunos();
  }, []);

  // 2. Carregar perfil do aluno para extrair a Idade e o Sexo
  useEffect(() => {
    async function carregarPerfilAluno() {
      if (!alunoSelecionadoId) return setDadosAluno(null);
      
      const { data } = await supabase.from('anamneses').select('data_nascimento, sexo').eq('aluno_id', alunoSelecionadoId).single();
      
      if (data && data.data_nascimento) {
        const anoNasc = new Date(data.data_nascimento).getFullYear();
        const anoAtual = new Date(dataAvaliacao).getFullYear();
        const idadeAtual = anoAtual - anoNasc;
        setDadosAluno({ ...data, idade: idadeAtual });
      } else {
        setDadosAluno({ sexo: 'Não informado', idade: 0 });
      }
    }
    carregarPerfilAluno();
  }, [alunoSelecionadoId, dataAvaliacao]);

  // 3. Motor de Cálculos (Corre sempre que um número é alterado)
  useEffect(() => {
    if (!dadosAluno) return;
    
    const m = parseFloat(massa) || 0;
    const e = parseFloat(estatura) || 0;
    let imc = 0, soma = 0, d = 0, percGordura = 0, mGorda = 0, mMagra = 0, rcq = 0;

    if (m > 0 && e > 0) imc = m / (e * e);

    if (parseFloat(cintura) > 0 && parseFloat(quadril) > 0) {
      rcq = parseFloat(cintura) / parseFloat(quadril);
    }

    const dVal = Object.values(dobras).map(v => parseFloat(v) || 0);
    soma = dVal.reduce((acc, val) => acc + val, 0);

    if (soma > 0) {
      // Jackson & Pollock e Siri
      d = 1.112 - (0.00043499 * soma) + (0.00000055 * (soma * soma)) - (0.00028826 * (dadosAluno.idade || 25));
      if (d > 0) {
        percGordura = ((4.95 / d) - 4.5) * 100;
        if (percGordura < 0) percGordura = 0; 
        mGorda = m * (percGordura / 100);
        mMagra = m - mGorda;
      }
    }

    setResultadosCalculados({
      idade: dadosAluno.idade,
      imc: imc.toFixed(2),
      somaDobras: soma.toFixed(1),
      densidade: d.toFixed(4),
      percGordura: percGordura.toFixed(2),
      massaGorda: mGorda.toFixed(2),
      massaMagra: mMagra.toFixed(2),
      rcq: rcq.toFixed(2)
    });

    const sexoNum = (dadosAluno.sexo === 'Masculino' || dadosAluno.sexo === 'Masculina') ? 1 : 0;
    let prevTC6 = 0, vo2 = 0;
    
    if (tc6Distancia) {
      prevTC6 = 890.46 - (6.11 * dadosAluno.idade) + (0.0345 * Math.pow(dadosAluno.idade, 2)) + (48.87 * sexoNum) - (4.87 * imc);
    }
    if (cooperDistancia) {
      vo2 = (parseFloat(cooperDistancia) - 504.9) / 44.73;
    }
    setResistenciaCalculada({ previstoTC6: prevTC6.toFixed(1), vo2Cooper: vo2.toFixed(1) });

  }, [massa, estatura, cintura, quadril, dobras, tc6Distancia, cooperDistancia, dadosAluno]);

  function handleDobraChange(campo, valor) {
    setDobras(prev => ({ ...prev, [campo]: valor }));
  }

  // 4. Salvar na Base de Dados
  async function handleSalvarAvaliacao(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');

    const { error } = await supabase.from('avaliacoes').insert([{
      aluno_id: alunoSelecionadoId,
      data_avaliacao: dataAvaliacao,
      avaliador,
      idade: resultadosCalculados.idade,
      sexo: dadosAluno?.sexo,
      objetivos,
      massa: parseFloat(massa) || null,
      estatura: parseFloat(estatura) || null,
      imc: parseFloat(resultadosCalculados.imc) || null,
      perc_gordura: parseFloat(resultadosCalculados.percGordura) || null,
      massa_magra: parseFloat(resultadosCalculados.massaMagra) || null,
      massa_gorda: parseFloat(resultadosCalculados.massaGorda) || null,
      rcq: parseFloat(resultadosCalculados.rcq) || null,
      dobras: dobras, // Salva o objeto JSON diretamente
      perimetros: { cintura, quadril },
      resistencia: { tc6: tc6Distancia, cooper: cooperDistancia, vo2: resistenciaCalculada.vo2Cooper }
    }]);

    if (error) {
      window.alert('Erro ao salvar avaliação: ' + error.message);
    } else {
      window.alert('Avaliação Física guardada com sucesso!');
      setMassa(''); setEstatura(''); setCintura(''); setQuadril('');
      setDobras({ triceps: '', subescapular: '', axilar: '', peitoral: '', suprailiaca: '', abdominal: '', coxa: '' });
      setTc6Distancia(''); setCooperDistancia('');
    }
  }

  // ESTILOS
  const styles = {
    container: { maxWidth: '800px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    title: { textAlign: 'center', color: '#1e293b', fontSize: '24px', fontWeight: '800', marginBottom: '25px', textTransform: 'uppercase' },
    sectionBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '15px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
    label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' },
    resultBox: { background: '#e0f2fe', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0ea5e9', display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' },
    resultItem: { display: 'flex', flexDirection: 'column' },
    resultValue: { fontSize: '18px', fontWeight: 'bold', color: '#0369a1' },
    btnPrimary: { width: '100%', padding: '15px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Nova Avaliação Física</h2>
      
      <form onSubmit={handleSalvarAvaliacao}>
        
        {/* CABEÇALHO */}
        <div style={styles.sectionBox}>
          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>Aluno</label>
              <select style={styles.input} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)} required>
                <option value="">Selecione o Aluno...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Data da Avaliação</label>
              <input type="date" style={styles.input} value={dataAvaliacao} onChange={e => setDataAvaliacao(e.target.value)} required />
            </div>
            <div>
              <label style={styles.label}>Dados Base (Anamnese)</label>
              <div style={{ padding: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#475569' }}>
                Idade: <strong>{dadosAluno?.idade || '-'}</strong> | Sexo: <strong>{dadosAluno?.sexo || '-'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 1. ANTROPOMETRIA */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0', color: '#334155' }}>1. Antropometria & Composição Corporal</h4>
          <div style={styles.grid4}>
            <div><label style={styles.label}>Massa (kg)</label><input type="number" step="0.1" style={styles.input} value={massa} onChange={e => setMassa(e.target.value)} /></div>
            <div><label style={styles.label}>Estatura (m)</label><input type="number" step="0.01" style={styles.input} value={estatura} onChange={e => setEstatura(e.target.value)} /></div>
            <div><label style={styles.label}>Cintura (cm)</label><input type="number" step="0.1" style={styles.input} value={cintura} onChange={e => setCintura(e.target.value)} /></div>
            <div><label style={styles.label}>Quadril (cm)</label><input type="number" step="0.1" style={styles.input} value={quadril} onChange={e => setQuadril(e.target.value)} /></div>
          </div>

          <label style={{...styles.label, marginTop: '15px'}}>Dobras Cutâneas (mm)</label>
          <div style={styles.grid4}>
            {Object.keys(dobras).map((dobra) => (
              <div key={dobra}>
                <label style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>{dobra}</label>
                <input type="number" step="0.1" style={styles.input} value={dobras[dobra]} onChange={e => handleDobraChange(dobra, e.target.value)} />
              </div>
            ))}
          </div>

          {/* DASHBOARD DE CÁLCULO EM TEMPO REAL */}
          {parseFloat(massa) > 0 && (
            <div style={styles.resultBox}>
              <div style={styles.resultItem}><span style={styles.label}>IMC</span><span style={styles.resultValue}>{resultadosCalculados.imc}</span></div>
              <div style={styles.resultItem}><span style={styles.label}>% Gordura</span><span style={styles.resultValue}>{resultadosCalculados.percGordura}%</span></div>
              <div style={styles.resultItem}><span style={styles.label}>Massa Magra</span><span style={styles.resultValue}>{resultadosCalculados.massaMagra} kg</span></div>
              <div style={styles.resultItem}><span style={styles.label}>Massa Gorda</span><span style={styles.resultValue}>{resultadosCalculados.massaGorda} kg</span></div>
              <div style={styles.resultItem}><span style={styles.label}>RCQ</span><span style={styles.resultValue}>{resultadosCalculados.rcq || '-'}</span></div>
            </div>
          )}
        </div>

        {/* 2. RESISTÊNCIA */}
        <div style={styles.sectionBox}>
          <h4 style={{ margin: '0 0 15px 0', color: '#334155' }}>2. Testes de Resistência</h4>
          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>Caminhada 6m (Distância em m)</label>
              <input type="number" style={styles.input} value={tc6Distancia} onChange={e => setTc6Distancia(e.target.value)} />
              {tc6Distancia && <span style={{fontSize: '12px', color: '#2563eb'}}>Previsto: {resistenciaCalculada.previstoTC6}m</span>}
            </div>
            <div>
              <label style={styles.label}>Cooper 12m (Distância em m)</label>
              <input type="number" style={styles.input} value={cooperDistancia} onChange={e => setCooperDistancia(e.target.value)} />
              {cooperDistancia && <span style={{fontSize: '12px', color: '#2563eb'}}>VO2 Est: {resistenciaCalculada.vo2Cooper}</span>}
            </div>
          </div>
        </div>

        <button type="submit" style={styles.btnPrimary}>Salvar Avaliação Física</button>
      </form>
    </div>
  );
}