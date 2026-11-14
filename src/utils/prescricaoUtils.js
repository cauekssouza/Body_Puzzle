import { supabase } from '../lib/superbase';

export function normalizarTexto(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function formatarTextoTreino(itens = []) {
  return (itens || [])
    .map((item) => {
      if (item.tipo === 'cardio') {
        const cabecalho = `[BLOCO ${item.bloco || '1'} • CARDIO] 🫀 ${item.titulo || 'Bloco Cardiorrespiratório'}${
          item.duracao_min ? ` (${item.duracao_min} min)` : ''
        }`;
        return `${cabecalho}\n${item.descricao || ''}`;
      }

      let textoBase = `[BLOCO ${item.bloco || '1'}] • ${item.nome} (${item.equipamento || 'Livre'})\n  ${item.series}x${item.repeticoes} | Carga: ${
        item.carga && item.carga !== '-' ? `${item.carga}kg` : '-'
      } | Intervalo: ${item.intervalo || '-'}\n  💡 Dica: ${item.pontos_atencao || 'Executar com controle'}`;
      if (item.observacao) textoBase += `\n  📝 Obs: ${item.observacao}`;
      return textoBase;
    })
    .join('\n\n');
}

export function verificarExercicioInativo(item, todosExercicios = []) {
  if (!item || item.tipo === 'cardio') return false;
  if (item.exercicio_id) {
    const porId = todosExercicios.find((e) => String(e.id) === String(item.exercicio_id));
    if (porId) return porId.status === 'Inativo';
  }
  if (item.nome) {
    const nomeNorm = normalizarTexto(item.nome);
    const porNome = todosExercicios.find((e) => normalizarTexto(e.nome) === nomeNorm);
    if (porNome) return porNome.status === 'Inativo';
  }
  return Boolean(item.exercicio_inativo);
}

export function clonarItensTreino(itensOriginais = [], manterCargas = true, todosExercicios = []) {
  const inativosSet = new Set();

  const itensNovos = (itensOriginais || []).map((item, idx) => {
    const idUnico = Date.now() + idx + Math.floor(Math.random() * 100000);

    if (item.tipo === 'cardio') {
      return {
        ...item,
        id_unico: idUnico,
        tipo: 'cardio',
        exercicio_id: null,
        bloco: String(item.bloco || '1'),
        ordem: idx + 1,
        titulo: item.titulo || null,
        descricao: item.descricao || '',
        duracao_min: item.duracao_min ? Number(item.duracao_min) : null,
      };
    }

    const inativo = verificarExercicioInativo(item, todosExercicios);
    if (inativo && item.nome) {
      inativosSet.add(item.nome);
    }

    return {
      ...item,
      id_unico: idUnico,
      tipo: 'exercicio',
      bloco: String(item.bloco || '1'),
      ordem: idx + 1,
      carga: manterCargas ? item.carga || '-' : '-',
      exercicio_inativo: inativo,
    };
  });

  return {
    itensNovos,
    exerciciosInativos: Array.from(inativosSet),
  };
}

export async function salvarItensNaTabelaItensTreino(treinoId, itens = []) {
  if (!treinoId || !Array.isArray(itens) || itens.length === 0) return { error: null };

  const linhas = itens.map((item, idx) => {
    if (item.tipo === 'cardio') {
      return {
        treino_id: treinoId,
        exercicio_id: null,
        tipo: 'cardio',
        bloco: String(item.bloco || '1'),
        ordem: idx + 1,
        series: null,
        repeticoes: null,
        carga: null,
        intervalo: null,
        observacao: null,
        titulo: item.titulo || null,
        descricao: item.descricao || '',
        duracao_min: item.duracao_min !== null && item.duracao_min !== '' ? Number(item.duracao_min) : null,
      };
    }

    return {
      treino_id: treinoId,
      exercicio_id: item.exercicio_id || null,
      tipo: 'exercicio',
      bloco: String(item.bloco || '1'),
      ordem: idx + 1,
      series: item.series ? String(item.series) : null,
      repeticoes: item.repeticoes ? String(item.repeticoes) : null,
      carga: item.carga ? String(item.carga) : null,
      intervalo: item.intervalo ? String(item.intervalo) : null,
      observacao: item.observacao || null,
      titulo: item.nome || null,
      descricao: null,
      duracao_min: null,
    };
  });

  const { error } = await supabase.from('itens_treino').insert(linhas);
  return { error };
}

/**
 * Copia um mesociclo completo (com todos os seus treinos e blocos cardiorrespiratórios)
 * de forma independente e transacional (tudo ou nada, com rollback automático em caso de falha).
 */
export async function copiarMesocicloTransacional({
  mesocicloOrigemId,
  alunoDestino,
  dadosNovoMeso,
  manterCargas,
  todosExercicios = [],
}) {
  if (!mesocicloOrigemId) throw new Error('Selecione o mesociclo de origem.');
  if (!alunoDestino?.id) throw new Error('Selecione o aluno de destino.');

  // 1. Busca os treinos do mesociclo de origem
  const { data: treinosOrigem, error: errBuscaTreinos } = await supabase
    .from('treinos')
    .select('*')
    .eq('mesociclo_id', mesocicloOrigemId)
    .order('criado_em', { ascending: true });

  if (errBuscaTreinos) {
    throw new Error('Erro ao ler treinos do mesociclo de origem: ' + errBuscaTreinos.message);
  }

  // 2. Calcula data_fim
  const semanasNum = parseInt(dadosNovoMeso.semanas, 10) || 4;
  const dataInicioStr = dadosNovoMeso.dataInicio || new Date().toISOString().split('T')[0];
  const dataInicioObj = new Date(`${dataInicioStr}T00:00:00`);
  dataInicioObj.setDate(dataInicioObj.getDate() + semanasNum * 7);
  const dataFimFormatada = dataInicioObj.toISOString().split('T')[0];

  // 3. Cria o novo mesociclo registrando copiado_de_mesociclo_id
  const payloadMeso = {
    aluno_id: alunoDestino.id,
    nome: dadosNovoMeso.nome,
    data_inicio: dataInicioStr,
    semanas: semanasNum,
    data_fim: dataFimFormatada,
    objetivo: dadosNovoMeso.objetivo || null,
    frequencia: dadosNovoMeso.frequencia ? parseInt(dadosNovoMeso.frequencia, 10) : null,
    status: dadosNovoMeso.status || 'Ativo',
    copiado_de_mesociclo_id: mesocicloOrigemId,
  };

  const { data: novoMesociclo, error: errCriarMeso } = await supabase
    .from('mesociclos')
    .insert([payloadMeso])
    .select()
    .single();

  if (errCriarMeso) {
    throw new Error('Erro ao criar mesociclo copiado: ' + errCriarMeso.message);
  }

  const treinosCriadosIds = [];
  const todosInativos = new Set();

  try {
    const treinosCriados = [];

    for (const tOrig of treinosOrigem || []) {
      const itensOriginais = Array.isArray(tOrig.itens_estruturados) ? tOrig.itens_estruturados : [];
      const { itensNovos, exerciciosInativos } = clonarItensTreino(itensOriginais, manterCargas, todosExercicios);

      exerciciosInativos.forEach((nome) => todosInativos.add(nome));

      let textoTreinoNovo = tOrig.exercicios || '';
      if (itensNovos.length > 0) {
        textoTreinoNovo = formatarTextoTreino(itensNovos);
      } else if (!manterCargas && textoTreinoNovo) {
        textoTreinoNovo = textoTreinoNovo.replace(/Carga:\s*[^|\n]+/g, 'Carga: - ');
      }

      const payloadTreino = {
        aluno_id: alunoDestino.id,
        user_id: alunoDestino.user_id || null,
        mesociclo_id: novoMesociclo.id,
        titulo: tOrig.titulo || 'Treino',
        exercicios: textoTreinoNovo,
        itens_estruturados: itensNovos,
        observacoes_sensoriais: tOrig.observacoes_sensoriais || 'Copiado de mesociclo anterior',
      };

      const { data: treinoCriado, error: errTreino } = await supabase
        .from('treinos')
        .insert([payloadTreino])
        .select()
        .single();

      if (errTreino) {
        throw new Error(`Falha ao copiar o treino "${tOrig.titulo}": ${errTreino.message}`);
      }

      treinosCriadosIds.push(treinoCriado.id);
      treinosCriados.push(treinoCriado);

      if (itensNovos.length > 0) {
        const { error: errItens } = await salvarItensNaTabelaItensTreino(treinoCriado.id, itensNovos);
        if (errItens) {
          throw new Error(`Falha ao copiar itens do treino "${tOrig.titulo}": ${errItens.message}`);
        }
      }
    }

    return {
      novoMesociclo,
      treinosCriados,
      exerciciosInativos: Array.from(todosInativos),
    };
  } catch (erroTransacao) {
    // Rollback (tudo ou nada): apaga treinos e o mesociclo recém-criados
    if (treinosCriadosIds.length > 0) {
      await supabase.from('itens_treino').delete().in('treino_id', treinosCriadosIds);
      await supabase.from('treinos').delete().in('id', treinosCriadosIds);
    }
    await supabase.from('mesociclos').delete().eq('id', novoMesociclo.id);
    throw erroTransacao;
  }
}

/**
 * Importa um treino específico para dentro de um mesociclo existente de forma transacional.
 */
export async function importarTreinoParaMesociclo({
  treinoOrigem,
  alunoDestino,
  mesocicloDestinoId,
  manterCargas,
  todosExercicios = [],
}) {
  if (!treinoOrigem) throw new Error('Selecione o treino de origem.');
  if (!alunoDestino?.id) throw new Error('Selecione o aluno de destino.');
  if (!mesocicloDestinoId) throw new Error('Selecione o mesociclo de destino.');

  const itensOriginais = Array.isArray(treinoOrigem.itens_estruturados) ? treinoOrigem.itens_estruturados : [];
  const { itensNovos, exerciciosInativos } = clonarItensTreino(itensOriginais, manterCargas, todosExercicios);

  let textoTreinoNovo = treinoOrigem.exercicios || '';
  if (itensNovos.length > 0) {
    textoTreinoNovo = formatarTextoTreino(itensNovos);
  } else if (!manterCargas && textoTreinoNovo) {
    textoTreinoNovo = textoTreinoNovo.replace(/Carga:\s*[^|\n]+/g, 'Carga: - ');
  }

  const payloadTreino = {
    aluno_id: alunoDestino.id,
    user_id: alunoDestino.user_id || null,
    mesociclo_id: mesocicloDestinoId,
    titulo: treinoOrigem.titulo || 'Treino Importado',
    exercicios: textoTreinoNovo,
    itens_estruturados: itensNovos,
    observacoes_sensoriais: treinoOrigem.observacoes_sensoriais || 'Importado pela Biblioteca Body Puzzle',
  };

  const { data: novoTreino, error: errTreino } = await supabase
    .from('treinos')
    .insert([payloadTreino])
    .select()
    .single();

  if (errTreino) {
    throw new Error('Erro ao importar treino: ' + errTreino.message);
  }

  if (itensNovos.length > 0) {
    const { error: errItens } = await salvarItensNaTabelaItensTreino(novoTreino.id, itensNovos);
    if (errItens) {
      await supabase.from('treinos').delete().eq('id', novoTreino.id);
      throw new Error('Erro ao salvar itens do treino importado: ' + errItens.message);
    }
  }

  return {
    novoTreino,
    exerciciosInativos,
  };
}
