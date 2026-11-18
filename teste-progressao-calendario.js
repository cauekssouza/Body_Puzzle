// Suite de validação automatizada para o Roteiro de Teste (Seção 7):
// Progressão de carga, sessões, calendário semanal, grade do mesociclo e edição de treinos/mesociclos prontos.

import assert from 'node:assert/strict';
import {
  calcularSemanaMesociclo,
  verificarSessaoForaDoPeriodo,
  obterUltimaCargaExercicioAluno,
  extrairPrimeiroNumeroRepeticoes,
  formatarCelulaItemSessao,
  compararItemComSemanaAnterior,
  gerarFaixaSemanasMesociclo,
  construirGradeMesocicloPorTreino,
  calcularDadosProgressaoExercicio,
  analisarImpactoEdicaoMesocicloNasSessoes,
  formatarAuditoriaAula,
  estaNaLixeiraRecente,
} from './src/utils/prescricaoUtils.js';

let passou = 0;

function testar(nome, fn) {
  fn();
  passou++;
  console.log(`✅ [${passou}] ${nome}`);
}

const mesocicloTeste = {
  id: 'meso-1',
  nome: 'Mesociclo 3',
  data_inicio: '2026-11-02', // Segunda-feira, 02/11/2026
  semanas: 8,
  frequencia: 2,
  objetivo: 'Força Base',
};

const treinoATeste = {
  id: 'treino-A',
  mesociclo_id: 'meso-1',
  titulo: 'Treino A',
  itens_estruturados: [
    {
      id_unico: 101,
      tipo: 'exercicio',
      exercicio_id: 'ex-squat',
      bloco: '1',
      nome: 'Squat',
      padrao: 'MMII - Dominante de joelho',
      series: '3',
      repeticoes: '4',
      carga: '50',
    },
    {
      id_unico: 102,
      tipo: 'exercicio',
      exercicio_id: 'ex-rdl',
      bloco: '1',
      nome: 'RDL Kettlebell',
      padrao: 'MMII - Dominante de quadril',
      series: '3',
      repeticoes: '8',
      carga: '20',
    },
    {
      id_unico: 103,
      tipo: 'exercicio',
      exercicio_id: 'ex-remada',
      bloco: '2',
      nome: 'Remada Argola Neutra',
      padrao: 'Calistenia',
      series: '3',
      repeticoes: '10',
      carga: '-',
    },
  ],
};

// 1. Seção 3.1: Cálculo exato da semana do mesociclo e detecção de aula fora do período
testar('Seção 3.1: Cálculo da semana (02/11 -> S1, 08/11 -> S1, 09/11 -> S2, 18/11 -> S3) e aviso fora do período', () => {
  assert.equal(calcularSemanaMesociclo('2026-11-02', '2026-11-02'), 1);
  assert.equal(calcularSemanaMesociclo('2026-11-04', '2026-11-02'), 1);
  assert.equal(calcularSemanaMesociclo('2026-11-08', '2026-11-02'), 1);
  assert.equal(calcularSemanaMesociclo('2026-11-09', '2026-11-02'), 2);
  assert.equal(calcularSemanaMesociclo('2026-11-11', '2026-11-02'), 2);
  assert.equal(calcularSemanaMesociclo('2026-11-18', '2026-11-02'), 3);

  const dentro = verificarSessaoForaDoPeriodo('2026-11-18', mesocicloTeste);
  assert.equal(dentro.foraDoPeriodo, false);
  assert.equal(dentro.semanaCalculada, 3);

  const fora = verificarSessaoForaDoPeriodo('2026-12-30', mesocicloTeste);
  assert.equal(fora.foraDoPeriodo, true);
  assert.equal(fora.semanaCalculada, 9);
  assert.equal(fora.mensagem, 'Aula fora do período do mesociclo');
});

// 2. Seção 2 e 7: Registro de sessões (50 kg em 04/11 S1, 60 kg em 11/11 S2, 65 kg em 18/11 S3) e "última: 65 kg"
const sessoesRegistradas = [
  {
    id: 'sess-1',
    aluno_id: 'aluno-1',
    mesociclo_id: 'meso-1',
    treino_id: 'treino-A',
    data: '2026-11-04',
    semana: 1,
    excluido_em: null,
    sessao_itens: [
      { exercicio_id: 'ex-squat', exercicio_nome: 'Squat', series: 3, repeticoes: '4', carga_kg: 50 },
      { exercicio_id: 'ex-rdl', exercicio_nome: 'RDL Kettlebell', series: 3, repeticoes: '8', carga_kg: 20 },
      { exercicio_id: 'ex-remada', exercicio_nome: 'Remada Argola Neutra', series: 3, repeticoes: '10', carga_kg: null },
    ],
  },
  {
    id: 'sess-2',
    aluno_id: 'aluno-1',
    mesociclo_id: 'meso-1',
    treino_id: 'treino-A',
    data: '2026-11-11',
    semana: 2,
    excluido_em: null,
    sessao_itens: [
      { exercicio_id: 'ex-squat', exercicio_nome: 'Squat', series: 3, repeticoes: '4', carga_kg: 60 },
      { exercicio_id: 'ex-rdl', exercicio_nome: 'RDL Kettlebell', series: 3, repeticoes: '8', carga_kg: 24 },
      { exercicio_id: 'ex-remada', exercicio_nome: 'Remada Argola Neutra', series: 3, repeticoes: '10', carga_kg: null },
    ],
  },
  {
    id: 'sess-3',
    aluno_id: 'aluno-1',
    mesociclo_id: 'meso-1',
    treino_id: 'treino-A',
    data: '2026-11-18',
    semana: 3,
    excluido_em: null,
    sessao_itens: [
      { exercicio_id: 'ex-squat', exercicio_nome: 'Squat', series: 3, repeticoes: '4', carga_kg: 65 },
      { exercicio_id: 'ex-rdl', exercicio_nome: 'RDL Kettlebell', series: 3, repeticoes: '8', carga_kg: 24 },
      { exercicio_id: 'ex-remada', exercicio_nome: 'Remada Argola Neutra', series: 3, repeticoes: '8', carga_kg: null },
    ],
  },
];

testar('Seção 2.1 e 7: Última carga mostra "última: 65 kg" e exercício de calistenia sem carga mostra "PC"', () => {
  const ultimaSquat = obterUltimaCargaExercicioAluno(sessoesRegistradas, 'ex-squat', 'Squat');
  assert.equal(ultimaSquat.cargaKg, 65);
  assert.equal(ultimaSquat.textoPlaceholder, 'última: 65 kg');

  const itemCalistenia = sessoesRegistradas[2].sessao_itens[2];
  assert.equal(formatarCelulaItemSessao(itemCalistenia), '3×8 · PC');

  assert.deepEqual(extrairPrimeiroNumeroRepeticoes('8-10'), { valor: 8, unidade: 'reps' });
  assert.deepEqual(extrairPrimeiroNumeroRepeticoes('30 s'), { valor: 30, unidade: 's' });

  const cmpSubiu = compararItemComSemanaAnterior({ carga_kg: 65 }, { carga_kg: 60 });
  assert.equal(cmpSubiu.texto, '↑ 5 kg');
  assert.equal(estaNaLixeiraRecente(new Date().toISOString()), true);
});

// 3. Seção 4 e 7: Aba Progressão -> Squat: 3 pontos (50, 60, 65 kg) e destaques "50 kg → 65 kg · +15 kg (+30%) · melhor 65 kg"
testar('Seção 4 e 7: Progressão de Squat calcula 3 pontos (50, 60, 65 kg) e destaque "50 kg → 65 kg · +15 kg (+30%) · melhor 65 kg"', () => {
  const prog = calcularDadosProgressaoExercicio({
    sessoesDoAluno: sessoesRegistradas,
    exercicioId: 'ex-squat',
    exercicioNome: 'Squat',
    mesociclosMap: { 'meso-1': mesocicloTeste },
  });

  assert.equal(prog.pontosGrafico.length, 3);
  assert.deepEqual(
    prog.pontosGrafico.map((p) => p.cargaKg),
    [50, 60, 65]
  );
  assert.equal(prog.destaques.resumoTexto, '50 kg → 65 kg · +15 kg (+30%) · melhor 65 kg');
  assert.equal(prog.tabelaSessoes[0].data, '2026-11-18'); // mais recente primeiro
});

// 4. Seção 5 e 7: Calendário do mesociclo (Faixa de semanas S1 02–08/11 ... S8, Visão Semana S3 "Qua 18/11", Visão Grade e comparação ↑ ↓ =)
testar('Seção 5 e 7: Calendário do mesociclo gera S1 02–08/11...S8, dia "Qua 18/11" e células da Grade com ↑ ↓ =', () => {
  const faixa = gerarFaixaSemanasMesociclo(mesocicloTeste, sessoesRegistradas, '2026-11-18');
  assert.equal(faixa.semanas.length, 8);
  assert.equal(faixa.semanas[0].rotuloBotao, 'S1 02–08/11');
  assert.equal(faixa.semanas[1].rotuloBotao, 'S2 09–15/11');
  assert.equal(faixa.semanas[2].rotuloBotao, 'S3 16–22/11');
  assert.equal(faixa.semanas[2].isSemanaAtual, true);

  // Na S3, dia 18/11 é Quarta-feira ("Qua 18/11") com a sessão registrada
  const dia18 = faixa.semanas[2].dias.find((d) => d.data === '2026-11-18');
  assert.equal(dia18.rotuloDia, 'Qua 18/11');
  assert.equal(dia18.sessoes.length, 1);

  const grade = construirGradeMesocicloPorTreino({
    treino: treinoATeste,
    mesociclo: mesocicloTeste,
    sessoesDoTreino: sessoesRegistradas,
    todosExercicios: [],
    dataReferenciaStr: '2026-11-18',
  });

  const linhaSquat = grade.linhasExercicios.find((l) => l.nome === 'Squat');
  assert.equal(linhaSquat.celulasPorSemana[1].texto, '3×4 · 50 kg');
  assert.equal(linhaSquat.celulasPorSemana[2].texto, '3×4 · 60 kg');
  assert.equal(linhaSquat.celulasPorSemana[3].texto, '3×4 · 65 kg');
  assert.equal(linhaSquat.celulasPorSemana[3].comparacao.texto, '↑ 5 kg');
  assert.equal(linhaSquat.celulasPorSemana[4].isFutura, true);

  const linhaRdl = grade.linhasExercicios.find((l) => l.nome === 'RDL Kettlebell');
  assert.equal(linhaRdl.celulasPorSemana[3].comparacao.texto, '=');

  const linhaRemada = grade.linhasExercicios.find((l) => l.nome === 'Remada Argola Neutra');
  assert.equal(linhaRemada.celulasPorSemana[3].texto, '3×8 · PC');
  assert.equal(linhaRemada.celulasPorSemana[3].comparacao.texto, '↓ 2 reps');
});

// 5. Seção 5.3 e 7: Duas aulas do mesmo treino na mesma semana mostram a de maior carga e o selo "2×"
testar('Seção 5.3 e 7: Duas aulas do Treino A na mesma semana exibem a sessão de maior carga e o selo "2×"', () => {
  const sessoesDuplasS3 = [
    ...sessoesRegistradas,
    {
      id: 'sess-3-extra',
      aluno_id: 'aluno-1',
      mesociclo_id: 'meso-1',
      treino_id: 'treino-A',
      data: '2026-11-20',
      semana: 3,
      excluido_em: null,
      sessao_itens: [
        { exercicio_id: 'ex-squat', exercicio_nome: 'Squat', series: 3, repeticoes: '4', carga_kg: 70 },
      ],
    },
  ];

  const grade = construirGradeMesocicloPorTreino({
    treino: treinoATeste,
    mesociclo: mesocicloTeste,
    sessoesDoTreino: sessoesDuplasS3,
    todosExercicios: [],
    dataReferenciaStr: '2026-11-20',
  });

  const celS3 = grade.linhasExercicios.find((l) => l.nome === 'Squat').celulasPorSemana[3];
  assert.equal(celS3.texto, '3×4 · 70 kg');
  assert.equal(celS3.seloRepeticaoSemana, '2×');
  assert.equal(celS3.ocorrencias.length, 2);
});

// 6. Seção 6 e 7: Trocar Squat por Front Squat mantém Squat nas sessões antigas, e mudar data/semanas do mesociclo recalcula e avisa
testar('Seção 6 e 7: Trocar Squat por Front Squat preserva histórico de Squat nas aulas antigas e recalcula semanas ao editar mesociclo', () => {
  const treinoEditado = {
    ...treinoATeste,
    ultima_edicao_em: '2026-11-18T14:00:00-03:00',
    ultima_edicao_por_nome: 'Eduardo',
    itens_estruturados: [
      {
        id_unico: 101,
        tipo: 'exercicio',
        exercicio_id: 'ex-front-squat',
        bloco: '1',
        nome: 'Front Squat',
        series: '4',
        repeticoes: '6',
        carga: '45',
      },
    ],
  };

  assert.equal(formatarAuditoriaAula(treinoEditado), 'Editado em 18/11 por Eduardo');

  const gradePosTroca = construirGradeMesocicloPorTreino({
    treino: treinoEditado,
    mesociclo: mesocicloTeste,
    sessoesDoTreino: sessoesRegistradas,
    todosExercicios: [],
    dataReferenciaStr: '2026-11-18',
  });

  // Front Squat aparece como prescrito atual, e Squat continua aparecendo com as cargas registradas nas semanas 1, 2 e 3!
  const linhaFront = gradePosTroca.linhasExercicios.find((l) => l.nome === 'Front Squat');
  const linhaSquatAntigo = gradePosTroca.linhasExercicios.find((l) => l.nome === 'Squat');
  assert.ok(linhaFront);
  assert.ok(linhaSquatAntigo);
  assert.equal(linhaSquatAntigo.celulasPorSemana[1].texto, '3×4 · 50 kg');
  assert.equal(linhaSquatAntigo.celulasPorSemana[2].texto, '3×4 · 60 kg');
  assert.equal(linhaSquatAntigo.celulasPorSemana[3].texto, '3×4 · 65 kg');

  // Diminuir semanas do mesociclo para 2 quando há aula na semana 3 gera o aviso da Seção 6.3
  const impacto = analisarImpactoEdicaoMesocicloNasSessoes(sessoesRegistradas, '2026-11-02', 2);
  assert.equal(impacto.sessoesFora.length, 1);
  assert.ok(impacto.avisoForaDoPeriodo.includes('semana 3'));
  assert.ok(impacto.avisoForaDoPeriodo.includes('fora do período do mesociclo'));
});

console.log(`\n🎉 Todos os ${passou} cenários do Roteiro de Teste (Seção 7) passaram com sucesso!`);
