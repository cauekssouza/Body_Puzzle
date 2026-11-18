import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/superbase';
import html2canvas from 'html2canvas';
import { calcularCarta } from '../utils/cartaTrunfo';
import { abrirLaudoPDF } from '../utils/gerarLaudoPDF';
import {
  normalizarTexto,
  normalizarBloco,
  ordenarItensTreinoPorBloco,
  extrairDuracaoAquecimento,
  formatarAuditoriaAula,
  carregarSessoesDoAluno,
  calcularDadosProgressaoExercicio,
} from '../utils/prescricaoUtils';

export default function MeuTreino() {
  const [alunoId, setAlunoId] = useState(null);
  const [alunoNome, setAlunoNome] = useState('');
  const [treinos, setTreinos] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [exerciciosBib, setExerciciosBib] = useState([]);
  const [exProgId, setExProgId] = useState('');
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
    const [resTreinos, resEx, listaSessoes] = await Promise.all([
      supabase
        .from('treinos')
        .select('*, mesociclos(id, nome, data_inicio, excluido_em)')
        .eq('aluno_id', id)
        .order('criado_em', { ascending: false }),
      supabase.from('exercicios').select('id, nome, padrao'),
      carregarSessoesDoAluno(id),
    ]);

    const treinosData = resTreinos.data;
    if (treinosData) {
      setTreinos(treinosData.filter((t) => !t.excluido_em && !t.mesociclos?.excluido_em));
    }
    setExerciciosBib(resEx.data || []);

    const sessAtivas = (listaSessoes || []).filter((s) => !s.excluido_em);
    setSessoes(sessAtivas);
    if (sessAtivas.length > 0 && sessAtivas[0].sessao_itens?.length > 0) {
      const primeiroIt = sessAtivas[0].sessao_itens[0];
      setExProgId(
        primeiroIt.exercicio_id
          ? `id:${primeiroIt.exercicio_id}`
          : `nome:${normalizarTexto(primeiroIt.exercicio_nome)}`
      );
    }

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
        treinos.map((treino) => {
          const itensOrdenados = ordenarItensTreinoPorBloco(treino.itens_estruturados || []);
          const durAq = extrairDuracaoAquecimento(treino);
          const auditoriaTexto = formatarAuditoriaAula(treino);

          return (
            <div key={treino.id} style={styles.treinoBox}>
              <div style={styles.treinoHeader}>{treino.titulo || 'Treino do Mesociclo'}</div>
              {treino.mesociclos?.nome && (
                <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: 'bold', marginBottom: '6px' }}>
                  📅 Mesociclo: {treino.mesociclos.nome}
                </div>
              )}
              {auditoriaTexto && (
                <div style={{ fontSize: '12px', color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', display: 'inline-block', padding: '3px 9px', borderRadius: '999px', marginBottom: '10px', fontWeight: 'bold' }}>
                  ✏️ {auditoriaTexto}
                </div>
              )}
              {itensOrdenados.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {itensOrdenados.map((item, idx) => {
                    const isCardio = item.tipo === 'cardio';
                    const isAquecimento = normalizarBloco(item.bloco) === '0';
                    const isTextoLivre = item.tipo === 'texto';

                    if (isCardio) {
                      return (
                        <div
                          key={item.id_unico || idx}
                          style={{
                            background: '#f0fdfa',
                            border: '1px solid #99f6e4',
                            borderLeft: '6px solid #2DAFAB',
                            borderRadius: '8px',
                            padding: '12px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ background: '#2DAFAB', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                              🫀 CARDIO
                            </span>
                            <strong style={{ color: '#0f766e', fontSize: '14.5px' }}>
                              [Bloco {item.bloco || '1'}] {item.titulo || 'Bloco Cardiorrespiratório'}
                            </strong>
                            {item.duracao_min && (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', background: '#ccfbf1', padding: '2px 7px', borderRadius: '6px' }}>
                                ⏱️ {item.duracao_min} min
                              </span>
                            )}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#134e4a', lineHeight: '1.5' }}>
                            {item.descricao}
                          </div>
                        </div>
                      );
                    }

                    if (isTextoLivre) {
                      return (
                        <div
                          key={item.id_unico || idx}
                          style={{
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            borderLeft: '6px solid #E17900',
                            borderRadius: '8px',
                            padding: '12px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ background: '#E17900', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                              🔥 AQUECIMENTO
                            </span>
                            <strong style={{ color: '#9a3412', fontSize: '14.5px' }}>
                              {item.titulo || 'Aquecimento'}
                            </strong>
                            {durAq && (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#9a3412', background: '#ffedd5', padding: '2px 7px', borderRadius: '6px' }}>
                                ⏱️ {durAq} min
                              </span>
                            )}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#7c2d12', lineHeight: '1.5' }}>
                            {item.descricao}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id_unico || idx}
                        style={{
                          background: isAquecimento ? '#fff7ed' : '#ffffff',
                          border: isAquecimento ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                          borderLeft: isAquecimento ? '6px solid #E17900' : '4px solid #4460B8',
                          borderRadius: '6px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {isAquecimento && (
                            <span style={{ background: '#E17900', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                              🔥 AQUECIMENTO{durAq ? ` (${durAq} min)` : ''}
                            </span>
                          )}
                          <strong style={{ fontSize: '14px', color: isAquecimento ? '#9a3412' : '#0f172a' }}>
                            [{isAquecimento ? 'Aquecimento' : `Bloco ${item.bloco || '1'}`}] • {item.nome} ({item.equipamento || 'Livre'})
                          </strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>
                          {item.series}x{item.repeticoes} | Carga: {item.carga && item.carga !== '-' ? `${item.carga}kg` : '-'} | Intervalo: {item.intervalo || '-'}
                        </div>
                        {item.pontos_atencao && (
                          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                            💡 Dica: {item.pontos_atencao}
                          </div>
                        )}
                        {item.observacao && (
                          <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                            📝 Obs: {item.observacao}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.exerciciosTexto}>{treino.exercicios}</div>
              )}
            </div>
          );
        })
      ) : (
        <p style={{ color: '#64748b' }}>Ainda não tens treinos prescritos.</p>
      )}

      {/* PROGRESSÃO DE CARGA DO ALUNO LOGADO (SEÇÃO 3 e 4) */}
      {sessoes.length > 0 && (() => {
        const mapaEx = new Map();
        sessoes.forEach((s) => {
          (s.sessao_itens || []).forEach((it) => {
            const exBib = exerciciosBib.find((e) => String(e.id) === String(it.exercicio_id));
            const nomeEx = exBib?.nome || it.exercicio_nome || 'Exercício';
            const chave = it.exercicio_id ? `id:${it.exercicio_id}` : `nome:${normalizarTexto(nomeEx)}`;
            if (!mapaEx.has(chave)) {
              mapaEx.set(chave, {
                chave,
                exercicio_id: it.exercicio_id || exBib?.id || null,
                nome: nomeEx,
                padrao: exBib?.padrao || 'Exercício',
              });
            }
          });
        });
        const listaExFeitos = Array.from(mapaEx.values());
        const exAtivo = listaExFeitos.find((e) => e.chave === exProgId) || listaExFeitos[0] || null;
        const dadosProg = exAtivo
          ? calcularDadosProgressaoExercicio({
              sessoesDoAluno: sessoes,
              exercicioId: exAtivo.exercicio_id,
              exercicioNome: exAtivo.nome,
            })
          : null;

        return (
          <div style={{ marginTop: '36px' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              📈 A Tua Progressão de Carga
            </h3>
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Escolhe o exercício:
                </label>
                <select
                  value={exAtivo?.chave || ''}
                  onChange={(e) => setExProgId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                >
                  {listaExFeitos.map((ex) => (
                    <option key={ex.chave} value={ex.chave}>
                      {ex.nome} ({ex.padrao})
                    </option>
                  ))}
                </select>
              </div>

              {dadosProg && dadosProg.tabelaSessoes.length > 0 && (
                <>
                  <div style={{ background: '#eff6ff', borderLeft: '5px solid #4460B8', padding: '10px 14px', borderRadius: '8px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                    {dadosProg.destaques.resumoTexto}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Data</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Semana</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Séries × Reps</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Carga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosProg.tabelaSessoes.map((r) => (
                        <tr key={r.sessaoId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px' }}>{r.dataBR}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{r.semana}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{r.seriesXReps}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#1e40af' }}>
                            {r.cargaFormatada}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        );
      })()}

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
