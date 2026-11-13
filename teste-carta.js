import assert from 'node:assert/strict';
import {
  vazio,
  numOuNull,
  arred,
  media,
  calcularIdadeNaData,
  calcularAssimetria,
  fatorSimetria,
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
} from './src/utils/cartaTrunfo.js';

let passados = 0;
let falhas = 0;

function caso(numero, descricao, fn) {
  try {
    fn();
    passados++;
    console.log(`✅ Caso ${String(numero).padStart(2, '0')}: ${descricao}`);
  } catch (err) {
    falhas++;
    console.error(`❌ Caso ${String(numero).padStart(2, '0')}: ${descricao}`);
    console.error('   Detalhe:', err.message);
  }
}

console.log('==============================================================');
console.log(' SUÍTE DE VALIDAÇÃO DA CARTA TRUNFO — BODY PUZZLE (31 CASOS)');
console.log('==============================================================\n');

// 1. Tratamento de vazios e zeros
caso(1, 'vazio() e numOuNull() distinguem null/string vazia de zero (0)', () => {
  assert.equal(vazio(null), true);
  assert.equal(vazio(undefined), true);
  assert.equal(vazio(''), true);
  assert.equal(vazio(0), false);
  assert.equal(vazio('0'), false);
  assert.equal(numOuNull(''), null);
  assert.equal(numOuNull('0'), 0);
  assert.equal(numOuNull(0), 0);
});

// 2. Arredondamento padrão Excel (meio para cima)
caso(2, 'arred() aplica arredondamento meio para cima igual ao Excel', () => {
  assert.equal(arred(2.5, 0), 3);
  assert.equal(arred(2.4, 0), 2);
  assert.equal(arred(1.005, 2), 1.01);
  assert.equal(arred(35.85, 1), 35.9);
  assert.equal(arred(null, 2), null);
});

// 3. Média ignorando nulos mas mantendo zeros
caso(3, 'media() ignora null/vazio e inclui 0 no cálculo', () => {
  assert.equal(media([null, '', undefined]), null);
  assert.equal(media([80, null, 60, '']), 70);
  assert.equal(media([0, 100]), 50);
});

// 4. Idade exata na data da avaliação
caso(4, 'calcularIdadeNaData() calcula idade exata antes e após aniversário', () => {
  assert.equal(calcularIdadeNaData('2000-06-15', '2026-06-14'), 25);
  assert.equal(calcularIdadeNaData('2000-06-15', '2026-06-15'), 26);
  assert.equal(calcularIdadeNaData('2000-06-15', '2026-11-10'), 26);
});

// 5. Cálculo de IMC
caso(5, 'calcularIMC() retorna IMC com 1 casa decimal', () => {
  assert.equal(calcularIMC(80, 1.8), 24.7);
  assert.equal(calcularIMC(null, 1.8), null);
});

// 6. Cálculo de RCQ
caso(6, 'calcularRCQ() retorna relação cintura/quadril com 2 casas decimais', () => {
  assert.equal(calcularRCQ(80, 100), 0.8);
  assert.equal(calcularRCQ(85, 98), 0.87);
  assert.equal(calcularRCQ(80, null), null);
});

// 7. Percentual de Gordura Masculino (7 dobras + Siri)
caso(7, 'percentualGordura() calcula %G masculino via Pollock 7 dobras + Siri', () => {
  // Soma = 70mm, idade = 25, M
  const pct = percentualGordura([10, 10, 10, 10, 10, 10, 10], 25, 'M');
  assert.equal(pct, 9.2);
});

// 8. Percentual de Gordura Feminino (7 dobras + Siri)
caso(8, 'percentualGordura() calcula %G feminino via Pollock 7 dobras + Siri', () => {
  // Soma = 70mm, idade = 25, F
  const pct = percentualGordura([10, 10, 10, 10, 10, 10, 10], 25, 'F');
  assert.equal(pct, 16.5);
});

// 9. Percentual de Gordura com dobra faltando
caso(9, 'percentualGordura() retorna null se qualquer uma das 7 dobras estiver vazia', () => {
  assert.equal(percentualGordura([10, 10, 10, null, 10, 10, 10], 25, 'M'), null);
  assert.equal(percentualGordura([10, 10, 10], 25, 'M'), null);
});

// 10. 1RM pela fórmula de Epley
caso(10, 'umRM() retorna a própria carga para 1 rep e aplica Epley para >1 rep', () => {
  assert.equal(umRM(100, 1), 100);
  assert.equal(umRM(100, 10), 100 * (1 + 10 / 30));
  assert.equal(umRM(null, 10), null);
});

// 11. Força Relativa
caso(11, 'forcaRelativa() divide 1RM pela massa corporal com 2 casas', () => {
  // 90kg para 10 reps => 1RM = 120kg. Massa = 80kg => FR = 1.5
  assert.equal(forcaRelativa(90, 10, 80), 1.5);
});

// 12. Relação SJ/CMJ (%)
caso(12, 'relacaoSJCMJ() calcula diferença percentual entre CMJ média e SJ média', () => {
  assert.equal(relacaoSJCMJ(33, 30), 10);
  assert.equal(relacaoSJCMJ(null, 30), null);
});

// 13. Cálculo de RSI
caso(13, 'calcularRSI() converte altura cm para metros e divide pelo tempo de contato', () => {
  assert.equal(calcularRSI(40, 0.2), 2);
  assert.equal(calcularRSI(35, 0.25), 1.4);
});

// 14. Assimetria <= 15% não penaliza fator de simetria
caso(14, 'fatorSimetria() retorna 1 quando a assimetria é menor ou igual a 15%', () => {
  assert.equal(calcularAssimetria(100, 90), 0.1);
  assert.equal(fatorSimetria(100, 90), 1);
  assert.equal(fatorSimetria(100, 85), 1);
});

// 15. Assimetria > 15% penaliza apenas o excedente
caso(15, 'fatorSimetria() desconta apenas o que excede 15% de assimetria', () => {
  // Assimetria entre 100 e 75 = 25% -> excedente = 10% -> fator = 0.90
  assert.equal(calcularAssimetria(100, 75), 0.25);
  assert.equal(arred(fatorSimetria(100, 75), 2), 0.9);
});

// 16. Fator de simetria com apenas um lado preenchido
caso(16, 'fatorSimetria() retorna 1 quando apenas um lado foi medido', () => {
  assert.equal(fatorSimetria(100, null), 1);
  assert.equal(fatorSimetria(null, 100), 1);
});

// 17. Nota Força Nível 1 (referência = 55, teto = 65)
caso(17, 'Força N1: atingir referência gera nota 55 e valores altos travam no teto 65', () => {
  const c1 = calcularCarta({ sexo: 'M', sentar_levantar: 20, hang_hold: 120 });
  assert.equal(c1.testes.sentar_levantar, 55);
  assert.equal(c1.testes.hang_hold, 65);
});

// 18. Nota Força Nível 2 e 3 (referência = 85, teto = 99)
caso(18, 'Força N2/N3: atingir referência gera nota 85 e teto trava em 99', () => {
  const c = calcularCarta({ sexo: 'M', pushup: 40, prancha: 400 });
  assert.equal(c.testes.pushup, 85);
  assert.equal(c.testes.prancha, 99);
});

// 19. Nota Força RM (referência = 90, teto = 99)
caso(19, 'Força RM: atingir força relativa de referência gera nota 90 e teto trava em 99', () => {
  // Squat ref M = 2.0. Massa = 80, Carga = 160, Reps = 1 -> FR = 2.0 -> nota 90
  const c = calcularCarta({
    sexo: 'M',
    massa: 80,
    squat_carga: 160,
    squat_reps: 1,
    deadlift_carga: 300,
    deadlift_reps: 5,
  });
  assert.equal(c.testes.rm_squat, 90);
  assert.equal(c.testes.rm_deadlift, 99);
});

// 20. Mobilidade abaixo do mínimo da faixa
caso(20, 'Mobilidade abaixo do mínimo: proporcional a 70 (faixa) ou 90 (valor único)', () => {
  // RI ombro [60, 70]: média 30 -> (30/60)*70 = 35
  const c = calcularCarta({ sexo: 'M', ri_ombro_d: 30, ri_ombro_e: 30 });
  assert.equal(c.testes.mob_ri_ombro, 35);
});

// 21. Mobilidade dentro da faixa [min, max]
caso(21, 'Mobilidade dentro da faixa [min, max]: interpola entre 70 e 90', () => {
  // RI ombro [60, 70]: média 65 -> 70 + ((65-60)/(70-60))*20 = 80
  const c = calcularCarta({ sexo: 'M', ri_ombro_d: 65, ri_ombro_e: 65 });
  assert.equal(c.testes.mob_ri_ombro, 80);
});

// 22. Mobilidade acima do máximo e teto 99
caso(22, 'Mobilidade acima do máximo: sobe até o teto de 99', () => {
  // RI ombro [60, 70]: média 80 (> 70 + 10%) -> 99
  const c = calcularCarta({ sexo: 'M', ri_ombro_d: 80, ri_ombro_e: 80 });
  assert.equal(c.testes.mob_ri_ombro, 99);
});

// 23. Mobilidade de referência única (Isquiotibiais [75, 75])
caso(23, 'Mobilidade com referência única (Isquiotibiais 75°): atingir 75° gera nota 90', () => {
  const c = calcularCarta({ sexo: 'M', isquios_d: 75, isquios_e: 75 });
  assert.equal(c.testes.mob_isquios, 90);
});

// 24. Mobilidade com penalidade de assimetria (>15%)
caso(24, 'Mobilidade aplica fator de simetria quando diferença entre lados > 15%', () => {
  // Isquios [75, 75]: D=80, E=60 -> média=70 -> base = (70/75)*90 = 84
  // Assimetria = (80-60)/80 = 0.25 -> fatorSimetria = 0.90 -> 84 * 0.9 = 75.6 -> 76
  const c = calcularCarta({ sexo: 'M', isquios_d: 80, isquios_e: 60 });
  assert.equal(c.testes.mob_isquios, 76);
});

// 25. Potência bilateral (CMJ, SJ, Salto Horizontal, Medball)
caso(25, 'Potência bilateral: atingir referência gera nota 70 e respeita teto 99', () => {
  const c = calcularCarta({ sexo: 'M', cmj_maior: 38, medball: 600 });
  assert.equal(c.testes.cmj, 70);
  assert.equal(c.testes.medball, 99);
});

// 26. Potência unilateral (Hop / Triple Hop) com penalidade de assimetria
caso(26, 'Potência unilateral (Hop D/E) aplica penalidade em ambos os lados se assimetria > 15%', () => {
  // Ref Hop M = 150. D=150 (base 70), E=112.5 (base 52.5). Assimetria = 25% -> fator = 0.90
  // Nota D = arred(70 * 0.9) = 63; Nota E = arred(52.5 * 0.9) = 47
  const c = calcularCarta({ sexo: 'M', hop_d: 150, hop_e: 112.5 });
  assert.equal(c.testes.hop_d, 63);
  assert.equal(c.testes.hop_e, 47);
});

// 27. Nota Fitness (% Gordura por sexo)
caso(27, 'Fitness (% Gordura): na referência (8% M / 16% F) vale 99 e decresce linearmente', () => {
  const cM = calcularCarta({ sexo: 'M', pct_gordura: 8 });
  const cF = calcularCarta({ sexo: 'F', pct_gordura: 16 });
  const cM28 = calcularCarta({ sexo: 'M', pct_gordura: 28 }); // ((8+40-28)/40)*99 = 49.5 -> 50
  assert.equal(cM.atributos.fitness, 99);
  assert.equal(cF.atributos.fitness, 99);
  assert.equal(cM28.atributos.fitness, 50);
});

// 28. Resistência via TC6 (nota 60 no previsto, teto 70)
caso(28, 'Resistência TC6: atingir distância prevista gera nota 60 e trava no teto 70', () => {
  const imc = 80 / 1.8 ** 2;
  const prev = tc6Previsto(25, 'M', imc);
  const cPrev = calcularCarta({ sexo: 'M', idade: 25, massa: 80, estatura: 1.8, tc6_distancia: prev });
  const cAlto = calcularCarta({ sexo: 'M', idade: 25, massa: 80, estatura: 1.8, tc6_distancia: 1200 });
  assert.equal(cPrev.atributos.resistencia, 60);
  assert.equal(cAlto.atributos.resistencia, 70);
});

// 29. Resistência via Cooper (VO2 por sexo e idade <30 vs >=30)
caso(29, 'Resistência Cooper: calcula VO2 e aplica referência correta por sexo e idade', () => {
  // Dist 2973.996m -> VO2 = 55.2 (ref M <30) -> nota = 70 + 20 = 90
  const c = calcularCarta({ sexo: 'M', idade: 25, cooper_distancia: 2974 });
  assert.equal(vo2Cooper(2974), 55.2);
  assert.equal(c.atributos.resistencia, 90);
});

// 30. Prioridade Cooper sobre TC6 e Cálculo de Pace/Zonas
caso(30, 'Resistência dá prioridade ao Cooper quando ambos TC6 e Cooper são informados; Pace gera Z1-Z5', () => {
  const c = calcularCarta({
    sexo: 'M',
    idade: 25,
    massa: 80,
    estatura: 1.8,
    tc6_distancia: 500,
    cooper_distancia: 2974,
  });
  assert.equal(c.atributos.resistencia, 90);

  const pz = calcularPaceEZonas(15, 3);
  assert.equal(pz.pace, 5);
  assert.deepEqual(pz.z1, [6.5, 6]);
  assert.deepEqual(pz.z5, [4.9, 4.5]);
});

// 31. Cálculo completo da Carta Trunfo e Overall ignorando atributos vazios
caso(31, 'calcularCarta() calcula Overall apenas com os atributos realizados e preserva nota 0', () => {
  const cParcial = calcularCarta({
    sexo: 'M',
    sentar_levantar: 20, // Força = 55
    isquios_d: 75,
    isquios_e: 75, // Mobilidade = 90
  });
  assert.equal(cParcial.atributos.forca, 55);
  assert.equal(cParcial.atributos.mobilidade, 90);
  assert.equal(cParcial.atributos.potencia, null);
  assert.equal(cParcial.atributos.fitness, null);
  assert.equal(cParcial.atributos.resistencia, null);
  assert.equal(cParcial.overall, 73); // arred((55 + 90) / 2) = 73

  const cComZero = calcularCarta({
    sexo: 'M',
    sentar_levantar: 0, // Força = 0 (não deve virar null)
    isquios_d: 75,
    isquios_e: 75, // Mobilidade = 90
  });
  assert.equal(cComZero.atributos.forca, 0);
  assert.equal(cComZero.overall, 45);
});

console.log('\n==============================================================');
console.log(` RESULTADO FINAL: ${passados}/31 casos aprovados (${falhas} falhas)`);
console.log('==============================================================');

if (falhas > 0) {
  process.exit(1);
}
