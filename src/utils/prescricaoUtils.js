import { supabase } from '../lib/superbase';

export function normalizarTexto(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizarBloco(bloco) {
  if (bloco === 0 || bloco === '0') return '0';
  if (bloco !== undefined && bloco !== null && String(bloco).trim() !== '') {
    return String(bloco).trim();
  }
  return '1';
}

/**
 * Ordena os itens mantendo sempre:
 * 1º Bloco 0 (Aquecimento)
 * 2º Blocos numerados (1, 2, 3, 4...)
 * 3º Blocos Cardiorrespiratórios (ou na ordem definida quando agrupados)
 */
export function ordenarItensTreinoPorBloco(itens = []) {
  if (!Array.isArray(itens)) return [];
  return [...itens].sort((a, b) => {
    const blocoA = normalizarBloco(a?.bloco);
    const blocoB = normalizarBloco(b?.bloco);

    const pesoCategoria = (item, bl) => {
      if (bl === '0') return 0; // Aquecimento sempre primeiro
      if (item?.tipo === 'cardio') return 2; // Cardio ao final
      return 1; // Blocos numerados no meio
    };

    const catA = pesoCategoria(a, blocoA);
    const catB = pesoCategoria(b, blocoB);
    if (catA !== catB) return catA - catB;

    if (catA === 1) {
      const numA = parseInt(blocoA, 10) || 1;
      const numB = parseInt(blocoB, 10) || 1;
      if (numA !== numB) return numA - numB;
    }

    return 0;
  });
}

export function extrairDuracaoAquecimento(treinoOuItens, duracaoExplicita = null) {
  if (duracaoExplicita !== null && duracaoExplicita !== undefined && duracaoExplicita !== '') {
    const n = Number(duracaoExplicita);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  if (treinoOuItens && !Array.isArray(treinoOuItens) && treinoOuItens.duracao_aquecimento_min) {
    return Number(treinoOuItens.duracao_aquecimento_min);
  }
  const itens = Array.isArray(treinoOuItens)
    ? treinoOuItens
    : Array.isArray(treinoOuItens?.itens_estruturados)
    ? treinoOuItens.itens_estruturados
    : [];
  const itemComDuracao = itens.find(
    (i) => normalizarBloco(i?.bloco) === '0' && i?.duracao_aquecimento_min
  );
  return itemComDuracao ? Number(itemComDuracao.duracao_aquecimento_min) : null;
}

export function formatarTextoTreino(itens = [], duracaoAquecimentoMin = null) {
  const durAq = extrairDuracaoAquecimento(itens, duracaoAquecimentoMin);
  const itensOrdenados = ordenarItensTreinoPorBloco(itens);

  return itensOrdenados
    .map((item) => {
      const blocoNorm = normalizarBloco(item.bloco);

      if (item.tipo === 'cardio') {
        const cabecalho = `[BLOCO ${blocoNorm === '0' ? 'AQUECIMENTO' : blocoNorm} • CARDIO] 🫀 ${
          item.titulo || 'Bloco Cardiorrespiratório'
        }${item.duracao_min ? ` (${item.duracao_min} min)` : ''}`;
        return `${cabecalho}\n${item.descricao || ''}`;
      }

      if (item.tipo === 'texto') {
        const prefixo =
          blocoNorm === '0'
            ? `[AQUECIMENTO${durAq ? ` • ${durAq} min` : ''} • TEXTO LIVRE] 🔥 ${item.titulo || 'Aquecimento'}`
            : `[BLOCO ${blocoNorm} • TEXTO] 📝 ${item.titulo || 'Orientação'}`;
        return `${prefixo}\n${item.descricao || ''}`;
      }

      const labelBloco =
        blocoNorm === '0'
          ? `[AQUECIMENTO${durAq ? ` • ${durAq} min` : ''}] 🔥`
          : `[BLOCO ${blocoNorm}] •`;

      let textoBase = `${labelBloco} ${item.nome} (${item.equipamento || 'Livre'})\n  ${item.series || '-'}x${
        item.repeticoes || '-'
      } | Carga: ${
        item.carga && item.carga !== '-' ? `${item.carga}kg` : '-'
      } | Intervalo: ${item.intervalo || '-'}\n  💡 Dica: ${item.pontos_atencao || 'Executar com controle'}`;
      if (item.observacao) textoBase += `\n  📝 Obs: ${item.observacao}`;
      return textoBase;
    })
    .join('\n\n');
}

export function verificarExercicioInativo(item, todosExercicios = []) {
  if (!item || item.tipo === 'cardio' || item.tipo === 'texto') return false;
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
    const blocoNorm = normalizarBloco(item.bloco);

    if (item.tipo === 'cardio' || item.tipo === 'texto') {
      return {
        ...item,
        id_unico: idUnico,
        tipo: item.tipo,
        exercicio_id: null,
        bloco: blocoNorm,
        ordem: idx + 1,
        titulo: item.titulo || null,
        descricao: item.descricao || '',
        duracao_min: item.duracao_min ? Number(item.duracao_min) : null,
        duracao_aquecimento_min: item.duracao_aquecimento_min ? Number(item.duracao_aquecimento_min) : null,
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
      bloco: blocoNorm,
      ordem: idx + 1,
      carga: manterCargas ? item.carga || '-' : '-',
      exercicio_inativo: inativo,
      duracao_aquecimento_min: item.duracao_aquecimento_min ? Number(item.duracao_aquecimento_min) : null,
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
    const blocoNorm = normalizarBloco(item.bloco);

    if (item.tipo === 'cardio' || item.tipo === 'texto') {
      return {
        treino_id: treinoId,
        exercicio_id: null,
        tipo: item.tipo,
        bloco: blocoNorm,
        ordem: idx + 1,
        series: null,
        repeticoes: null,
        carga: null,
        intervalo: null,
        observacao: null,
        titulo: item.titulo || null,
        descricao: item.descricao || '',
        duracao_min: item.duracao_min !== null && item.duracao_min !== '' && item.duracao_min !== undefined ? Number(item.duracao_min) : null,
      };
    }

    return {
      treino_id: treinoId,
      exercicio_id: item.exercicio_id || null,
      tipo: 'exercicio',
      bloco: blocoNorm,
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
 * Copia um mesociclo completo (incluindo Bloco 0 de Aquecimento, sua duração e blocos Cardio)
 * de forma independente e transacional (tudo ou nada, com rollback automático em caso de falha).
 * Ignora treinos que estejam na Lixeira (excluido_em != null).
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

  // 1. Busca os treinos do mesociclo de origem (filtrando ativos fora da lixeira)
  const { data: treinosOrigemBrutos, error: errBuscaTreinos } = await supabase
    .from('treinos')
    .select('*')
    .eq('mesociclo_id', mesocicloOrigemId)
    .order('criado_em', { ascending: true });

  if (errBuscaTreinos) {
    throw new Error('Erro ao ler treinos do mesociclo de origem: ' + errBuscaTreinos.message);
  }

  const treinosOrigem = (treinosOrigemBrutos || []).filter((t) => !t.excluido_em);

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

    for (const tOrig of treinosOrigem) {
      const itensOriginais = Array.isArray(tOrig.itens_estruturados) ? tOrig.itens_estruturados : [];
      const durAq = extrairDuracaoAquecimento(tOrig);
      const { itensNovos, exerciciosInativos } = clonarItensTreino(itensOriginais, manterCargas, todosExercicios);

      exerciciosInativos.forEach((nome) => todosInativos.add(nome));

      let textoTreinoNovo = tOrig.exercicios || '';
      if (itensNovos.length > 0) {
        textoTreinoNovo = formatarTextoTreino(itensNovos, durAq);
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
        duracao_aquecimento_min: durAq,
        observacoes_sensoriais: tOrig.observacoes_sensoriais || 'Copiado de mesociclo anterior',
      };

      let { data: treinoCriado, error: errTreino } = await supabase
        .from('treinos')
        .insert([payloadTreino])
        .select()
        .single();

      // Fallback caso a coluna duracao_aquecimento_min ainda não tenha sido aplicada no banco
      if (errTreino && errTreino.message?.includes('duracao_aquecimento_min')) {
        const { duracao_aquecimento_min: _omit, ...payloadSemDur } = payloadTreino;
        const retry = await supabase.from('treinos').insert([payloadSemDur]).select().single();
        treinoCriado = retry.data;
        errTreino = retry.error;
      }

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
    if (treinosCriadosIds.length > 0) {
      await supabase.from('itens_treino').delete().in('treino_id', treinosCriadosIds);
      await supabase.from('treinos').delete().in('id', treinosCriadosIds);
    }
    await supabase.from('mesociclos').delete().eq('id', novoMesociclo.id);
    throw erroTransacao;
  }
}

/**
 * Importa um treino específico para dentro de um mesociclo existente de forma transacional,
 * preservando o bloco 0 (Aquecimento) e sua duração.
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
  const durAq = extrairDuracaoAquecimento(treinoOrigem);
  const { itensNovos, exerciciosInativos } = clonarItensTreino(itensOriginais, manterCargas, todosExercicios);

  let textoTreinoNovo = treinoOrigem.exercicios || '';
  if (itensNovos.length > 0) {
    textoTreinoNovo = formatarTextoTreino(itensNovos, durAq);
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
    duracao_aquecimento_min: durAq,
    observacoes_sensoriais: treinoOrigem.observacoes_sensoriais || 'Importado pela Biblioteca Body Puzzle',
  };

  let { data: novoTreino, error: errTreino } = await supabase
    .from('treinos')
    .insert([payloadTreino])
    .select()
    .single();

  if (errTreino && errTreino.message?.includes('duracao_aquecimento_min')) {
    const { duracao_aquecimento_min: _omit, ...payloadSemDur } = payloadTreino;
    const retry = await supabase.from('treinos').insert([payloadSemDur]).select().single();
    novoTreino = retry.data;
    errTreino = retry.error;
  }

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

/**
 * Verifica se um registro excluído está dentro da janela de 30 dias da Lixeira (Seção 3.1).
 */
export function estaNaLixeiraRecente(excluidoEm) {
  if (!excluidoEm) return false;
  const dtExclusao = new Date(excluidoEm).getTime();
  if (Number.isNaN(dtExclusao)) return false;
  const limite30DiasMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - dtExclusao <= limite30DiasMs;
}

/**
 * Formata a mensagem de auditoria de edição durante a aula (Seção 9):
 * "Alterado durante a aula de DD/MM por [Nome do Professor]"
 */
export function formatarAuditoriaAula(treino) {
  if (!treino?.ultima_edicao_aula_em) return null;
  const dt = new Date(treino.ultima_edicao_aula_em);
  if (Number.isNaN(dt.getTime())) return null;
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const prof = treino.ultima_edicao_aula_por_nome || 'Professor';
  return `Alterado durante a aula de ${dia}/${mes} por ${prof}`;
}

/**
 * Calcula o progresso atual do mesociclo (ex: "Semana 3 de 8").
 */
export function calcularProgressoMesociclo(meso) {
  if (!meso) return null;
  const totalSemanas = Number(meso.semanas) || 0;
  if (!totalSemanas || !meso.data_inicio) {
    return totalSemanas ? `${totalSemanas} semanas` : null;
  }
  const inicio = new Date(`${String(meso.data_inicio).slice(0, 10)}T00:00:00`).getTime();
  const agora = Date.now();
  if (Number.isNaN(inicio)) return `Semana 1 de ${totalSemanas}`;
  const diffDias = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
  const semanaAtual = Math.min(totalSemanas, Math.max(1, Math.floor(diffDias / 7) + 1));
  return `Semana ${semanaAtual} de ${totalSemanas}`;
}

/**
 * Sugere automaticamente o próximo treino na sequência do mesociclo ativo
 * com base no último realizado (ignorando treinos com excluido_em != null).
 */
export function sugerirProximoTreino(treinosDisponiveis = [], mesociclosDoAluno = [], alunoId = '') {
  const ativos = (treinosDisponiveis || []).filter((t) => !t.excluido_em);
  if (ativos.length === 0) return null;

  const mesosAtivos = (mesociclosDoAluno || []).filter((m) => !m.excluido_em);
  const mesoAtivo = mesosAtivos.find((m) => m.status === 'Ativo') || mesosAtivos[0] || null;

  let candidatos = mesoAtivo
    ? ativos.filter((t) => String(t.mesociclo_id) === String(mesoAtivo.id))
    : ativos;

  if (candidatos.length === 0) {
    candidatos = ativos;
  }

  // Ordena na sequência natural (Treino A, Treino B, Treino C... ou ordem de criação)
  const ordenados = [...candidatos].sort((a, b) => {
    const titA = (a.titulo || '').trim();
    const titB = (b.titulo || '').trim();
    const cmpTit = titA.localeCompare(titB, 'pt-BR', { numeric: true });
    if (cmpTit !== 0) return cmpTit;
    return new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime();
  });

  if (ordenados.length === 1) return ordenados[0];

  // Verifica o último realizado pelo banco (ultima_execucao_em) ou localStorage
  let ultimoTreinoId = null;
  try {
    if (alunoId) {
      ultimoTreinoId = window.localStorage.getItem(`bodypuzzle_ultimo_treino_${alunoId}`);
    }
  } catch {
    // ignora erro de storage
  }

  const comExecucao = [...ordenados]
    .filter((t) => t.ultima_execucao_em)
    .sort((a, b) => new Date(b.ultima_execucao_em).getTime() - new Date(a.ultima_execucao_em).getTime());

  if (comExecucao.length > 0) {
    ultimoTreinoId = comExecucao[0].id;
  }

  if (ultimoTreinoId) {
    const idxUltimo = ordenados.findIndex((t) => String(t.id) === String(ultimoTreinoId));
    if (idxUltimo !== -1) {
      return ordenados[(idxUltimo + 1) % ordenados.length];
    }
  }

  return ordenados[0];
}
