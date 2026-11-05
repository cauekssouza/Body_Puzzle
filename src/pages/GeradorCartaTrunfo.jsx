import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/superbase';
import html2canvas from 'html2canvas';

// --- MOTOR MATEMÁTICO DA CARTA TRUNFO ---
function calcularNotas(avaliacao) {
  if (!avaliacao) return null;
  const notas = { forca: '-', mobilidade: '-', potencia: '-', fitness: '-', resistencia: '-', overall: 0 };
  const valoresValidos = [];

  // 1. FITNESS (% Gordura)
  if (avaliacao.perc_gordura > 0) {
    const ref = (avaliacao.sexo === 'Feminino' || avaliacao.sexo === 'Feminina') ? 16 : 8;
    const nota = Math.round(Math.max(0, Math.min(99, ((ref + 40 - avaliacao.perc_gordura) / 40) * 99)));
    notas.fitness = nota;
    valoresValidos.push(nota);
  }

  // 2. RESISTÊNCIA (Cooper ou TC6)
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

  // 3. POTÊNCIA (CMJ, SJ, Medball)
  const testesPotencia = [];
  if (avaliacao.potencia) {
    const p = avaliacao.potencia;
    if (p.cmj) testesPotencia.push(Math.min(99, (parseFloat(p.cmj) / 38) * 70));
    if (p.sj) testesPotencia.push(Math.min(99, (parseFloat(p.sj) / 34) * 70));
    if (p.medball) testesPotencia.push(Math.min(99, (parseFloat(p.medball) / 400) * 70));
    
    if (testesPotencia.length > 0) {
      const media = testesPotencia.reduce((a, b) => a + b, 0) / testesPotencia.length;
      notas.potencia = Math.round(media);
      valoresValidos.push(notas.potencia);
    }
  }

  // 4. FORÇA
  const testesForca = [];
  if (avaliacao.forca && avaliacao.massa > 0) {
    const f = avaliacao.forca;
    const calcRel = (carga, reps) => (parseFloat(carga) * (1 + parseFloat(reps) / 30)) / avaliacao.massa;
    
    if (f.sqCarga && f.sqReps) testesForca.push(Math.min(99, Math.round((calcRel(f.sqCarga, f.sqReps) / 2.0) * 25 + 65)));
    if (f.dlCarga && f.dlReps) testesForca.push(Math.min(99, Math.round((calcRel(f.dlCarga, f.dlReps) / 2.25) * 25 + 65)));
    
    if (testesForca.length > 0) {
      const media = testesForca.reduce((a, b) => a + b, 0) / testesForca.length;
      notas.forca = Math.round(media);
      valoresValidos.push(notas.forca);
    }
  }

  // 5. MOBILIDADE
  if (avaliacao.mobilidade) {
    const m = avaliacao.mobilidade;
    let soma = 0, qtd = 0;
    Object.values(m).forEach(val => { if (parseFloat(val) > 0) { soma += parseFloat(val); qtd++; } });
    if (qtd > 0) {
      notas.mobilidade = Math.min(99, Math.round(70 + ((soma / qtd) / 90) * 20));
      valoresValidos.push(notas.mobilidade);
    }
  }

  // OVERALL
  if (valoresValidos.length > 0) {
    notas.overall = Math.round(valoresValidos.reduce((a, b) => a + b, 0) / valoresValidos.length);
  }

  return notas;
}

// --- COMPONENTE PRINCIPAL ---
export default function GeradorCartaTrunfo() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [avaliacaoAtual, setAvaliacaoAtual] = useState(null);
  const [notas, setNotas] = useState(null);
  const [baixando, setBaixando] = useState(false);
  
  const cartaRef = useRef(null);

  useEffect(() => {
    async function carregarAlunos() {
      const { data } = await supabase.from('alunos').select('id, nome').order('nome');
      if (data) setAlunos(data);
    }
    carregarAlunos();
  }, []);

  useEffect(() => {
    async function buscarAvaliacao() {
      if (!alunoSelecionadoId) {
        setAvaliacaoAtual(null);
        setNotas(null);
        return;
      }
      
      const { data } = await supabase.from('avaliacoes')
        .select('*')
        .eq('aluno_id', alunoSelecionadoId)
        .order('data_avaliacao', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        setAvaliacaoAtual(data);
        setNotas(calcularNotas(data));
      } else {
        setAvaliacaoAtual(null);
        setNotas(null);
      }
    }
    buscarAvaliacao();
  }, [alunoSelecionadoId]);

  async function baixarCartaPNG() {
    if (!cartaRef.current) return;
    setBaixando(true);
    
    try {
      const canvas = await html2canvas(cartaRef.current, { scale: 2, useCORS: true });
      const imagemUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imagemUrl;
      
      const nomeAluno = alunos.find(a => a.id === alunoSelecionadoId)?.nome.split(' ')[0] || 'aluno';
      link.download = `carta-${nomeAluno}-${avaliacaoAtual.data_avaliacao}.png`;
      link.click();
    } catch (error) {
      window.alert('Erro ao gerar imagem: ' + error.message);
    } finally {
      setBaixando(false);
    }
  }

// --- ESTILOS COM ALINHAMENTO FLEXBOX (PERFEITO AO CENTRO) ---
  const styles = {
    container: { maxWidth: '800px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', marginBottom: '20px' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
    
    // CONTENTOR DA IMAGEM
    cartaBox: { 
      position: 'relative', 
      width: '400px', 
      height: '666px', 
      backgroundImage: 'url("/molde-carta.jpg")', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      margin: '0 auto', 
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)', 
      overflow: 'hidden', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    },
    
    // NOTA OVERALL (Bolinha Branca Topo Direito)
    overallNota: { 
      position: 'absolute', 
      top: '12%',       // Ajuste vertical
      right: '6.5%',    // Ajuste horizontal
      width: '75px',    // Largura da caixa invisível
      height: '50px',   // Altura da caixa invisível
      display: 'flex', 
      justifyContent: 'center', // Centra na horizontal
      alignItems: 'center',     // Centra na vertical
      fontSize: '40px', 
      fontWeight: '900', 
      color: '#4460B8'
    },
    
    // NOME DO ALUNO (Barra Azul Central)
    nomeAluno: { 
      position: 'absolute', 
      top: '44%',       // Altura exata da barra
      width: '100%',    // Ocupa a largura toda
      height: '40px',   // Altura da caixa
      display: 'flex',
      justifyContent: 'center', // Centra horizontalmente
      alignItems: 'center',     // Centra verticalmente
      fontSize: '22px', 
      fontWeight: '900', 
      color: '#ffffff', 
      letterSpacing: '2px', 
      textTransform: 'uppercase' 
    },
    
    // LINHAS DOS ATRIBUTOS
    linhaAtributo: (index) => ({ 
      position: 'absolute', 
      top: `${53.2 + (index * 7.25)}%`, // A descida milimétrica a cada barra
      left: '9%', 
      width: '82%',     // Define a distância entre o texto esquerdo e o número direito
      height: '35px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    }),
    
    // TEXTO DO ATRIBUTO (Esquerda)
    nomeAtributo: { 
      color: '#ffffff', 
      fontSize: '15px', 
      fontWeight: '900', 
      marginLeft: '10px', 
      letterSpacing: '1px' 
    },
    
    // NOTA DO ATRIBUTO (Bolinhas Brancas Direita)
    notaAtributo: { 
      color: '#4460B8', 
      fontSize: '22px', 
      fontWeight: '900', 
      width: '50px', 
      height: '35px',
      display: 'flex',
      justifyContent: 'center', // Força o número para o centro da bolinha
      alignItems: 'center',     // Força para o centro vertical
      marginRight: '-2px'       // Ajuste fino para a direita
    }
  };

  const alunoNomeCurto = alunos.find(a => a.id === alunoSelecionadoId)?.nome || '';

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: 'center', color: '#1e293b', textTransform: 'uppercase', marginBottom: '25px' }}>Gerador de Carta Trunfo</h2>
      
      <select style={styles.select} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)}>
        <option value="">Selecione o Aluno para gerar a carta...</option>
        {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>

      {alunoSelecionadoId && !avaliacaoAtual && (
        <div style={{ textAlign: 'center', padding: '20px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px' }}>
          Este aluno ainda não tem nenhuma avaliação física registada.
        </div>
      )}

      {notas && (
        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          
          <div ref={cartaRef} style={styles.cartaBox}>
            <div style={styles.overallNota}>{notas.overall}</div>
            <div style={styles.nomeAluno}>{alunoNomeCurto}</div>
            
            <div style={styles.linhaAtributo(0)}><span style={styles.nomeAtributo}>FORÇA</span><span style={styles.notaAtributo}>{notas.forca}</span></div>
            <div style={styles.linhaAtributo(1)}><span style={styles.nomeAtributo}>MOBILIDADE</span><span style={styles.notaAtributo}>{notas.mobilidade}</span></div>
            <div style={styles.linhaAtributo(2)}><span style={styles.nomeAtributo}>POTÊNCIA</span><span style={styles.notaAtributo}>{notas.potencia}</span></div>
            <div style={styles.linhaAtributo(3)}><span style={styles.nomeAtributo}>FITNESS</span><span style={styles.notaAtributo}>{notas.fitness}</span></div>
            <div style={styles.linhaAtributo(4)}><span style={styles.nomeAtributo}>RESISTÊNCIA</span><span style={styles.notaAtributo}>{notas.resistencia}</span></div>
          </div>

          <button onClick={baixarCartaPNG} disabled={baixando} style={styles.btnPrimary}>
            {baixando ? 'A gerar imagem...' : '📸 Baixar Carta Trunfo (PNG)'}
          </button>
        </div>
      )}
    </div>
  );
}