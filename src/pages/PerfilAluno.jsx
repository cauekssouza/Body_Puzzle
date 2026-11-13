import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import { calcularIdadeNaData, calcularCarta } from '../utils/cartaTrunfo';
import { calcularSituacaoPagamento } from './ListaAlunos';
import { abrirLaudoPDF } from '../utils/gerarLaudoPDF';

const NOMES_TESTES_AMIGAVEIS = {
  // Antropometria
  massa: 'Massa Corporal (kg)',
  estatura: 'Estatura (m)',
  imc: 'IMC (kg/m²)',
  pct_gordura: '% Gordura',
  massa_gorda: 'Massa Gorda (kg)',
  massa_magra: 'Massa Magra (kg)',
  rcq: 'RCQ',
  // Mobilidade
  ri_ombro_d: 'RI Ombro D (°)',
  ri_ombro_e: 'RI Ombro E (°)',
  re_ombro_d: 'RE Ombro D (°)',
  re_ombro_e: 'RE Ombro E (°)',
  ri_quadril_d: 'RI Quadril D (°)',
  ri_quadril_e: 'RI Quadril E (°)',
  re_quadril_d: 'RE Quadril D (°)',
  re_quadril_e: 'RE Quadril E (°)',
  isquios_d: 'Isquiotibiais D (°)',
  isquios_e: 'Isquiotibiais E (°)',
  dorsi_d: 'Dorsiflexão D (°)',
  dorsi_e: 'Dorsiflexão E (°)',
  // Potência
  cmj_maior: 'CMJ Maior (cm)',
  cmj_media: 'CMJ Média (cm)',
  sj_maior: 'SJ Maior (cm)',
  sj_media: 'SJ Média (cm)',
  sj_cmj_rel: 'Relação SJ/CMJ (%)',
  rsi_bi: 'RSI Bilateral',
  rsi_d: 'RSI Direito',
  rsi_e: 'RSI Esquerdo',
  salto_horizontal: 'Salto Horizontal (cm)',
  hop_d: 'Hop D (cm)',
  hop_e: 'Hop E (cm)',
  triple_hop_d: 'Triple Hop D (cm)',
  triple_hop_e: 'Triple Hop E (cm)',
  medball: 'Medball 3kg (cm)',
  // Força
  sentar_levantar: 'Sentar e Levantar 30s (reps)',
  hang_hold: 'Hang Hold (s)',
  knee_pushup: 'Knee Push-up 30s (reps)',
  canoa: 'Canoa (s)',
  ponte_glutea: 'Ponte Glútea (s)',
  pushup: 'Push-up Máx (reps)',
  prancha: 'Prancha (s)',
  chinup: 'Chin-up Máx (reps)',
  squat_1rm: 'Squat 1RM Est. (kg)',
  squat_rel: 'Squat Força Relativa',
  deadlift_1rm: 'Deadlift 1RM Est. (kg)',
  deadlift_rel: 'Deadlift Força Relativa',
  supino_1rm: 'Supino 1RM Est. (kg)',
  supino_rel: 'Supino Força Relativa',
  // Resistência
  tc6_distancia: 'TC6 Distância (m)',
  tc6_pct: 'TC6 % Previsto',
  cooper_distancia: 'Cooper 12min (m)',
  vo2: 'VO₂ Estimado (mL/kg/min)',
  pace: 'Pace Corrida (min/km)',
};

function somarMeses(dataStr, meses) {
  if (!dataStr) return '-';
  const d = new Date(`${dataStr}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString('pt-BR');
}

// Converte "11/2026" (banco) -> "2026-11" (input type="month")
function refParaInputMonth(refStr) {
  if (!refStr) return '';
  if (refStr.includes('-')) return refStr.slice(0, 7);
  const [mes, ano] = refStr.split('/');
  if (!mes || !ano) return '';
  return `${ano}-${mes.padStart(2, '0')}`;
}

// Converte "2026-11" (input type="month") -> "11/2026" (banco)
function inputMonthParaRef(monthStr) {
  if (!monthStr) return '';
  const [ano, mes] = monthStr.split('-');
  if (!ano || !mes) return monthStr;
  return `${mes}/${ano}`;
}

export default function PerfilAluno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [aluno, setAluno] = useState(null);
  const [anamnese, setAnamnese] = useState(null);
  const [treinos, setTreinos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [abaAtiva, setAbaAtiva] = useState('resumo');

  // Modal de Seleção de Seções para o Laudo PDF
  const [modalPdfAval, setModalPdfAval] = useState(null); // guarda { av, index }
  const [secoesPdf, setSecoesPdf] = useState({
    forca: true,
    potencia: true,
    mobilidade: true,
    resistencia: true,
    fitness: true,
    movimento: true,
  });

  // Modal de Registrar / Editar Pagamento
  const [modalPagAberto, setModalPagAberto] = useState(false);
  const [editPagId, setEditPagId] = useState(null);
  const [formPag, setFormPag] = useState({
    referencia: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    valor: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    forma: 'Pix',
    observacao: '',
  });

  useEffect(() => {
    carregarTudo();
  }, [id]);

  async function carregarTudo() {
    setCarregando(true);

    const [resAluno, resAnam, resTreinos, resAval, resPag] = await Promise.all([
      supabase.from('alunos').select('*').eq('id', id).single(),
      supabase.from('anamneses').select('*').eq('aluno_id', id).order('atualizado_em', { ascending: false }).limit(1).single(),
      supabase.from('treinos').select('*, mesociclos(nome, status)').eq('aluno_id', id).order('criado_em', { ascending: false }),
      supabase.from('avaliacoes').select('*').eq('aluno_id', id).order('data_avaliacao', { ascending: false }),
      supabase.from('pagamentos').select('*').eq('aluno_id', id).order('data_pagamento', { ascending: false }),
    ]);

    if (resAluno.data) setAluno(resAluno.data);
    setAnamnese(resAnam.data || null);
    setTreinos(resTreinos.data || []);
    setAvaliacoes(resAval.data || []);
    setPagamentos(resPag.data || []);
    setCarregando(false);
  }

  // --- AÇÕES DE PAGAMENTO ---
  function abrirModalNovoPagamento() {
    setEditPagId(null);
    setFormPag({
      referencia: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      valor: aluno?.valor_mensal ?? '',
      data_pagamento: new Date().toISOString().split('T')[0],
      forma: 'Pix',
      observacao: '',
    });
    setModalPagAberto(true);
  }

  function abrirModalEditarPagamento(pag) {
    setEditPagId(pag.id);
    setFormPag({
      referencia: refParaInputMonth(pag.referencia),
      valor: pag.valor,
      data_pagamento: pag.data_pagamento,
      forma: pag.forma,
      observacao: pag.observacao || '',
    });
    setModalPagAberto(true);
  }

  async function salvarPagamento(e) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();

    const payload = {
      aluno_id: id,
      referencia: inputMonthParaRef(formPag.referencia),
      valor: Number(formPag.valor),
      data_pagamento: formPag.data_pagamento,
      forma: formPag.forma,
      observacao: formPag.observacao || null,
      registrado_por: session?.user?.id || null,
    };

    let error;
    if (editPagId) {
      const res = await supabase.from('pagamentos').update(payload).eq('id', editPagId);
      error = res.error;
    } else {
      const res = await supabase.from('pagamentos').insert([payload]);
      error = res.error;
    }

    if (error) {
      window.alert('Erro ao salvar pagamento: ' + error.message);
    } else {
      setModalPagAberto(false);
      carregarTudo();
    }
  }

  // --- DUPLICAR TREINO ---
  async function duplicarTreino(treino) {
    const { error } = await supabase.from('treinos').insert([
      {
        aluno_id: id,
        user_id: treino.user_id,
        mesociclo_id: treino.mesociclo_id,
        titulo: `${treino.titulo || 'Treino'} (Cópia)`,
        exercicios: treino.exercicios,
        itens_estruturados: treino.itens_estruturados || [],
        observacoes_sensoriais: treino.observacoes_sensoriais,
      },
    ]);

    if (error) window.alert('Erro ao duplicar treino: ' + error.message);
    else {
      window.alert('Treino duplicado!');
      carregarTudo();
    }
  }

  // --- HELPER PARA EXTRAIR CARTA DE UMA AVALIAÇÃO ---
  function obterCartaAvaliacao(av) {
    if (!av) return null;
    if (av.notas_carta?.atributos) return av.notas_carta;
    return calcularCarta({
      ...av,
      ...(av.mobilidade || {}),
      ...(av.potencia || {}),
      ...(av.forca || {}),
      ...(av.resistencia || {}),
    });
  }

  // --- HELPER PARA MONTAR TABELA DE EVOLUÇÃO ---
  function montarTabelaEvolucao() {
    if (avaliacoes.length === 0) return { datas: [], linhas: [] };
    const avaliacoesCronologicas = [...avaliacoes].reverse();

    const extrairMapaValores = (av) => {
      return {
        massa: av.massa,
        estatura: av.estatura,
        imc: av.antropometria?.imc,
        pct_gordura: av.perc_gordura,
        massa_gorda: av.antropometria?.massa_gorda,
        massa_magra: av.antropometria?.massa_magra,
        rcq: av.antropometria?.rcq,
        ...(av.mobilidade || {}),
        ...(av.potencia || {}),
        ...(av.forca || {}),
        ...(av.resistencia || {}),
      };
    };

    const mapas = avaliacoesCronologicas.map(extrairMapaValores);
    const linhas = [];

    Object.entries(NOMES_TESTES_AMIGAVEIS).forEach(([chave, nomeAmigavel]) => {
      const valoresPorData = mapas.map((m) => m[chave] ?? null);
      if (valoresPorData.some((v) => v !== null && v !== undefined && v !== '')) {
        linhas.push({ chave, nomeAmigavel, valores: valoresPorData });
      }
    });

    return { datas: avaliacoesCronologicas.map((a) => a.data_avaliacao), linhas };
  }

  if (carregando) return <div style={{ textAlign: 'center', padding: '50px' }}>Carregando ficha do aluno...</div>;
  if (!aluno) return <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>Aluno não encontrado.</div>;

  const hojeStr = new Date().toISOString().split('T')[0];
  const idadeAtual = calcularIdadeNaData(anamnese?.data_nascimento, hojeStr);
  const situacaoPag = calcularSituacaoPagamento(aluno, pagamentos);

  const ultimaAval = avaliacoes[0] || null;
  const ultimaCarta = obterCartaAvaliacao(ultimaAval);
  const treinoAtivo = treinos[0] || null;

  const st = {
    container: { maxWidth: '1100px', margin: '30px auto', padding: '26px', background: '#fff', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.07)' },
    headerFixo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    avatar: { width: '64px', height: '64px', borderRadius: '50%', background: '#4460B8', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '26px', fontWeight: 'bold' },
    btnAtalho: (cor) => ({ background: cor, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }),
    tabBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '22px' },
    tabBtn: (ativa) => ({ padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', background: ativa ? '#4460B8' : '#f1f5f9', color: ativa ? '#fff' : '#334155' }),
    card: { background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' },
    th: { textAlign: 'left', padding: '10px', background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0' },
  };

  const abas = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'anamnese', label: 'Anamnese' },
    { id: 'treinos', label: 'Treinos' },
    { id: 'avaliacoes', label: 'Avaliações' },
    { id: 'carta', label: 'Carta Trunfo' },
    { id: 'pagamentos', label: 'Pagamentos' },
  ];

  return (
    <div style={st.container}>
      {/* CABEÇALHO FIXO */}
      <div style={st.headerFixo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={st.avatar}>{aluno.nome.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>{aluno.nome}</h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: aluno.ativo === false ? '#fee2e2' : '#dcfce7',
                  color: aluno.ativo === false ? '#991b1b' : '#166534',
                }}
              >
                {aluno.ativo === false ? 'Inativo' : 'Ativo'}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '5px' }}>
              <strong>Idade:</strong> {idadeAtual !== null ? `${idadeAtual} anos` : '-'} |{' '}
              <strong>Sexo:</strong> {anamnese?.sexo === 'M' ? 'Masculino' : anamnese?.sexo === 'F' ? 'Feminino' : '-'} |{' '}
              <strong>Telefone:</strong> {aluno.telefone || '-'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/avaliacao?alunoId=${id}`)}>
            + Nova avaliação
          </button>
          <button style={st.btnAtalho('#2DAFAB')} onClick={() => navigate(`/prescrever-treino?alunoId=${id}`)}>
            + Novo treino
          </button>
          <button style={st.btnAtalho('#E17900')} onClick={abrirModalNovoPagamento}>
            + Registrar pagamento
          </button>
        </div>
      </div>

      {/* BARRA DE ABAS */}
      <div style={st.tabBar}>
        {abas.map((a) => (
          <button key={a.id} style={st.tabBtn(abaAtiva === a.id)} onClick={() => setAbaAtiva(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* ABA 1: RESUMO                                                       */}
      {/* =================================================================== */}
      {abaAtiva === 'resumo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#4460B8' }}>🏆 Última Carta Trunfo</h4>
            {ultimaCarta ? (
              <div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#4460B8', marginBottom: '8px' }}>
                  Overall: {ultimaCarta.overall ?? '-'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.7' }}>
                  <div>Força: <strong>{ultimaCarta.atributos.forca ?? '-'}</strong></div>
                  <div>Mobilidade: <strong>{ultimaCarta.atributos.mobilidade ?? '-'}</strong></div>
                  <div>Potência: <strong>{ultimaCarta.atributos.potencia ?? '-'}</strong></div>
                  <div>Fitness: <strong>{ultimaCarta.atributos.fitness ?? '-'}</strong></div>
                  <div>Resistência: <strong>{ultimaCarta.atributos.resistencia ?? '-'}</strong></div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Nenhuma avaliação registrada.</p>
            )}
          </div>

          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#2DAFAB' }}>📅 Avaliações e Retorno</h4>
            <p>
              <strong>Última avaliação:</strong>{' '}
              {ultimaAval ? new Date(`${ultimaAval.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
            </p>
            <p>
              <strong>Próxima sugerida (+3 meses):</strong>{' '}
              {ultimaAval ? somarMeses(ultimaAval.data_avaliacao, 3) : '-'}
            </p>
            <hr style={{ borderColor: '#e2e8f0' }} />
            <h4 style={{ color: '#0f172a' }}>💰 Situação Financeira</h4>
            <span
              style={{
                background: situacaoPag.corBg,
                color: situacaoPag.corTexto,
                padding: '5px 12px',
                borderRadius: '999px',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {situacaoPag.status}
            </span>
          </div>

          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#0f172a' }}>🏋️ Treino / Mesociclo Ativo</h4>
            {treinoAtivo ? (
              <div>
                <strong>{treinoAtivo.titulo || 'Treino Atual'}</strong>
                {treinoAtivo.mesociclos?.nome && (
                  <div style={{ fontSize: '13px', color: '#0369a1', margin: '5px 0' }}>
                    Mesociclo: {treinoAtivo.mesociclos.nome}
                  </div>
                )}
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: '#334155', maxHeight: '160px', overflowY: 'auto' }}>
                  {treinoAtivo.exercicios}
                </pre>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Nenhum treino prescrito.</p>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: ANAMNESE                                                     */}
      {/* =================================================================== */}
      {abaAtiva === 'anamnese' && (
        <div style={st.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Ficha de Anamnese</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/anamnese?alunoId=${id}`)}>
              {anamnese ? 'Editar Anamnese' : '+ Preencher Anamnese'}
            </button>
          </div>

          {anamnese ? (
            <div style={{ lineHeight: '1.7', fontSize: '14.5px' }}>
              <p><strong>Última atualização:</strong> {new Date(anamnese.atualizado_em || anamnese.criado_em).toLocaleDateString('pt-BR')}</p>
              <p><strong>Situação da Triagem:</strong> {anamnese.liberacao_medica ? 'Liberado pelo médico' : anamnese.situacao_triagem?.toUpperCase() || '-'}</p>
              <p><strong>Condições Médicas:</strong> {anamnese.condicoes_medicas || '-'}</p>
              <p><strong>Gatilhos Sensoriais / Cuidados:</strong> {anamnese.gatilhos_sensoriais || '-'}</p>
              <p><strong>Medicamentos:</strong> {anamnese.medicamentos || '-'}</p>
              <p><strong>Objetivos e Observações:</strong> {anamnese.observacoes || '-'}</p>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Este aluno ainda não possui anamnese cadastrada.</p>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 3: TREINOS                                                      */}
      {/* =================================================================== */}
      {abaAtiva === 'treinos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Histórico de Treinos</h3>
            <button style={st.btnAtalho('#2DAFAB')} onClick={() => navigate(`/prescrever-treino?alunoId=${id}`)}>
              + Novo Treino
            </button>
          </div>

          {treinos.map((t, idx) => (
            <div
              key={t.id}
              style={{
                ...st.card,
                borderLeft: idx === 0 ? '5px solid #2DAFAB' : '1px solid #e2e8f0',
                background: idx === 0 ? '#f0fdfa' : '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div>
                  {idx === 0 && (
                    <span style={{ background: '#2DAFAB', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>
                      ATIVO / MAIS RECENTE
                    </span>
                  )}
                  <strong style={{ fontSize: '16px' }}>{t.titulo || 'Treino'}</strong>
                  {t.mesociclos?.nome && <span style={{ color: '#0369a1', fontSize: '13px', marginLeft: '10px' }}>({t.mesociclos.nome})</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => duplicarTreino(t)} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Duplicar
                  </button>
                </div>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13.5px', color: '#334155', margin: 0 }}>
                {t.exercicios}
              </pre>
            </div>
          ))}

          {treinos.length === 0 && <p style={{ color: '#64748b' }}>Nenhum treino registado para este aluno.</p>}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 4: AVALIAÇÕES E TABELA DE EVOLUÇÃO                              */}
      {/* =================================================================== */}
      {abaAtiva === 'avaliacoes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Avaliações Realizadas</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/avaliacao?alunoId=${id}`)}>
              + Nova Avaliação
            </button>
          </div>

          <table style={{ ...st.table, marginBottom: '30px' }}>
            <thead>
              <tr>
                <th style={st.th}>Data</th>
                <th style={st.th}>Avaliador</th>
                <th style={st.th}>Overall Carta</th>
                <th style={st.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map((av, index) => {
                const carta = obterCartaAvaliacao(av);
                return (
                  <tr key={av.id}>
                    <td style={st.td}>{new Date(`${av.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td style={st.td}>{av.avaliador || '-'}</td>
                    <td style={st.td}><strong>{carta?.overall ?? '-'}</strong></td>
                    <td style={{ ...st.td, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setAbaAtiva('carta')}
                        style={{ background: '#4460B8', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px', fontWeight: 'bold' }}
                      >
                        Ver Carta
                      </button>
                      <button
                        onClick={() => setModalPdfAval({ av, index })}
                        style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        📄 Baixar avaliação (PDF)
                      </button>
                    </td>
                  </tr>
                );
              })}
              {avaliacoes.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                    Nenhuma avaliação registada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Tabela de Evolução */}
          {avaliacoes.length > 0 && (() => {
            const evolucao = montarTabelaEvolucao();
            return (
              <div>
                <h3>📈 Tabela de Evolução (Comparativo por Data)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={st.table}>
                    <thead>
                      <tr>
                        <th style={st.th}>Teste / Medida</th>
                        {evolucao.datas.map((dt, idx) => (
                          <th key={idx} style={st.th}>
                            {new Date(`${dt}T00:00:00`).toLocaleDateString('pt-BR')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evolucao.linhas.map((linha) => (
                        <tr key={linha.chave}>
                          <td style={st.td}><strong>{linha.nomeAmigavel}</strong></td>
                          {linha.valores.map((val, idx) => (
                            <td key={idx} style={st.td}>{val !== null && val !== '' ? val : '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 5: CARTA TRUNFO (LADO A LADO COM VARIAÇÃO)                      */}
      {/* =================================================================== */}
      {abaAtiva === 'carta' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>🏆 Evolução da Carta Trunfo</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate('/carta-trunfo')}>
              Baixar Imagem PNG
            </button>
          </div>

          {avaliacoes.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma avaliação disponível para exibir Cartas.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {avaliacoes.map((av, idx) => {
                const atual = obterCartaAvaliacao(av);
                const anterior = avaliacoes[idx + 1] ? obterCartaAvaliacao(avaliacoes[idx + 1]) : null;

                const renderVariacao = (valAtual, valAnt) => {
                  if (valAtual === null || valAtual === undefined || valAnt === null || valAnt === undefined) return null;
                  const diff = valAtual - valAnt;
                  if (diff === 0) return <span style={{ color: '#64748b', fontSize: '12px' }}> (=)</span>;
                  return (
                    <span style={{ color: diff > 0 ? '#16a34a' : '#EB002E', fontWeight: 'bold', fontSize: '12px' }}>
                      {' '}({diff > 0 ? `+${diff}` : diff})
                    </span>
                  );
                };

                return (
                  <div key={av.id} style={{ ...st.card, borderTop: idx === 0 ? '4px solid #4460B8' : '4px solid #94a3b8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{new Date(`${av.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR')}</strong>
                      {idx === 0 && <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ATUAL</span>}
                    </div>

                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#4460B8', marginBottom: '12px' }}>
                      Overall: {atual.overall ?? '-'} {renderVariacao(atual.overall, anterior?.overall)}
                    </div>

                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                      <div>Força: <strong>{atual.atributos.forca ?? '-'}</strong>{renderVariacao(atual.atributos.forca, anterior?.atributos?.forca)}</div>
                      <div>Mobilidade: <strong>{atual.atributos.mobilidade ?? '-'}</strong>{renderVariacao(atual.atributos.mobilidade, anterior?.atributos?.mobilidade)}</div>
                      <div>Potência: <strong>{atual.atributos.potencia ?? '-'}</strong>{renderVariacao(atual.atributos.potencia, anterior?.atributos?.potencia)}</div>
                      <div>Fitness: <strong>{atual.atributos.fitness ?? '-'}</strong>{renderVariacao(atual.atributos.fitness, anterior?.atributos?.fitness)}</div>
                      <div>Resistência: <strong>{atual.atributos.resistencia ?? '-'}</strong>{renderVariacao(atual.atributos.resistencia, anterior?.atributos?.resistencia)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 6: PAGAMENTOS                                                   */}
      {/* =================================================================== */}
      {abaAtiva === 'pagamentos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0 }}>💰 Controle de Pagamentos</h3>
              <small style={{ color: '#64748b' }}>
                Plano atual: {aluno.valor_mensal ? `R$ ${Number(aluno.valor_mensal).toFixed(2)} • Vencimento todo dia ${aluno.dia_vencimento || '-'}` : 'Não configurado (edite na lista de Alunos)'}
              </small>
            </div>
            <button style={st.btnAtalho('#E17900')} onClick={abrirModalNovoPagamento}>
              + Registrar Pagamento
            </button>
          </div>

          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Referência (Mês/Ano)</th>
                <th style={st.th}>Data Pagamento</th>
                <th style={st.th}>Valor</th>
                <th style={st.th}>Forma</th>
                <th style={st.th}>Observação</th>
                <th style={st.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td style={st.td}><strong>{p.referencia}</strong></td>
                  <td style={st.td}>{new Date(`${p.data_pagamento}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                  <td style={st.td}>R$ {Number(p.valor).toFixed(2)}</td>
                  <td style={st.td}>{p.forma}</td>
                  <td style={st.td}>{p.observacao || '-'}</td>
                  <td style={st.td}>
                    <button onClick={() => abrirModalEditarPagamento(p)} style={{ padding: '4px 10px', cursor: 'pointer' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {pagamentos.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '18px', color: '#64748b' }}>
                    Nenhum pagamento registado para este aluno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE SEÇÕES PARA O LAUDO PDF */}
      {modalPdfAval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '440px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>Gerar Laudo de Avaliação (PDF)</h3>
            <p style={{ fontSize: '13.5px', color: '#475569' }}>
              Desmarque as seções que deseja ocultar neste laudo (ex.: composição corporal):
            </p>

            {[
              { key: 'forca', label: 'Força' },
              { key: 'potencia', label: 'Potência' },
              { key: 'mobilidade', label: 'Mobilidade' },
              { key: 'resistencia', label: 'Resistência' },
              { key: 'fitness', label: 'Composição Corporal (Fitness)' },
              { key: 'movimento', label: 'Avaliação de Movimento' },
            ].map((sec) => (
              <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={secoesPdf[sec.key]}
                  onChange={(e) => setSecoesPdf({ ...secoesPdf, [sec.key]: e.target.checked })}
                />
                {sec.label}
              </label>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" onClick={() => setModalPdfAval(null)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { av, index } = modalPdfAval;
                  const avAnterior = avaliacoes[index + 1] || null;
                  abrirLaudoPDF({
                    aluno,
                    avaliacao: av,
                    avaliacaoAnterior: avAnterior,
                    carta: obterCartaAvaliacao(av),
                    secoesVisiveis: secoesPdf,
                  });
                  setModalPdfAval(null);
                }}
                style={{ background: '#4460B8', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRAR / EDITAR PAGAMENTO */}
      {modalPagAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '450px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>
              {editPagId ? 'Editar Pagamento' : 'Registrar Pagamento'}
            </h3>
            <form onSubmit={salvarPagamento}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Referência (Mês/Ano) *</label>
                <input
                  type="month"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.referencia}
                  onChange={(e) => setFormPag({ ...formPag, referencia: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.valor}
                  onChange={(e) => setFormPag({ ...formPag, valor: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Data do Pagamento *</label>
                <input
                  type="date"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.data_pagamento}
                  onChange={(e) => setFormPag({ ...formPag, data_pagamento: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Forma de Pagamento *</label>
                <select
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.forma}
                  onChange={(e) => setFormPag({ ...formPag, forma: e.target.value })}
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Observação</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.observacao}
                  onChange={(e) => setFormPag({ ...formPag, observacao: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalPagAberto(false)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Salvar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}