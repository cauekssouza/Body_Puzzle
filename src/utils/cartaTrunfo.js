// ============================================================================
// CONFIGURAÇÕES EDITÁVEIS (Referências, Coeficientes e Textos do Laudo)
// ============================================================================

export const COEF_DENSIDADE = {
  M: [1.112, 0.00043499, 0.00000055, 0.00028826],
  F: [1.097, 0.00046971, 0.00000056, 0.00012828],
};

export const REF_BASE = {
  forcaN1: { sentar_levantar: 20, hang_hold: 60, knee_pushup: 12, canoa: 40, ponte_glutea: 65 },
  forcaN23: { pushup: 40, prancha: 180, chinup: 12 },
  forcaRM: { supino: 1.75, deadlift: 2.25, squat: 2.0 },
  mobilidade: {
    ri_ombro: [60, 70],
    re_ombro: [85, 90],
    ri_quadril: [30, 40],
    re_quadril: [35, 45],
    isquios: [75, 75],
    dorsi: [36, 45],
  },
  potencia: {
    cmj: 38,
    sj: 34,
    salto_horizontal: 190,
    hop: 150,
    triple_hop: 450,
    medball: 400,
  },
  gordura: 8,
  vo2: { abaixo30: 55.2, de30: 49.2 },
};

export const REF = {
  M: REF_BASE,
  F: {
    ...REF_BASE,
    forcaN1: { ...REF_BASE.forcaN1, knee_pushup: 10 },
    forcaN23: { pushup: 35, prancha: 120, chinup: 10 },
    potencia: {
      ...REF_BASE.potencia,
      cmj: 35,
      sj: 30,
      salto_horizontal: 170,
      hop: 135,
      triple_hop: 400,
    },
    gordura: 16,
    vo2: { abaixo30: 44.7, de30: 36.1 },
  },
};

export const TEXTOS_LAUDO = {
  como_ler:
    'Cada capacidade física recebe uma nota de 0 a 99, calculada a partir dos testes que você fez. As notas usam referências do Body Puzzle e servem para acompanhar a sua evolução ao longo do tempo, não para comparar você com outras pessoas. Nem todos os testes são feitos em todas as avaliações: aparecem só os que foram aplicados.',
  forca:
    'Força é a capacidade de vencer uma resistência: levantar, empurrar, puxar e sustentar. É a base das outras capacidades. Com mais força, as tarefas do dia a dia ficam mais fáceis e o corpo fica mais preparado para esforços e imprevistos. Avaliamos os principais padrões de movimento: agachar, levantar do chão, empurrar e puxar.',
  potencia:
    'Potência é produzir força rápido. É o que usamos para saltar, arremessar, correr e reagir a um tropeço recuperando o equilíbrio. Avaliamos com saltos e com o arremesso de uma bola com peso.',
  mobilidade:
    'Mobilidade é a amplitude que as articulações alcançam com controle. Ela permite agachar, alcançar e se movimentar com eficiência. Medimos ombros, quadris, tornozelos e a flexibilidade da parte de trás da coxa, dos dois lados do corpo. Diferenças grandes entre direita e esquerda aparecem em vermelho e viram foco do treino.',
  resistencia:
    'Resistência é a capacidade do coração e dos pulmões de sustentar um esforço por mais tempo, como caminhar, correr ou brincar sem cansar rápido. É uma das capacidades mais ligadas à saúde ao longo da vida. Avaliamos com testes de caminhada ou de corrida.',
  fitness:
    'Composição corporal é a proporção entre gordura e massa magra (músculos, ossos e órgãos) no corpo. É um marcador de saúde que acompanhamos ao longo do tempo, junto com as medidas do corpo.',
  movimento:
    'Observamos a qualidade de três movimentos básicos: agachar, inclinar o tronco à frente a partir do quadril e agachar com os braços acima da cabeça. Mostramos o que já é feito com boa técnica e o que será foco nos próximos treinos.',
};

// ============================================================================
// FUNÇÕES AUXILIARES E CÁLCULOS DA AVALIAÇÃO
// ============================================================================

export const vazio = (v) => v === null || v === undefined || v === '' || Number.isNaN(Number(v));

export const numOuNull = (v) => (vazio(v) ? null : Number(v));

// Arredondamento "meio para cima" igual ao Excel
export const arred = (x, casas = 0) => {
  if (vazio(x)) return null;
  const f = 10 ** casas;
  return Math.round(Number((Number(x) * f).toPrecision(12))) / f;
};

export const media = (lista) => {
  const v = lista.filter((x) => !vazio(x)).map(Number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export const calcularIdadeNaData = (dataNascimento, dataAvaliacao) => {
  if (!dataNascimento || !dataAvaliacao) return null;
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  const aval = new Date(`${dataAvaliacao}T00:00:00`);
  let idade = aval.getFullYear() - nasc.getFullYear();
  const m = aval.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && aval.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade >= 0 ? idade : null;
};

export const calcularAssimetria = (a, b) => {
  if (vazio(a) || vazio(b)) return null;
  const na = Number(a);
  const nb = Number(b);
  const maior = Math.max(na, nb);
  if (maior === 0) return 0;
  return (maior - Math.min(na, nb)) / maior;
};

export const fatorSimetria = (a, b) => {
  const assim = calcularAssimetria(a, b);
  if (assim === null) return 1;
  return 1 - Math.max(0, assim - 0.15);
};

// --- Antropometria ---
export const calcularIMC = (massa, estatura) => {
  if (vazio(massa) || vazio(estatura) || Number(estatura) <= 0) return null;
  return arred(Number(massa) / Number(estatura) ** 2, 1);
};

export const percentualGordura = (dobras, idade, sexo) => {
  if (!dobras || dobras.length !== 7 || dobras.some(vazio) || vazio(idade) || !COEF_DENSIDADE[sexo]) {
    return null;
  }
  const S = dobras.reduce((a, b) => a + Number(b), 0);
  const [a, b, c, d] = COEF_DENSIDADE[sexo];
  const D = a - b * S + c * S ** 2 - d * Number(idade);
  return arred((4.95 / D - 4.5) * 100, 1);
};

export const calcularRCQ = (cintura, quadril) => {
  if (vazio(cintura) || vazio(quadril) || Number(quadril) <= 0) return null;
  return arred(Number(cintura) / Number(quadril), 2);
};

// --- Força ---
export const umRM = (carga, reps) => {
  if (vazio(carga) || vazio(reps)) return null;
  const c = Number(carga);
  const r = Number(reps);
  return r <= 1 ? c : c * (1 + r / 30);
};

export const forcaRelativa = (carga, reps, massa) => {
  const rm = umRM(carga, reps);
  if (rm === null || vazio(massa) || Number(massa) <= 0) return null;
  return arred(rm / Number(massa), 2);
};

// --- Potência ---
export const relacaoSJCMJ = (cmjMedia, sjMedia) => {
  if (vazio(cmjMedia) || vazio(sjMedia) || Number(sjMedia) <= 0) return null;
  return arred(((Number(cmjMedia) - Number(sjMedia)) / Number(sjMedia)) * 100, 1);
};

export const calcularRSI = (alturaCm, tempoContatoSeg) => {
  if (vazio(alturaCm) || vazio(tempoContatoSeg) || Number(tempoContatoSeg) <= 0) return null;
  return arred(Number(alturaCm) / 100 / Number(tempoContatoSeg), 2);
};

// --- Resistência ---
export const tc6Previsto = (idade, sexo, imc) => {
  if (vazio(idade) || !sexo || vazio(imc)) return null;
  const sx = sexo === 'M' ? 1 : 0;
  return arred(890.46 - 6.11 * Number(idade) + 0.0345 * Number(idade) ** 2 + 48.87 * sx - 4.87 * Number(imc));
};

export const vo2Cooper = (dist) => {
  if (vazio(dist)) return null;
  return arred((Number(dist) - 504.9) / 44.73, 1);
};

export const calcularPaceEZonas = (tempoMin, distKm) => {
  if (vazio(tempoMin) || vazio(distKm) || Number(distKm) <= 0) return null;
  const pace = Number(tempoMin) / Number(distKm);
  return {
    pace: arred(pace, 2),
    z1: [arred(pace * 1.3, 2), arred(pace * 1.2, 2)],
    z2: [arred(pace * 1.2, 2), arred(pace * 1.12, 2)],
    z3: [arred(pace * 1.12, 2), arred(pace * 1.05, 2)],
    z4: [arred(pace * 1.05, 2), arred(pace * 0.98, 2)],
    z5: [arred(pace * 0.98, 2), arred(pace * 0.9, 2)],
  };
};

// ============================================================================
// MOTOR OFICIAL DA CARTA TRUNFO (Seção 4.6)
// ============================================================================

const notaForcaN1 = (valor, ref) => (vazio(valor) ? null : arred(Math.min((Number(valor) / ref) * 55, 65)));
const notaForcaN23 = (valor, ref) => (vazio(valor) ? null : Math.min(99, arred((Number(valor) / ref) * 20) + 65));
const notaForcaRM = (fr, ref) => (vazio(fr) ? null : Math.min(99, arred((Number(fr) / ref) * 25 + 65)));

const notaMobilidade = (d, e, [min, max]) => {
  const m = media([d, e]);
  if (m === null) return null;
  const unica = min === max;
  let base;
  if (m < min) base = (m / min) * (unica ? 90 : 70);
  else if (m <= max) base = unica ? 90 : 70 + ((m - min) / (max - min)) * 20;
  else base = Math.min(99, 90 + ((m - max) / (0.1 * max)) * 9);
  return arred(base * fatorSimetria(d, e));
};

const notaPotencia = (valor, ref, outro = null) =>
  vazio(valor) ? null : arred(Math.min(99, (Number(valor) / ref) * 70) * fatorSimetria(valor, outro));

const notaFitness = (pctGordura, sexo) => {
  if (vazio(pctGordura) || !REF[sexo]) return null;
  const ref = REF[sexo].gordura;
  return arred(Math.max(0, Math.min(99, ((ref + 40 - Number(pctGordura)) / 40) * 99)));
};

const notaTC6 = (dist, previsto) =>
  vazio(dist) || vazio(previsto) ? null : arred(Math.min(70, (Number(dist) / previsto) * 60));

const refVO2 = (sexo, idade) => (Number(idade) < 30 ? REF[sexo].vo2.abaixo30 : REF[sexo].vo2.de30);
const notaCooper = (vo2, ref) => (vazio(vo2) ? null : Math.min(99, arred(70 + (vo2 / ref) * 20)));

export function calcularCarta(av) {
  if (!av || !av.sexo || !REF[av.sexo]) {
    return {
      testes: {},
      atributos: { forca: null, mobilidade: null, potencia: null, fitness: null, resistencia: null },
      overall: null,
    };
  }

  const R = REF[av.sexo];
  const t = {};

  // 1. Força
  for (const k of Object.keys(R.forcaN1)) t[k] = notaForcaN1(av[k], R.forcaN1[k]);
  for (const k of Object.keys(R.forcaN23)) t[k] = notaForcaN23(av[k], R.forcaN23[k]);
  for (const k of Object.keys(R.forcaRM)) {
    t[`rm_${k}`] = notaForcaRM(forcaRelativa(av[`${k}_carga`], av[`${k}_reps`], av.massa), R.forcaRM[k]);
  }
  const forcaTestes = [
    ...Object.keys(R.forcaN1),
    ...Object.keys(R.forcaN23),
    ...Object.keys(R.forcaRM).map((k) => `rm_${k}`),
  ];

  // 2. Mobilidade
  for (const k of Object.keys(R.mobilidade)) {
    t[`mob_${k}`] = notaMobilidade(av[`${k}_d`], av[`${k}_e`], R.mobilidade[k]);
  }
  const mobTestes = Object.keys(R.mobilidade).map((k) => `mob_${k}`);

  // 3. Potência (CMJ e SJ usam o MAIOR salto)
  t.cmj = notaPotencia(av.cmj_maior, R.potencia.cmj);
  t.sj = notaPotencia(av.sj_maior, R.potencia.sj);
  t.salto_horizontal = notaPotencia(av.salto_horizontal, R.potencia.salto_horizontal);
  t.hop_d = notaPotencia(av.hop_d, R.potencia.hop, av.hop_e);
  t.hop_e = notaPotencia(av.hop_e, R.potencia.hop, av.hop_d);
  t.triple_hop_d = notaPotencia(av.triple_hop_d, R.potencia.triple_hop, av.triple_hop_e);
  t.triple_hop_e = notaPotencia(av.triple_hop_e, R.potencia.triple_hop, av.triple_hop_d);
  t.medball = notaPotencia(av.medball, R.potencia.medball);
  const potTestes = ['cmj', 'sj', 'salto_horizontal', 'hop_d', 'hop_e', 'triple_hop_d', 'triple_hop_e', 'medball'];

  // 4. Fitness (% Gordura)
  t.gordura = notaFitness(av.pct_gordura, av.sexo);

  // 5. Resistência (Cooper tem prioridade sobre TC6)
  let resistencia = null;
  if (!vazio(av.cooper_distancia) && !vazio(av.idade)) {
    resistencia = notaCooper(vo2Cooper(av.cooper_distancia), refVO2(av.sexo, av.idade));
  } else if (!vazio(av.tc6_distancia) && !vazio(av.idade) && !vazio(av.massa) && !vazio(av.estatura)) {
    const imc = Number(av.massa) / Number(av.estatura) ** 2;
    resistencia = notaTC6(av.tc6_distancia, tc6Previsto(av.idade, av.sexo, imc));
  }

  const atributo = (chaves) => {
    const m = media(chaves.map((k) => t[k]));
    return m === null ? null : arred(m);
  };

  const atributos = {
    forca: atributo(forcaTestes),
    mobilidade: atributo(mobTestes),
    potencia: atributo(potTestes),
    fitness: t.gordura,
    resistencia,
  };

  const ov = media(Object.values(atributos));
  return {
    testes: t,
    atributos,
    overall: ov === null ? null : arred(ov),
  };
}