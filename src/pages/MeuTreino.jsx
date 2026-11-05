import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/superbase';
import html2canvas from 'html2canvas';

// --- MOTOR MATEMÁTICO DA CARTA TRUNFO ---
function calcularNotas(avaliacao) {
  if (!avaliacao) return null;
  const notas = { forca: '-', mobilidade: '-', potencia: '-', fitness: '-', resistencia: '-', overall: 0 };
  const valoresValidos = [];

  if (avaliacao.perc_gordura > 0) {
    const ref = (avaliacao.sexo === 'Feminino' || avaliacao.sexo === 'Feminina') ? 16 : 8;
    const nota = Math.round(Math.max(0, Math.min(99, ((ref + 40 - avaliacao.perc_gordura) / 40) * 99)));
    notas.fitness = nota;
    valoresValidos.push(nota);
  }

  if (avaliacao.resistencia) {
    const { tc6, vo2 } = avaliacao.resistencia;
    if (parseFloat(vo2) > 0) {
      const ref = (avaliacao.sexo === 'Feminino' || avaliacao.sexo === 'Feminina') ? 44.7 : 55.2;
      const nota = Math.min(99, Math.round(70 + (parseFloat(vo2) / ref) * 20));
      notas.resistencia = nota;
      valoresValidos.push(nota);
    } else if (parseFloat(tc6) > 0) {
      const prev = 600; 
      const nota = Math.min(70, Math.round((parseFloat(tc6) / prev) * 60));
      notas.resistencia = nota;
      valoresValidos.push(nota);
    }
  }

  const testesPotencia = [];
  if (avaliacao.potencia) {
    const p = avaliacao.potencia;
    if (p.cmj) testesPotencia.push(Math.min(99, (parseFloat(p.cmj) / 38) * 70));
    if (p.sj) testesPotencia.push(Math.min(99, (parseFloat(p.sj) / 34) * 70));
    if (p.medball) testesPotencia.push(Math.min(99, (parseFloat(p.medball) / 400) * 70));
    if (testesPotencia.length > 0) {
      notas.potencia = Math.round(testesPotencia.reduce((a, b) => a + b, 0) / testesPotencia.length);
      valoresValidos.push(notas.potencia);
    }
  }

  const testesForca = [];
  if (avaliacao.forca && avaliacao.massa > 0) {
    const f = avaliacao.forca;
    const calcRel = (carga, reps) => (parseFloat(carga) * (1 + parseFloat(reps) / 30)) / avaliacao.massa;
    if (f.sqCarga && f.sqReps) testesForca.push(Math.min(99, Math.round((calcRel(f.sqCarga, f.sqReps) / 2.0) * 25 + 65)));
    if (f.dlCarga && f.dlReps) testesForca.push(Math.min(99, Math.round((calcRel(f.dlCarga, f.dlReps) / 2.25) * 25 + 65)));
    if (testesForca.length > 0) {
      notas.forca = Math.round(testesForca.reduce((a, b) => a + b, 0) / testesForca.length);
      valoresValidos.push(notas.forca);
    }
  }

  if (avaliacao.mobilidade) {
    const m = avaliacao.mobilidade;
    let soma = 0, qtd = 0;
    Object.values(m).forEach(val => { if (parseFloat(val) > 0) { soma += parseFloat(val); qtd++; } });
    if (qtd > 0) {
      notas.mobilidade = Math.min(99, Math.round(70 + ((soma / qtd) / 90) * 20));
      valoresValidos.push(notas.mobilidade);
    }
  }

  if (valoresValidos.length > 0) {
    notas.overall = Math.round(valoresValidos.reduce((a, b) => a + b, 0) / valoresValidos.length);
  }

  return notas;
}

// --- COMPONENTE MEU TREINO ---
export default function MeuTreino() {
  const [alunoId, setAlunoId] = useState(null);
  const [alunoNome, setAlunoNome] = useState('');
  const [treinos, setTreinos] = useState([]);
  const [avaliacaoAtual, setAvaliacaoAtual] = useState(null);
  const [notas, setNotas] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  const cartaRef = useRef(null);

  // 1. Identificar o Aluno Logado
  useEffect(() => {
    async function carregarDadosAluno() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setCarregando(false);

      const { data: alunoData } = await supabase
        .from('alunos')
        .select('id, nome')
        .eq('user_id', session.user.id)
        .single();

      if (alunoData) {
        setAlunoId(alunoData.id);
        setAlunoNome(alunoData.nome);
        buscarTreinosEAvaliacao(alunoData.id);
      } else {
        setCarregando(false);
      }
    }
    carregarDadosAluno();
  }, []);

  // 2. Buscar os Treinos e a Avaliação Física
  async function buscarTreinosEAvaliacao(id) {
    // Busca os treinos
    const { data: treinosData } = await supabase
      .from('treinos')
      .select('*')
      .eq('aluno_id', id)
      .order('created_at', { ascending: false });
    
    if (treinosData) setTreinos(treinosData);

    // Busca a última avaliação física
    const { data: avaliacaoData } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('aluno_id', id)
      .order('data_avaliacao', { ascending: false })
      .limit(1)
      .single();
      
    if (avaliacaoData) {
      setAvaliacaoAtual(avaliacaoData);
      setNotas(calcularNotas(avaliacaoData));
    }
    
    setCarregando(false);
  }

  // 3. Exportar PNG da Carta Trunfo
  async function baixarCartaPNG() {
    if (!cartaRef.current) return;
    setBaixando(true);
    
    try {
      const canvas = await html2canvas(cartaRef.current, { scale: 2, useCORS: true });
      const imagemUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imagemUrl;
      const nomeCurto = alunoNome.split(' ')[0] || 'aluno';
      link.download = `carta-${nomeCurto}-${avaliacaoAtual.data_avaliacao}.png`;
      link.click();
    } catch (error) {
      window.alert('Erro ao gerar imagem: ' + error.message);
    } finally {
      setBaixando(false);
    }
  }

  // --- ESTILOS ---
  const styles = {
    container: { maxWidth: '800px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    title: { color: '#1e293b', textTransform: 'uppercase', marginBottom: '25px', textAlign: 'center' },
    treinoBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    treinoHeader: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px' },
    exerciciosTexto: { whiteSpace: 'pre-wrap', fontSize: '14px', color: '#334155', lineHeight: '1.6' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
    
    // Carta Visual
    cartaBox: { position: 'relative', width: '400px', height: '666px', backgroundImage: 'url("/molde-carta.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' },
    overallNota: { position: 'absolute', top: '16.5%', right: '11%', fontSize: '42px', fontWeight: 'bold', color: '#4460B8', textAlign: 'center', width: '70px' },
    nomeAluno: { position: 'absolute', top: '48.5%', width: '100%', textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase' },
    linhaAtributo: (index) => ({ position: 'absolute', top: `${55.5 + (index * 7.1)}%`, left: '12%', width: '76%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '35px' }),
    nomeAtributo: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', marginLeft: '15px', letterSpacing: '1px' },
    notaAtributo: { color: '#4460B8', fontSize: '20px', fontWeight: 'bold', marginRight: '15px', width: '40px', textAlign: 'center' }
  };

  if (carregando) return <div style={{ textAlign: 'center', padding: '50px' }}>A carregar o teu painel...</div>;

  if (!alunoId) return (
    <div style={styles.container}>
      <h2 style={styles.title}>Meu Painel</h2>
      <div style={{ textAlign: 'center', color: '#ef4444' }}>Não foi encontrado um perfil de aluno associado a esta conta.</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Olá, {alunoNome.split(' ')[0]}! 👋</h2>
      
      {/* SECÇÃO 1: OS TREINOS DO ALUNO */}
      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: '30px' }}>🏋️ O Teu Treino Atual</h3>
      {treinos.length > 0 ? (
        treinos.map(treino => (
          <div key={treino.id} style={styles.treinoBox}>
            <div style={styles.treinoHeader}>{treino.titulo || 'Treino do Mesociclo'}</div>
            <div style={styles.exerciciosTexto}>{treino.exercicios}</div>
          </div>
        ))
      ) : (
        <p style={{ color: '#64748b' }}>Ainda não tens treinos prescritos.</p>
      )}

      {/* SECÇÃO 2: A CARTA TRUNFO DO ALUNO */}
      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: '40px' }}>🏆 A Tua Carta Trunfo</h3>
      {notas ? (
        <div style={{ background: '#f1f5f9', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          
          <div ref={cartaRef} style={styles.cartaBox}>
            <div style={styles.overallNota}>{notas.overall}</div>
            <div style={styles.nomeAluno}>{alunoNome}</div>
            
            <div style={styles.linhaAtributo(0)}><span style={styles.nomeAtributo}>FORÇA</span><span style={styles.notaAtributo}>{notas.forca}</span></div>
            <div style={styles.linhaAtributo(1)}><span style={styles.nomeAtributo}>MOBILIDADE</span><span style={styles.notaAtributo}>{notas.mobilidade}</span></div>
            <div style={styles.linhaAtributo(2)}><span style={styles.nomeAtributo}>POTÊNCIA</span><span style={styles.notaAtributo}>{notas.potencia}</span></div>
            <div style={styles.linhaAtributo(3)}><span style={styles.nomeAtributo}>FITNESS</span><span style={styles.notaAtributo}>{notas.fitness}</span></div>
            <div style={styles.linhaAtributo(4)}><span style={styles.nomeAtributo}>RESISTÊNCIA</span><span style={styles.notaAtributo}>{notas.resistencia}</span></div>
          </div>

          <button onClick={baixarCartaPNG} disabled={baixando} style={styles.btnPrimary}>
            {baixando ? 'A gerar imagem...' : '📸 Guardar a minha Carta (PNG)'}
          </button>
        </div>
      ) : (
        <p style={{ color: '#64748b' }}>A tua avaliação física e Carta Trunfo ainda não foram geradas pela equipa.</p>
      )}
    </div>
  );
}