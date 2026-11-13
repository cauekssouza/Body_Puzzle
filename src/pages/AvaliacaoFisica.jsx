import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import {
  vazio,
  numOuNull,
  arred,
  calcularIdadeNaData,
  calcularAssimetria,
  calcularIMC,
  percentualGordura,
  calcularRCQ,
  umRM,
  forcaRelativa,
  relacaoSJCMJ,
  calcularRSI,
  tc6Previsto,
  vo2Cooper,
  calcularPaceEZonas,
  calcularCarta,
} from '../utils/cartaTrunfo';

const OBJETIVOS_AVAL = [
  'Qualidade de vida',
  'Força/Hipertrofia',
  'Flexibilidade',
  'Performance esportiva',
  'Emagrecimento',
  'Outro',
];

const DOBRAS_LISTA = [
  { key: 'dobra_triceps', label: 'Tríceps (mm)' },
  { key: 'dobra_subescapular', label: 'Subescapular (mm)' },
  { key: 'dobra_axilar', label: 'Axilar Média (mm)' },
  { key: 'dobra_peitoral', label: 'Peitoral (mm)' },
  { key: 'dobra_suprailiaca', label: 'Suprailíaca (mm)' },
  { key: 'dobra_abdominal', label: 'Abdominal (mm)' },
  { key: 'dobra_coxa', label: 'Coxa (mm)' },
];

const PERIMETROS_LISTA = [
  { key: 'per_ombros', label: 'Ombros (cm)' },
  { key: 'per_pescoco', label: 'Pescoço (cm)' },
  { key: 'per_torax', label: 'Tórax (cm)' },
  { key: 'per_cintura', label: 'Cintura (cm)' },
  { key: 'per_abdome', label: 'Abdome (cm)' },
  { key: 'per_quadril', label: 'Quadril (cm)' },
  { key: 'per_braco_d', label: 'Braço Relaxado D (cm)' },
  { key: 'per_braco_e', label: 'Braço Relaxado E (cm)' },
  { key: 'per_braco_contr_d', label: 'Braço Contraído D (cm)' },
  { key: 'per_braco_contr_e', label: 'Braço Contraído E (cm)' },
  { key: 'per_coxa_d', label: 'Coxa D (cm)' },
  { key: 'per_coxa_e', label: 'Coxa E (cm)' },
  { key: 'per_panturrilha_d', label: 'Panturrilha D (cm)' },
  { key: 'per_panturrilha_e', label: 'Panturrilha E (cm)' },
];

const MOVIMENTOS_CHECKLIST = [
  {
    key: 'squat',
    titulo: 'Squat (Agachamento)',
    itens: [
      'Calcanhares no chão',
      'Joelho acompanha a linha do pé',
      'Sem valgo dinâmico evidente',
      'Tronco estável',
      'Passa de 90° sem retroversão',
    ],
  },
  {
    key: 'hip_hinge',
    titulo: 'Hip Hinge (Dobradiça de Quadril)',
    itens: [
      '3 pontos de contato',
      'Movimento inicia no quadril',
      'Coluna neutra durante o movimento',
      'Joelho estável',
    ],
  },
  {
    key: 'overhead_squat',
    titulo: 'Overhead Squat',
    itens: [
      'Braços alinhados com o tronco',
      'Tronco ereto',
      'Pelve neutra',
      'Joelhos estáveis',
      'Movimento fluido e controlado',
    ],
  },
];

const MOBILIDADE_TESTES = [
  { base: 'ri_ombro', label: 'Rotação Interna de Ombro (°)', ref: '60–70°' },
  { base: 're_ombro', label: 'Rotação Externa de Ombro (°)', ref: '85–90°' },
  { base: 'ri_quadril', label: 'Rotação Interna de Quadril (°)', ref: '30–40°' },
  { base: 're_quadril', label: 'Rotação Externa de Quadril (°)', ref: '35–45°' },
  { base: 'isquios', label: 'Flexibilidade de Isquiotibiais (°)', ref: '> 75°' },
  { base: 'dorsi', label: 'Dorsiflexão de Tornozelo (°)', ref: '36–45°' },
];

const FORCA_FASES = [
  { key: 'sentar_levantar', fase: 1, label: 'Sentar e levantar em 30s (reps)', refM: 20, refF: 20 },
  { key: 'hang_hold', fase: 1, label: 'Hang hold - tempo pendurado (s)', refM: 60, refF: 60 },
  { key: 'knee_pushup', fase: 1, label: 'Knee push-up em 30s (reps)', refM: 12, refF: 10 },
  { key: 'canoa', fase: 1, label: 'Canoa - tempo máximo (s)', refM: 40, refF: 40 },
  { key: 'ponte_glutea', fase: 1, label: 'Ponte glútea isométrica (s)', refM: 65, refF: 65 },
  { key: 'pushup', fase: 2, label: 'Push-up máximo (reps)', refM: 40, refF: 35 },
  { key: 'prancha', fase: 2, label: 'Prancha - tempo máximo (s)', refM: 180, refF: 120 },
  { key: 'chinup', fase: 3, label: 'Chin-up / barra fixa máximo (reps)', refM: 12, refF: 10 },
];

const estadoInicial = {
  data_avaliacao: new Date().toISOString().split('T')[0],
  avaliador: '',
  objetivos: [],
  comentarios: '',

  // 1. Antropometria
  massa: '',
  estatura: '',
  dobra_triceps: '',
  dobra_subescapular: '',
  dobra_axilar: '',
  dobra_peitoral: '',
  dobra_suprailiaca: '',
  dobra_abdominal: '',
  dobra_coxa: '',
  per_ombros: '',
  per_pescoco: '',
  per_torax: '',
  per_cintura: '',
  per_abdome: '',
  per_quadril: '',
  per_braco_d: '',
  per_braco_e: '',
  per_braco_contr_d: '',
  per_braco_contr_e: '',
  per_coxa_d: '',
  per_coxa_e: '',
  per_panturrilha_d: '',
  per_panturrilha_e: '',

  // 2. Movimento
  movimento: {
    squat: {},
    hip_hinge: {},
    overhead_squat: {},
    video_url: '',
  },

  // 3. Mobilidade
  ri_ombro_d: '',
  ri_ombro_e: '',
  re_ombro_d: '',
  re_ombro_e: '',
  ri_quadril_d: '',
  ri_quadril_e: '',
  re_quadril_d: '',
  re_quadril_e: '',
  isquios_d: '',
  isquios_e: '',
  dorsi_d: '',
  dorsi_e: '',

  // 4. Potência
  cmj_maior: '',
  cmj_media: '',
  sj_maior: '',
  sj_media: '',
  dj_maior: '',
  dj_media: '',
  dj_tc: '',
  dj_d: '',
  dj_e: '',
  dj_tc_d: '',
  dj_tc_e: '',
  salto_horizontal: '',
  hop_d: '',
  hop_e: '',
  triple_hop_d: '',
  triple_hop_e: '',
  medball: '',

  // 5. Força
  sentar_levantar: '',
  hang_hold: '',
  knee_pushup: '',
  canoa: '',
  ponte_glutea: '',
  pushup: '',
  prancha: '',
  chinup: '',
  squat_carga: '',
  squat_reps: '',
  deadlift_carga: '',
  deadlift_reps: '',
  supino_carga: '',
  supino_reps: '',

  // 6. Resistência
  tc6_distancia: '',
  cooper_distancia: '',
  corrida_tempo: '',
  corrida_distancia: '',
  fc_media: '',
  fc_max: '',
  pse: '',
};

export default function AvaliacaoFisica() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState(searchParams.get('alunoId') || '');
  const [anamneseInfo, setAnamneseInfo] = useState(null); // { data_nascimento, sexo }
  const [carregandoAnamnese, setCarregandoAnamnese] = useState(false);

  const [form, setForm] = useState(estadoInicial);
  const [abaAtiva, setAbaAtiva] = useState(1);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const idUrl = searchParams.get('alunoId');
    if (idUrl) setAlunoId(idUrl);
  }, [searchParams]);

  // Carregar lista de alunos e avaliador logado
  useEffect(() => {
    async function init() {
      const { data: lista } = await supabase.from('alunos').select('id, nome').order('nome');
      if (lista) setAlunos(lista);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setForm((prev) => ({ ...prev, avaliador: prev.avaliador || session.user.email.split('@')[0] }));
      }
    }
    init();
  }, []);

  // Puxar Data de Nascimento e Sexo da Anamnese ao escolher o aluno
  useEffect(() => {
    async function buscarDadosAnamnese() {
      if (!alunoId) {
        setAnamneseInfo(null);
        return;
      }
      setCarregandoAnamnese(true);
      const { data } = await supabase
        .from('anamneses')
        .select('data_nascimento, sexo')
        .eq('aluno_id', alunoId)
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .single();

      setAnamneseInfo(data || null);
      setCarregandoAnamnese(false);
    }
    buscarDadosAnamnese();
  }, [alunoId]);

  const setCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const toggleObjetivo = (obj) => {
    setForm((prev) => ({
      ...prev,
      objetivos: prev.objetivos.includes(obj)
        ? prev.objetivos.filter((o) => o !== obj)
        : [...prev.objetivos, obj],
    }));
  };

  // --- CÁLCULOS EM TEMPO REAL ---
  const idadeNaData = calcularIdadeNaData(anamneseInfo?.data_nascimento, form.data_avaliacao);
  const sexoAluno = anamneseInfo?.sexo || null; // 'M' ou 'F'

  // Antropometria
  const imc = calcularIMC(form.massa, form.estatura);
  const dobrasArray = DOBRAS_LISTA.map((d) => form[d.key]);
  const pctGordura = percentualGordura(dobrasArray, idadeNaData, sexoAluno);
  const massaGorda = !vazio(form.massa) && pctGordura !== null ? arred((Number(form.massa) * pctGordura) / 100, 1) : null;
  const massaMagra = !vazio(form.massa) && massaGorda !== null ? arred(Number(form.massa) - massaGorda, 1) : null;
  const rcq = calcularRCQ(form.per_cintura, form.per_quadril);

  // Potência
  const sjCmj = relacaoSJCMJ(form.cmj_media, form.sj_media);
  const rsiBi = calcularRSI(form.dj_media, form.dj_tc);
  const rsiD = calcularRSI(form.dj_d, form.dj_tc_d);
  const rsiE = calcularRSI(form.dj_e, form.dj_tc_e);

  // Força RM
  const sq1RM = !vazio(form.squat_carga) && !vazio(form.squat_reps) ? arred(umRM(form.squat_carga, form.squat_reps), 1) : null;
  const sqRel = forcaRelativa(form.squat_carga, form.squat_reps, form.massa);
  const dl1RM = !vazio(form.deadlift_carga) && !vazio(form.deadlift_reps) ? arred(umRM(form.deadlift_carga, form.deadlift_reps), 1) : null;
  const dlRel = forcaRelativa(form.deadlift_carga, form.deadlift_reps, form.massa);
  const bp1RM = !vazio(form.supino_carga) && !vazio(form.supino_reps) ? arred(umRM(form.supino_carga, form.supino_reps), 1) : null;
  const bpRel = forcaRelativa(form.supino_carga, form.supino_reps, form.massa);

  // Resistência
  const prevTC6 = tc6Previsto(idadeNaData, sexoAluno, imc);
  const pctTC6 = !vazio(form.tc6_distancia) && prevTC6 ? arred((Number(form.tc6_distancia) / prevTC6) * 100, 0) : null;
  const vo2Est = vo2Cooper(form.cooper_distancia);
  const paceZonas = calcularPaceEZonas(form.corrida_tempo, form.corrida_distancia);

  // Objeto consolidado para a Carta Trunfo Oficial
  const objetoAvaliacaoCalculo = {
    sexo: sexoAluno,
    idade: idadeNaData,
    massa: numOuNull(form.massa),
    estatura: numOuNull(form.estatura),
    pct_gordura: pctGordura,
    // Mobilidade
    ri_ombro_d: numOuNull(form.ri_ombro_d),
    ri_ombro_e: numOuNull(form.ri_ombro_e),
    re_ombro_d: numOuNull(form.re_ombro_d),
    re_ombro_e: numOuNull(form.re_ombro_e),
    ri_quadril_d: numOuNull(form.ri_quadril_d),
    ri_quadril_e: numOuNull(form.ri_quadril_e),
    re_quadril_d: numOuNull(form.re_quadril_d),
    re_quadril_e: numOuNull(form.re_quadril_e),
    isquios_d: numOuNull(form.isquios_d),
    isquios_e: numOuNull(form.isquios_e),
    dorsi_d: numOuNull(form.dorsi_d),
    dorsi_e: numOuNull(form.dorsi_e),
    // Potência
    cmj_maior: numOuNull(form.cmj_maior),
    sj_maior: numOuNull(form.sj_maior),
    salto_horizontal: numOuNull(form.salto_horizontal),
    hop_d: numOuNull(form.hop_d),
    hop_e: numOuNull(form.hop_e),
    triple_hop_d: numOuNull(form.triple_hop_d),
    triple_hop_e: numOuNull(form.triple_hop_e),
    medball: numOuNull(form.medball),
    // Força
    sentar_levantar: numOuNull(form.sentar_levantar),
    hang_hold: numOuNull(form.hang_hold),
    knee_pushup: numOuNull(form.knee_pushup),
    canoa: numOuNull(form.canoa),
    ponte_glutea: numOuNull(form.ponte_glutea),
    pushup: numOuNull(form.pushup),
    prancha: numOuNull(form.prancha),
    chinup: numOuNull(form.chinup),
    squat_carga: numOuNull(form.squat_carga),
    squat_reps: numOuNull(form.squat_reps),
    deadlift_carga: numOuNull(form.deadlift_carga),
    deadlift_reps: numOuNull(form.deadlift_reps),
    supino_carga: numOuNull(form.supino_carga),
    supino_reps: numOuNull(form.supino_reps),
    // Resistência
    tc6_distancia: numOuNull(form.tc6_distancia),
    cooper_distancia: numOuNull(form.cooper_distancia),
  };

  const cartaCalculada = calcularCarta(objetoAvaliacaoCalculo);

  // --- SALVAR NO SUPABASE ---
  async function handleSalvar(e) {
    e.preventDefault();
    if (!alunoId) return window.alert('Selecione um aluno.');
    if (!form.data_avaliacao) return window.alert('Informe a data da avaliação.');
    if (!anamneseInfo?.data_nascimento || !anamneseInfo?.sexo) {
      return window.alert('Preencha a anamnese do aluno primeiro para calcular idade e sexo.');
    }

    setSalvando(true);

    // Converte todos os campos numéricos vazios para null (Regra 1 da Seção 2)
    const dobrasObj = {};
    DOBRAS_LISTA.forEach((d) => {
      dobrasObj[d.key] = numOuNull(form[d.key]);
    });

    const perimetrosObj = {};
    PERIMETROS_LISTA.forEach((p) => {
      perimetrosObj[p.key] = numOuNull(form[p.key]);
    });

    const payload = {
      aluno_id: alunoId,
      data_avaliacao: form.data_avaliacao,
      avaliador: form.avaliador || null,
      idade: idadeNaData,
      sexo: sexoAluno,
      objetivos: form.objetivos,
      comentarios: form.comentarios || null,

      massa: numOuNull(form.massa),
      estatura: numOuNull(form.estatura),
      perc_gordura: pctGordura,

      antropometria: {
        imc,
        pct_gordura: pctGordura,
        massa_gorda: massaGorda,
        massa_magra: massaMagra,
        rcq,
        dobras: dobrasObj,
        perimetros: perimetrosObj,
      },
      movimento: form.movimento,
      mobilidade: {
        ri_ombro_d: numOuNull(form.ri_ombro_d),
        ri_ombro_e: numOuNull(form.ri_ombro_e),
        re_ombro_d: numOuNull(form.re_ombro_d),
        re_ombro_e: numOuNull(form.re_ombro_e),
        ri_quadril_d: numOuNull(form.ri_quadril_d),
        ri_quadril_e: numOuNull(form.ri_quadril_e),
        re_quadril_d: numOuNull(form.re_quadril_d),
        re_quadril_e: numOuNull(form.re_quadril_e),
        isquios_d: numOuNull(form.isquios_d),
        isquios_e: numOuNull(form.isquios_e),
        dorsi_d: numOuNull(form.dorsi_d),
        dorsi_e: numOuNull(form.dorsi_e),
      },
      potencia: {
        cmj_maior: numOuNull(form.cmj_maior),
        cmj_media: numOuNull(form.cmj_media),
        sj_maior: numOuNull(form.sj_maior),
        sj_media: numOuNull(form.sj_media),
        sj_cmj_rel: sjCmj,
        dj_maior: numOuNull(form.dj_maior),
        dj_media: numOuNull(form.dj_media),
        dj_tc: numOuNull(form.dj_tc),
        rsi_bi: rsiBi,
        dj_d: numOuNull(form.dj_d),
        dj_e: numOuNull(form.dj_e),
        dj_tc_d: numOuNull(form.dj_tc_d),
        dj_tc_e: numOuNull(form.dj_tc_e),
        rsi_d: rsiD,
        rsi_e: rsiE,
        salto_horizontal: numOuNull(form.salto_horizontal),
        hop_d: numOuNull(form.hop_d),
        hop_e: numOuNull(form.hop_e),
        triple_hop_d: numOuNull(form.triple_hop_d),
        triple_hop_e: numOuNull(form.triple_hop_e),
        medball: numOuNull(form.medball),
      },
      forca: {
        sentar_levantar: numOuNull(form.sentar_levantar),
        hang_hold: numOuNull(form.hang_hold),
        knee_pushup: numOuNull(form.knee_pushup),
        canoa: numOuNull(form.canoa),
        ponte_glutea: numOuNull(form.ponte_glutea),
        pushup: numOuNull(form.pushup),
        prancha: numOuNull(form.prancha),
        chinup: numOuNull(form.chinup),
        squat_carga: numOuNull(form.squat_carga),
        squat_reps: numOuNull(form.squat_reps),
        squat_1rm: sq1RM,
        squat_rel: sqRel,
        deadlift_carga: numOuNull(form.deadlift_carga),
        deadlift_reps: numOuNull(form.deadlift_reps),
        deadlift_1rm: dl1RM,
        deadlift_rel: dlRel,
        supino_carga: numOuNull(form.supino_carga),
        supino_reps: numOuNull(form.supino_reps),
        supino_1rm: bp1RM,
        supino_rel: bpRel,
      },
      resistencia: {
        tc6_distancia: numOuNull(form.tc6_distancia),
        tc6_previsto: prevTC6,
        tc6_pct: pctTC6,
        cooper_distancia: numOuNull(form.cooper_distancia),
        vo2: vo2Est,
        corrida_tempo: numOuNull(form.corrida_tempo),
        corrida_distancia: numOuNull(form.corrida_distancia),
        pace: paceZonas?.pace ?? null,
        zonas: paceZonas,
        fc_media: numOuNull(form.fc_media),
        fc_max: numOuNull(form.fc_max),
        pse: numOuNull(form.pse),
      },
      notas_carta: cartaCalculada,
    };

    const { error } = await supabase.from('avaliacoes').insert([payload]);
    setSalvando(false);

    if (error) {
      window.alert('Erro ao salvar avaliação: ' + error.message);
    } else {
      window.alert('Avaliação física e notas da Carta Trunfo salvas com sucesso!');
      // Se veio da página do aluno, volta para lá (Seção 7.1)
      if (searchParams.get('alunoId')) {
        navigate(`/alunos/${alunoId}`);
      }
    }
  }

  // --- HELPER DE ASSIMETRIA ---
  const renderAssimetriaBadge = (valD, valE) => {
    const assim = calcularAssimetria(valD, valE);
    if (assim === null) return null;
    const pct = arred(assim * 100, 1);
    const alerta = assim > 0.15;
    return (
      <span
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          padding: '3px 8px',
          borderRadius: '6px',
          background: alerta ? '#fee2e2' : '#f1f5f9',
          color: alerta ? '#EB002E' : '#475569',
        }}
      >
        Assimetria: {pct}% {alerta ? '⚠️ (> 15%)' : ''}
      </span>
    );
  };

  // --- ESTILOS ---
  const st = {
    container: { maxWidth: '1000px', margin: '30px auto', padding: '28px', background: '#fff', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.07)' },
    headerBox: { background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' },
    input: { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
    tabBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' },
    tabBtn: (ativo) => ({
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: 'bold',
      fontSize: '13.5px',
      cursor: 'pointer',
      background: ativo ? '#4460B8' : '#f1f5f9',
      color: ativo ? '#fff' : '#334155',
    }),
    resultBar: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      padding: '14px',
      borderRadius: '8px',
      marginTop: '15px',
      fontSize: '14px',
      color: '#1e3a8a',
    },
    cardRow: { background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' },
    btnSalvar: { width: '100%', padding: '16px', background: '#2DAFAB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
  };

  const abas = [
    { id: 1, nome: '1. Antropometria' },
    { id: 2, nome: '2. Movimento' },
    { id: 3, nome: '3. Mobilidade' },
    { id: 4, nome: '4. Potência' },
    { id: 5, nome: '5. Força' },
    { id: 6, nome: '6. Resistência' },
  ];

  return (
    <div style={st.container}>
      <h2 style={{ textAlign: 'center', color: '#4460B8', marginTop: 0, marginBottom: '20px' }}>
        📊 Avaliação Física Completa — Body Puzzle
      </h2>

      <form onSubmit={handleSalvar}>
        {/* CABEÇALHO (Seção 3.1) */}
        <div style={st.headerBox}>
          <div style={st.grid3}>
            <div>
              <label style={st.label}>Aluno *</label>
              <select required style={st.input} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                <option value="">Selecione o aluno...</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={st.label}>Data da Avaliação *</label>
              <input
                type="date"
                required
                style={st.input}
                value={form.data_avaliacao}
                onChange={(e) => setCampo('data_avaliacao', e.target.value)}
              />
            </div>
            <div>
              <label style={st.label}>Avaliador</label>
              <input
                type="text"
                style={st.input}
                value={form.avaliador}
                onChange={(e) => setCampo('avaliador', e.target.value)}
              />
            </div>
          </div>

          {/* Dados automáticos da Anamnese */}
          {alunoId && (
            <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: anamneseInfo?.data_nascimento && anamneseInfo?.sexo ? '#dcfce7' : '#fee2e2', color: anamneseInfo?.data_nascimento && anamneseInfo?.sexo ? '#166534' : '#991b1b', fontSize: '14px' }}>
              {carregandoAnamnese ? (
                'Buscando dados da anamnese...'
              ) : anamneseInfo?.data_nascimento && anamneseInfo?.sexo ? (
                <>
                  <strong>Dados da Anamnese:</strong> Idade na avaliação:{' '}
                  <strong>{idadeNaData !== null ? `${idadeNaData} anos` : '-'}</strong> | Sexo:{' '}
                  <strong>{sexoAluno === 'M' ? 'Masculino' : 'Feminino'}</strong>
                </>
              ) : (
                <>
                  ⚠️ <strong>Preencha a anamnese para calcular idade e sexo</strong> (obrigatórios para os cálculos de gordura, VO₂, TC6 e Carta Trunfo).
                </>
              )}
            </div>
          )}

          {/* Objetivos */}
          <div style={{ marginTop: '14px' }}>
            <label style={st.label}>Objetivos da Avaliação:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '5px' }}>
              {OBJETIVOS_AVAL.map((obj) => (
                <label key={obj} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px' }}>
                  <input type="checkbox" checked={form.objetivos.includes(obj)} onChange={() => toggleObjetivo(obj)} />
                  {obj}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* BARRA DE ABAS DOS 6 BLOCOS */}
        <div style={st.tabBar}>
          {abas.map((aba) => (
            <button
              type="button"
              key={aba.id}
              style={st.tabBtn(abaAtiva === aba.id)}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.nome}
            </button>
          ))}
        </div>

        {/* ================================================================= */}
        {/* BLOCO 1: ANTROPOMETRIA E COMPOSIÇÃO CORPORAL (Seção 3.5)          */}
        {/* ================================================================= */}
        {abaAtiva === 1 && (
          <div>
            <h3>1. Antropometria e Composição Corporal</h3>
            <div style={st.grid2}>
              <div>
                <label style={st.label}>Massa Corporal (kg)</label>
                <input type="number" step="0.1" placeholder="Ex: 70.5" style={st.input} value={form.massa} onChange={(e) => setCampo('massa', e.target.value)} />
              </div>
              <div>
                <label style={st.label}>Estatura (m)</label>
                <input type="number" step="0.01" placeholder="Ex: 1.75" style={st.input} value={form.estatura} onChange={(e) => setCampo('estatura', e.target.value)} />
              </div>
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#475569' }}>
              7 Dobras Cutâneas (mm) — Preencha todas as 7 para calcular %G
            </h4>
            <div style={st.grid3}>
              {DOBRAS_LISTA.map((d) => (
                <div key={d.key}>
                  <label style={st.label}>{d.label}</label>
                  <input type="number" step="0.1" style={st.input} value={form[d.key]} onChange={(e) => setCampo(d.key, e.target.value)} />
                </div>
              ))}
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#475569' }}>Perímetros (cm)</h4>
            <div style={st.grid3}>
              {PERIMETROS_LISTA.map((p) => (
                <div key={p.key}>
                  <label style={st.label}>{p.label}</label>
                  <input type="number" step="0.1" style={st.input} value={form[p.key]} onChange={(e) => setCampo(p.key, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={st.resultBar}>
              <div><strong>IMC:</strong> {imc !== null ? `${imc} kg/m²` : '-'}</div>
              <div><strong>% Gordura:</strong> {pctGordura !== null ? `${pctGordura}%` : '-'}</div>
              <div><strong>Massa Gorda:</strong> {massaGorda !== null ? `${massaGorda} kg` : '-'}</div>
              <div><strong>Massa Magra:</strong> {massaMagra !== null ? `${massaMagra} kg` : '-'}</div>
              <div><strong>RCQ (Cintura/Quadril):</strong> {rcq !== null ? rcq : '-'}</div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* BLOCO 2: AVALIAÇÃO DE MOVIMENTO (Seção 3.7)                       */}
        {/* ================================================================= */}
        {abaAtiva === 2 && (
          <div>
            <h3>2. Avaliação de Movimento (Checklist)</h3>
            {MOVIMENTOS_CHECKLIST.map((mov) => (
              <div key={mov.key} style={st.cardRow}>
                <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#1e293b' }}>{mov.titulo}</h4>
                {mov.itens.map((item, idx) => {
                  const valAtual = form.movimento[mov.key]?.[idx] || '';
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '14px' }}>{item}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['Sim', 'Atenção'].map((opcao) => (
                          <button
                            type="button"
                            key={opcao}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                movimento: {
                                  ...prev.movimento,
                                  [mov.key]: {
                                    ...prev.movimento[mov.key],
                                    [idx]: valAtual === opcao ? '' : opcao,
                                  },
                                },
                              }))
                            }
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '12.5px',
                              background:
                                valAtual === opcao
                                  ? opcao === 'Sim'
                                    ? '#22c55e'
                                    : '#E17900'
                                  : '#fff',
                              color: valAtual === opcao ? '#fff' : '#334155',
                            }}
                          >
                            {opcao}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: '12px' }}>
              <label style={st.label}>Link de vídeo ou mídia da avaliação de movimento (opcional)</label>
              <input
                type="text"
                placeholder="https://..."
                style={st.input}
                value={form.movimento.video_url || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    movimento: { ...prev.movimento, video_url: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* BLOCO 3: MOBILIDADE (Seção 3.2)                                   */}
        {/* ================================================================= */}
        {abaAtiva === 3 && (
          <div>
            <h3>3. Mobilidade (6 Testes — Lados D e E)</h3>
            {MOBILIDADE_TESTES.map((m) => {
              const valD = form[`${m.base}_d`];
              const valE = form[`${m.base}_e`];
              const assim = calcularAssimetria(valD, valE);
              const alertaVermelho = assim !== null && assim > 0.15;

              return (
                <div key={m.base} style={st.cardRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong>{m.label} <small style={{ color: '#64748b' }}>(Ref: {m.ref})</small></strong>
                    {renderAssimetriaBadge(valD, valE)}
                  </div>
                  <div style={st.grid2}>
                    <div>
                      <label style={st.label}>Lado Direito (D)</label>
                      <input
                        type="number"
                        step="0.1"
                        style={{ ...st.input, borderColor: alertaVermelho ? '#EB002E' : '#cbd5e1', color: alertaVermelho ? '#EB002E' : '#0f172a', fontWeight: alertaVermelho ? 'bold' : 'normal' }}
                        value={valD}
                        onChange={(e) => setCampo(`${m.base}_d`, e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={st.label}>Lado Esquerdo (E)</label>
                      <input
                        type="number"
                        step="0.1"
                        style={{ ...st.input, borderColor: alertaVermelho ? '#EB002E' : '#cbd5e1', color: alertaVermelho ? '#EB002E' : '#0f172a', fontWeight: alertaVermelho ? 'bold' : 'normal' }}
                        value={valE}
                        onChange={(e) => setCampo(`${m.base}_e`, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* BLOCO 4: POTÊNCIA / SALTOS (Seção 3.4)                            */}
        {/* ================================================================= */}
        {abaAtiva === 4 && (
          <div>
            <h3>4. Potência (Saltos e Arremesso)</h3>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>CMJ e SJ (cm)</h4>
              <div style={st.grid2}>
                <div>
                  <label style={st.label}>CMJ — Maior Salto (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.cmj_maior} onChange={(e) => setCampo('cmj_maior', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>CMJ — Média (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.cmj_media} onChange={(e) => setCampo('cmj_media', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>SJ — Maior Salto (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.sj_maior} onChange={(e) => setCampo('sj_maior', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>SJ — Média (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.sj_media} onChange={(e) => setCampo('sj_media', e.target.value)} />
                </div>
              </div>
              <div style={st.resultBar}>
                <strong>Relação SJ / CMJ (%):</strong> {sjCmj !== null ? `${sjCmj}%` : '-'} <small>(Ref: 5–15%)</small>
              </div>
            </div>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Drop Jump Bilateral</h4>
              <div style={st.grid3}>
                <div>
                  <label style={st.label}>Maior Salto (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.dj_maior} onChange={(e) => setCampo('dj_maior', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Média (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.dj_media} onChange={(e) => setCampo('dj_media', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Tempo de Contato (s)</label>
                  <input type="number" step="0.001" placeholder="Ex: 0.21" style={st.input} value={form.dj_tc} onChange={(e) => setCampo('dj_tc', e.target.value)} />
                </div>
              </div>
              <div style={st.resultBar}>
                <strong>RSI Bilateral:</strong> {rsiBi !== null ? rsiBi : '-'} <small>(Ref: 2,0–2,5)</small>
              </div>
            </div>

            <div style={st.cardRow}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0 }}>Drop Jump Unilateral (D e E)</h4>
                {renderAssimetriaBadge(form.dj_d, form.dj_e)}
              </div>
              <div style={st.grid2}>
                <div>
                  <label style={st.label}>Altura Direito — D (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.dj_d} onChange={(e) => setCampo('dj_d', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Tempo Contato Direito — D (s)</label>
                  <input type="number" step="0.001" style={st.input} value={form.dj_tc_d} onChange={(e) => setCampo('dj_tc_d', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Altura Esquerdo — E (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.dj_e} onChange={(e) => setCampo('dj_e', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Tempo Contato Esquerdo — E (s)</label>
                  <input type="number" step="0.001" style={st.input} value={form.dj_tc_e} onChange={(e) => setCampo('dj_tc_e', e.target.value)} />
                </div>
              </div>
              <div style={st.resultBar}>
                <div><strong>RSI D:</strong> {rsiD !== null ? rsiD : '-'}</div>
                <div><strong>RSI E:</strong> {rsiE !== null ? rsiE : '-'}</div>
                <small>(Ref: 1,6–2,0)</small>
              </div>
            </div>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Saltos Horizontais e Medball</h4>
              <div style={st.grid2}>
                <div>
                  <label style={st.label}>Salto Horizontal Bilateral (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.salto_horizontal} onChange={(e) => setCampo('salto_horizontal', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Arremesso de Medball 3 kg (cm)</label>
                  <input type="number" step="0.1" style={st.input} value={form.medball} onChange={(e) => setCampo('medball', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Hop Horizontal Unilateral (cm)</strong>
                  {renderAssimetriaBadge(form.hop_d, form.hop_e)}
                </div>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Hop D (cm)</label>
                    <input type="number" step="0.1" style={st.input} value={form.hop_d} onChange={(e) => setCampo('hop_d', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Hop E (cm)</label>
                    <input type="number" step="0.1" style={st.input} value={form.hop_e} onChange={(e) => setCampo('hop_e', e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Triple Hop Unilateral (cm)</strong>
                  {renderAssimetriaBadge(form.triple_hop_d, form.triple_hop_e)}
                </div>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Triple Hop D (cm)</label>
                    <input type="number" step="0.1" style={st.input} value={form.triple_hop_d} onChange={(e) => setCampo('triple_hop_d', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Triple Hop E (cm)</label>
                    <input type="number" step="0.1" style={st.input} value={form.triple_hop_e} onChange={(e) => setCampo('triple_hop_e', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* BLOCO 5: FORÇA (Seção 3.3)                                        */}
        {/* ================================================================= */}
        {abaAtiva === 5 && (
          <div>
            <h3>5. Avaliação de Força</h3>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Testes Funcionais e Isométricos (Fases 1, 2 e 3)</h4>
              <div style={st.grid2}>
                {FORCA_FASES.map((t) => (
                  <div key={t.key}>
                    <label style={st.label}>
                      [Fase {t.fase}] {t.label}{' '}
                      <small style={{ color: '#64748b' }}>
                        (Ref: {sexoAluno === 'F' ? t.refF : t.refM})
                      </small>
                    </label>
                    <input
                      type="number"
                      step="1"
                      style={st.input}
                      value={form[t.key]}
                      onChange={(e) => setCampo(t.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Testes de Carga (1RM por Epley & Força Relativa)</h4>
              {!form.massa && (
                <small style={{ color: '#E17900', display: 'block', marginBottom: '10px' }}>
                  ℹ️ Preencha a Massa Corporal na aba Antropometria para calcular a Força Relativa.
                </small>
              )}

              {/* Squat */}
              <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <strong>Agachamento (Squat) — Ref. Relativa: 2,0</strong>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Carga (kg)</label>
                    <input type="number" step="0.5" style={st.input} value={form.squat_carga} onChange={(e) => setCampo('squat_carga', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Repetições</label>
                    <input type="number" step="1" style={st.input} value={form.squat_reps} onChange={(e) => setCampo('squat_reps', e.target.value)} />
                  </div>
                </div>
                <div style={st.resultBar}>
                  <div><strong>1RM Estimado:</strong> {sq1RM !== null ? `${sq1RM} kg` : '-'}</div>
                  <div><strong>Força Relativa:</strong> {sqRel !== null ? sqRel : '-'}</div>
                </div>
              </div>

              {/* Deadlift */}
              <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <strong>Levantamento Terra (Deadlift) — Ref. Relativa: 2,25</strong>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Carga (kg)</label>
                    <input type="number" step="0.5" style={st.input} value={form.deadlift_carga} onChange={(e) => setCampo('deadlift_carga', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Repetições</label>
                    <input type="number" step="1" style={st.input} value={form.deadlift_reps} onChange={(e) => setCampo('deadlift_reps', e.target.value)} />
                  </div>
                </div>
                <div style={st.resultBar}>
                  <div><strong>1RM Estimado:</strong> {dl1RM !== null ? `${dl1RM} kg` : '-'}</div>
                  <div><strong>Força Relativa:</strong> {dlRel !== null ? dlRel : '-'}</div>
                </div>
              </div>

              {/* Supino */}
              <div>
                <strong>Supino — Ref. Relativa: 1,75</strong>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Carga (kg)</label>
                    <input type="number" step="0.5" style={st.input} value={form.supino_carga} onChange={(e) => setCampo('supino_carga', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Repetições</label>
                    <input type="number" step="1" style={st.input} value={form.supino_reps} onChange={(e) => setCampo('supino_reps', e.target.value)} />
                  </div>
                </div>
                <div style={st.resultBar}>
                  <div><strong>1RM Estimado:</strong> {bp1RM !== null ? `${bp1RM} kg` : '-'}</div>
                  <div><strong>Força Relativa:</strong> {bpRel !== null ? bpRel : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* BLOCO 6: RESISTÊNCIA (Seção 3.6)                                  */}
        {/* ================================================================= */}
        {abaAtiva === 6 && (
          <div>
            <h3>6. Resistência</h3>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>TC6 (Caminhada de 6 Minutos)</h4>
              <div>
                <label style={st.label}>Distância percorrida (m)</label>
                <input type="number" step="1" style={st.input} value={form.tc6_distancia} onChange={(e) => setCampo('tc6_distancia', e.target.value)} />
              </div>
              <div style={st.resultBar}>
                <div><strong>Previsto:</strong> {prevTC6 !== null ? `${prevTC6} m` : '-'}</div>
                <div><strong>% do Previsto:</strong> {pctTC6 !== null ? `${pctTC6}%` : '-'}</div>
              </div>
            </div>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Cooper (Corrida de 12 Minutos — tem prioridade na Carta)</h4>
              <div>
                <label style={st.label}>Distância percorrida (m)</label>
                <input type="number" step="1" style={st.input} value={form.cooper_distancia} onChange={(e) => setCampo('cooper_distancia', e.target.value)} />
              </div>
              <div style={st.resultBar}>
                <div><strong>VO₂ Estimado:</strong> {vo2Est !== null ? `${vo2Est} mL/kg/min` : '-'}</div>
              </div>
            </div>

            <div style={st.cardRow}>
              <h4 style={{ marginTop: 0 }}>Corrida / 3 km (Acompanhamento e Zonas de Pace)</h4>
              <div style={st.grid3}>
                <div>
                  <label style={st.label}>Tempo (min)</label>
                  <input type="number" step="0.1" style={st.input} value={form.corrida_tempo} onChange={(e) => setCampo('corrida_tempo', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>Distância (km)</label>
                  <input type="number" step="0.1" style={st.input} value={form.corrida_distancia} onChange={(e) => setCampo('corrida_distancia', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>FC Média (bpm)</label>
                  <input type="number" step="1" style={st.input} value={form.fc_media} onChange={(e) => setCampo('fc_media', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>FC Máxima (bpm)</label>
                  <input type="number" step="1" style={st.input} value={form.fc_max} onChange={(e) => setCampo('fc_max', e.target.value)} />
                </div>
                <div>
                  <label style={st.label}>PSE (0–10)</label>
                  <input type="number" min="0" max="10" step="1" style={st.input} value={form.pse} onChange={(e) => setCampo('pse', e.target.value)} />
                </div>
              </div>

              {paceZonas && (
                <div style={{ ...st.resultBar, flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Pace Médio:</strong> {paceZonas.pace} min/km</div>
                  <div><strong>Z1 (1,30–1,20):</strong> {paceZonas.z1[0]} a {paceZonas.z1[1]} min/km</div>
                  <div><strong>Z2 (1,20–1,12):</strong> {paceZonas.z2[0]} a {paceZonas.z2[1]} min/km</div>
                  <div><strong>Z3 (1,12–1,05):</strong> {paceZonas.z3[0]} a {paceZonas.z3[1]} min/km</div>
                  <div><strong>Z4 (1,05–0,98):</strong> {paceZonas.z4[0]} a {paceZonas.z4[1]} min/km</div>
                  <div><strong>Z5 (0,98–0,90):</strong> {paceZonas.z5[0]} a {paceZonas.z5[1]} min/km</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMENTÁRIOS DO PROFESSOR */}
        <div style={{ marginTop: '22px' }}>
          <label style={st.label}>Comentários do Professor (saem no PDF do laudo)</label>
          <textarea
            rows={3}
            style={st.input}
            placeholder="Observações gerais sobre a avaliação..."
            value={form.comentarios}
            onChange={(e) => setCampo('comentarios', e.target.value)}
          />
        </div>

        {/* PRÉVIA EM TEMPO REAL DA CARTA TRUNFO OFICIAL */}
        <div style={{ marginTop: '22px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '2px solid #4460B8' }}>
          <strong style={{ color: '#4460B8', display: 'block', marginBottom: '10px' }}>
            🏆 Prévia da Carta Trunfo (Cálculo Oficial em Tempo Real):
          </strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px' }}>
            <span><strong>Força:</strong> {cartaCalculada.atributos.forca ?? '-'}</span>
            <span><strong>Mobilidade:</strong> {cartaCalculada.atributos.mobilidade ?? '-'}</span>
            <span><strong>Potência:</strong> {cartaCalculada.atributos.potencia ?? '-'}</span>
            <span><strong>Fitness:</strong> {cartaCalculada.atributos.fitness ?? '-'}</span>
            <span><strong>Resistência:</strong> {cartaCalculada.atributos.resistencia ?? '-'}</span>
            <span style={{ color: '#4460B8', fontWeight: 'bold' }}>
              OVERALL: {cartaCalculada.overall ?? '-'}
            </span>
          </div>
        </div>

        <button type="submit" disabled={salvando} style={st.btnSalvar}>
          {salvando ? 'Salvando Avaliação e Carta...' : '💾 Salvar Avaliação Física Completa'}
        </button>
      </form>
    </div>
  );
}