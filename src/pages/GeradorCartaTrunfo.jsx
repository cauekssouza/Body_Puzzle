import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/superbase';
import html2canvas from 'html2canvas';
import { calcularCarta } from '../utils/cartaTrunfo';

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

      const { data } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('aluno_id', alunoSelecionadoId)
        .order('data_avaliacao', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAvaliacaoAtual(data);
        const resultado = data.notas_carta?.atributos
          ? data.notas_carta
          : calcularCarta({
              ...data,
              ...(data.mobilidade || {}),
              ...(data.potencia || {}),
              ...(data.forca || {}),
              ...(data.resistencia || {}),
            });

        setNotas({
          forca: resultado.atributos.forca ?? '-',
          mobilidade: resultado.atributos.mobilidade ?? '-',
          potencia: resultado.atributos.potencia ?? '-',
          fitness: resultado.atributos.fitness ?? '-',
          resistencia: resultado.atributos.resistencia ?? '-',
          overall: resultado.overall ?? '-',
        });
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

      const nomeAluno = alunos.find((a) => a.id === alunoSelecionadoId)?.nome.split(' ')[0] || 'aluno';
      link.download = `carta-${nomeAluno}-${avaliacaoAtual.data_avaliacao}.png`;
      link.click();
    } catch (error) {
      window.alert('Erro ao gerar imagem: ' + error.message);
    } finally {
      setBaixando(false);
    }
  }

  const styles = {
    container: { maxWidth: '800px', margin: '40px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
    select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', marginBottom: '20px' },
    btnPrimary: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
    cartaBox: { position: 'relative', width: '400px', height: '666px', backgroundImage: 'url("/molde-carta.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' },
    overallNota: { position: 'absolute', top: '12%', right: '6.5%', width: '75px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', fontWeight: '900', color: '#4460B8' },
    nomeAluno: { position: 'absolute', top: '44%', width: '100%', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '2px', textTransform: 'uppercase' },
    linhaAtributo: (index) => ({ position: 'absolute', top: `${53.2 + index * 7.25}%`, left: '9%', width: '82%', height: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    nomeAtributo: { color: '#ffffff', fontSize: '15px', fontWeight: '900', marginLeft: '10px', letterSpacing: '1px' },
    notaAtributo: { color: '#4460B8', fontSize: '22px', fontWeight: '900', width: '50px', height: '35px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '-2px' },
  };

  const alunoNomeCurto = alunos.find((a) => a.id === alunoSelecionadoId)?.nome || '';

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: 'center', color: '#1e293b', textTransform: 'uppercase', marginBottom: '25px' }}>
        Gerador de Carta Trunfo
      </h2>

      <select style={styles.select} value={alunoSelecionadoId} onChange={(e) => setAlunoSelecionadoId(e.target.value)}>
        <option value="">Selecione o Aluno para gerar a carta...</option>
        {alunos.map((a) => (
          <option key={a.id} value={a.id}>{a.nome}</option>
        ))}
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
            {baixando ? 'A gerar imagem...' : '📸 Baixar Carta Trunfo (PNG)'}
          </button>
        </div>
      )}
    </div>
  );
}