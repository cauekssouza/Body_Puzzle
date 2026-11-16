// Suite de validação automatizada para o Roteiro de Teste (Seção 10):
// Prescrição, Biblioteca (Calistenia/Mobilidade), Aquecimento (Bloco 0), Exposição, Auditoria e Lixeira (Soft Delete)

import assert from 'node:assert/strict';
import {
  EXERCICIOS_CALISTENIA_45,
  EXERCICIOS_MOBILIDADE_23,
  converterNivelCalistenia,
} from './src/data/exerciciosExpansao.js';
import {
  normalizarTexto,
  normalizarBloco,
  ordenarItensTreinoPorBloco,
  extrairDuracaoAquecimento,
  formatarTextoTreino,
  clonarItensTreino,
  estaNaLixeiraRecente,
  formatarAuditoriaAula,
  calcularProgressoMesociclo,
  sugerirProximoTreino,
} from './src/utils/prescricaoUtils.js';

let passou = 0;

function testar(nome, fn) {
  fn();
  passou++;
  console.log(`✅ [${passou}] ${nome}`);
}

// 1. Seção 6: Calistenia (45 exercícios, níveis Tuck=1, One-leg=2, Straddle=3, Full=4) e Mobilidade (23 exercícios)
testar('Seção 6: Catálogo possui exatamente 45 exercícios de Calistenia (Metodologia) e 23 de Mobilidade (Proposta)', () => {
  assert.equal(EXERCICIOS_CALISTENIA_45.length, 45);
  assert.equal(EXERCICIOS_MOBILIDADE_23.length, 23);

  assert.ok(EXERCICIOS_CALISTENIA_45.every((e) => e.padrao === 'Calistenia' && e.status === 'Metodologia'));
  assert.ok(
    EXERCICIOS_MOBILIDADE_23.every(
      (e) => e.padrao === 'Mobilidade' && e.tipo === 'Mobilidade' && e.status === 'Proposta (revisar)' && Boolean(e.subpadrao)
    )
  );

  assert.equal(converterNivelCalistenia('Tuck'), 1);
  assert.equal(converterNivelCalistenia('One-leg'), 2);
  assert.equal(converterNivelCalistenia('Straddle'), 3);
  assert.equal(converterNivelCalistenia('Full'), 4);
});

// 2. Seção 7: Bloco de Aquecimento (bloco = '0') ordenado antes do Bloco 1 e Cardio, e incluído na cópia
testar('Seção 7: Bloco 0 (Aquecimento) é sempre ordenado antes dos Blocos 1..4 e do Cardio, e preservado na cópia', () => {
  const itensDesordenados = [
    { id_unico: 1, tipo: 'cardio', bloco: '1', titulo: 'Bike HIIT', descricao: '10x 30s/30s', duracao_min: 10 },
    { id_unico: 2, tipo: 'exercicio', bloco: '2', nome: 'Supino Reto', series: '4', repeticoes: '8', carga: '60' },
    { id_unico: 3, tipo: 'exercicio', bloco: '0', nome: '90/90 Hip Switch', series: '2', repeticoes: '10/lado', carga: '-' },
    { id_unico: 4, tipo: 'exercicio', bloco: '1', nome: 'Back Squat', series: '4', repeticoes: '6', carga: '80' },
    { id_unico: 5, tipo: 'texto', bloco: '0', titulo: 'Aquecimento Geral', descricao: '5 min de bike leve' },
  ];

  const ordenados = ordenarItensTreinoPorBloco(itensDesordenados);
  assert.equal(normalizarBloco(ordenados[0].bloco), '0');
  assert.equal(normalizarBloco(ordenados[1].bloco), '0');
  assert.equal(normalizarBloco(ordenados[2].bloco), '1');
  assert.equal(normalizarBloco(ordenados[3].bloco), '2');
  assert.equal(ordenados[4].tipo, 'cardio');

  // Clonagem sem manter cargas deve preservar o bloco '0' e os textos livres
  const { itensNovos } = clonarItensTreino(ordenados, false, []);
  assert.equal(itensNovos.filter((i) => i.bloco === '0').length, 2);
  assert.equal(itensNovos.find((i) => i.nome === 'Back Squat').carga, '-');
  assert.equal(itensNovos.find((i) => i.tipo === 'texto').descricao, '5 min de bike leve');

  const texto = formatarTextoTreino(itensNovos, 12);
  assert.ok(texto.includes('[AQUECIMENTO • 12 min]'));
  assert.ok(texto.indexOf('[AQUECIMENTO') < texto.indexOf('[BLOCO 1]'));
  assert.equal(extrairDuracaoAquecimento({ duracao_aquecimento_min: 12, itens_estruturados: itensNovos }), 12);
});

// 3. Seção 3.1: Lixeira de 30 dias e exclusão de itens da sugestão de próximo treino
testar('Seção 3.1: Itens excluídos recentemente entram na Lixeira (30d) e nunca aparecem na sugestão de próximo treino', () => {
  const agora = new Date().toISOString();
  const ha40Dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(estaNaLixeiraRecente(agora), true);
  assert.equal(estaNaLixeiraRecente(ha40Dias), false);
  assert.equal(estaNaLixeiraRecente(null), false);

  const mesociclos = [{ id: 'm1', status: 'Ativo', excluido_em: null }];
  const treinos = [
    { id: 'tA', mesociclo_id: 'm1', titulo: 'Treino A', ultima_execucao_em: '2026-11-10T10:00:00Z', excluido_em: null },
    { id: 'tB', mesociclo_id: 'm1', titulo: 'Treino B', ultima_execucao_em: null, excluido_em: agora }, // Excluído!
    { id: 'tC', mesociclo_id: 'm1', titulo: 'Treino C', ultima_execucao_em: null, excluido_em: null },
  ];

  const proximo = sugerirProximoTreino(treinos, mesociclos, 'aluno-1');
  // Como Treino A foi o último realizado e Treino B está na lixeira, deve sugerir o Treino C!
  assert.equal(proximo.id, 'tC');
});

// 4. Seção 8 e 9: Progresso do mesociclo, busca sem acentos e auditoria de edição em aula
testar('Seções 8 e 9: Progresso do mesociclo e selo de auditoria de edição durante a aula', () => {
  assert.equal(normalizarTexto('Mobilização Torácica — Punho'), 'mobilizacao toracica — punho');

  const selo = formatarAuditoriaAula({
    ultima_edicao_aula_em: '2026-11-16T15:30:00-03:00',
    ultima_edicao_aula_por_nome: 'André',
  });
  assert.equal(selo, 'Alterado durante a aula de 16/11 por André');

  const prog = calcularProgressoMesociclo({
    data_inicio: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    semanas: 8,
  });
  assert.equal(prog, 'Semana 3 de 8');
});

console.log(`\n🎉 Todos os ${passou} cenários de teste passaram com sucesso!`);
