import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/superbase';
import html2canvas from 'html2canvas';
import { calcularCarta } from '../utils/cartaTrunfo';
import { abrirLaudoPDF } from '../utils/gerarLaudoPDF';

export default function MeuTreino() {
  const [alunoId, setAlunoId] = useState(null);
  const [alunoNome, setAlunoNome] = useState('');
  const [treinos, setTreinos] = useState([]);
  const [avaliacaoAtual, setAvaliacaoAtual] = useState(null);
  const [avaliacaoAnterior, setAvaliacaoAnterior] = useState(null);
  const [cartaCalculada, setCartaCalculada] = useState(null);
  const [notas, setNotas] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const cartaRef = useRef(null);

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

  async function buscarTreinosEAvaliacao(id) {
    const { data: treinosData } = await supabase
      .from('treinos')
      .select('*, mesociclos(nome)')
      .eq('aluno_id', id)
      .order('criado_em', { ascending: false });

    if (treinosData) setTreinos(treinosData);

    const { data: avaliacoesData } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('aluno_id', id)
      .order('data_avaliacao', { ascending: false })
      .limit(2);

    const avaliacaoData = avaliacoesData?.[0] || null;
    const avaliacaoAnt = avaliacoesData?.[1] || null;

    if (avaliacaoData) {
      setAvaliacaoAtual(avaliacaoData);
      setAvaliacaoAnterior(avaliacaoAnt);
      const resultado = avaliacaoData.notas_carta?.atributos
        ? avaliacaoData.notas_carta
        : calcularCarta({
            ...avaliacaoData,
            ...(avaliacaoData.mobilidade || {}),
            ...(avaliacaoData.potencia || {}),
            ...(avaliacaoData.forca || {}),
            ...(avaliacaoData.resistencia || {}),
          });

      setCartaCalculada(resultado);
      setNotas({
        forca: resultado.atributos.forca ?? '-',
        mobilidade: resultado.atributos.mobilidade ?? '-',
        potencia: resultado.atributos.potencia ?? '-',
        fitness: resultado.atributos.fitness ?? '-',
        resistencia: resultado.atributos.resistencia ?? '-',
        overall: resultado.overall ?? '-',
      });
    }

    setCarregando(false);
  }

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

  const styles = {
    container: { maxWidth: '800px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    title: { color: '#1e293b', textTransform: 'uppercase', marginBottom: '25px', textAlign: 'center' },
    treinoBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    treinoHeader: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' },
    exerciciosTexto: { whiteSpace: 'pre-wrap', fontSize: '14px', color: '#334155', lineHeight: '1.6' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
    cartaBox: { position: 'relative', width: '400px', height: '666px', backgroundImage: 'url("/molde-carta.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' },
    overallNota: { position: 'absolute', top: '12%', right: '6.5%', width: '75px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', fontWeight: '900', color: '#4460B8' },
    nomeAluno: { position: 'absolute', top: '44%', width: '100%', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '2px', textTransform: 'uppercase' },
    linhaAtributo: (index) => ({ position: 'absolute', top: `${53.2 + index * 7.25}%`, left: '9%', width: '82%', height: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    nomeAtributo: { color: '#ffffff', fontSize: '15px', fontWeight: '900', marginLeft: '10px', letterSpacing: '1px' },
    notaAtributo: { color: '#4460B8', fontSize: '22px', fontWeight: '900', width: '50px', height: '35px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '-2px' },
  };

  if (carregando) return <div style={{ textAlign: 'center', padding: '50px' }}>A carregar o teu painel...</div>;

  if (!alunoId) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Meu Painel</h2>
        <div style={{ textAlign: 'center', color: '#ef4444' }}>Não foi encontrado um perfil de aluno associado a esta conta.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Olá, {alunoNome.split(' ')[0]}! 👋</h2>

      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: '30px' }}>🏋️ O Teu Treino Atual</h3>
      {treinos.length > 0 ? (
        treinos.map((treino) => (
          <div key={treino.id} style={styles.treinoBox}>
            <div style={styles.treinoHeader}>{treino.titulo || 'Treino do Mesociclo'}</div>
            {treino.mesociclos?.nome && (
              <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: 'bold', marginBottom: '10px' }}>
                📅 Mesociclo: {treino.mesociclos.nome}
              </div>
            )}
            <div style={styles.exerciciosTexto}>{treino.exercicios}</div>
          </div>
        ))
      ) : (
        <p style={{ color: '#64748b' }}>Ainda não tens treinos prescritos.</p>
      )}

      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginTop: '40px' }}>🏆 A Tua Carta Trunfo</h3>
      {notas ? (
        <div style={{ background: '#f1f5f9', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <div ref={cartaRef} style={styles.cartaBox}>
            <div style={styles.overallNota}>{notas.overall}</div>
            <div style={styles.nomeAluno}>{alunoNome}</div>

            <div style={styles.linhaAtributo(0)}>
              <span style={styles.nomeAtributo}>FORÇA</span>
              <span style={styles.notaAtributo}>{notas.forca}</span>
            </div>
            <div style={styles.linhaAtributo(1)}>
              <span style={styles.nomeAtributo}>MOBILIDADE</span>
              <span style={styles.notaAtributo}>{notas.mobilidade}</span>
            </div>
            <div style={styles.linhaAtributo(2)}>
              <span style={styles.nomeAtributo}>POTÊNCIA</span>
              <span style={styles.notaAtributo}>{notas.potencia}</span>
            </div>
            <div style={styles.linhaAtributo(3)}>
              <span style={styles.nomeAtributo}>FITNESS</span>
              <span style={styles.notaAtributo}>{notas.fitness}</span>
            </div>
            <div style={styles.linhaAtributo(4)}>
              <span style={styles.nomeAtributo}>RESISTÊNCIA</span>
              <span style={styles.notaAtributo}>{notas.resistencia}</span>
            </div>
          </div>

          <button onClick={baixarCartaPNG} disabled={baixando} style={styles.btnPrimary}>
            {baixando ? 'A gerar imagem...' : '📸 Guardar a minha Carta (PNG)'}
          </button>
          <button
            onClick={() =>
              abrirLaudoPDF({
                aluno: { id: alunoId, nome: alunoNome },
                avaliacao: avaliacaoAtual,
                avaliacaoAnterior,
                carta: cartaCalculada,
                secoesVisiveis: {
                  forca: true,
                  potencia: true,
                  mobilidade: true,
                  resistencia: true,
                  fitness: true,
                  movimento: true,
                },
              })
            }
            style={{ ...styles.btnPrimary, background: '#2DAFAB', marginTop: '12px' }}
          >
            📄 Baixar avaliação (PDF)
          </button>
        </div>
      ) : (
        <p style={{ color: '#64748b' }}>A tua avaliação física e Carta Trunfo ainda não foram geradas pela equipa.</p>
      )}
    </div>
  );
}