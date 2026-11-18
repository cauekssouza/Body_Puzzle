import { supabase } from '../lib/superbase';
import { umRM, arred } from './cartaTrunfo.js';

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
 * Formata a mensagem de auditoria de edição durante a aula ou na tela de prescrição:
 * - Edição na tela de prescrição (Seção 6.3): "Editado em DD/MM por [Nome do Professor]"
 * - Edição durante a aula (Seção 9): "Alterado durante a aula de DD/MM por [Nome do Professor]"
 */
export function formatarAuditoriaAula(treino) {
  if (!treino) return null;

  // Se houver edição direta de prescrição mais recente (Seção 6.3)
  if (treino.ultima_edicao_em) {
    const dtEd = new Date(treino.ultima_edicao_em);
    const dtAula = treino.ultima_edicao_aula_em ? new Date(treino.ultima_edicao_aula_em) : null;
    if (!Number.isNaN(dtEd.getTime()) && (!dtAula || dtEd.getTime() >= dtAula.getTime())) {
      const dia = String(dtEd.getDate()).padStart(2, '0');
      const mes = String(dtEd.getMonth() + 1).padStart(2, '0');
      const prof = treino.ultima_edicao_por_nome || treino.ultima_edicao_aula_por_nome || 'Professor';
      return `Editado em ${dia}/${mes} por ${prof}`;
    }
  }

  if (!treino?.ultima_edicao_aula_em) return null;
  const dt = new Date(treino.ultima_edicao_aula_em);
  if (Number.isNaN(dt.getTime())) return null;
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const prof = treino.ultima_edicao_aula_por_nome || 'Professor';
  return `Alterado durante a aula de ${dia}/${mes} por ${prof}`;
}

export function formatarEdicaoDiretaTreino(treino) {
  if (!treino) return null;
  const dataRef = treino.ultima_edicao_em || treino.ultima_edicao_aula_em;
  if (!dataRef) return null;
  const dt = new Date(dataRef);
  if (Number.isNaN(dt.getTime())) return null;
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const prof = treino.ultima_edicao_por_nome || treino.ultima_edicao_aula_por_nome || 'Professor';
  return `Editado em ${dia}/${mes} por ${prof}`;
}

/**
 * Converte "YYYY-MM-DD" para timestamp UTC à meia-noite sem deslocamento de fuso.
 */
export function parseDataUTC(dataStr) {
  if (!dataStr) return null;
  const limpa = String(dataStr).slice(0, 10);
  const partes = limpa.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null;
  return Date.UTC(partes[0], partes[1] - 1, partes[2]);
}

export function formatarDataISO(msUTC) {
  const d = new Date(msUTC);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarDataCurtaDDMM(dataStr) {
  if (!dataStr) return '';
  const limpa = String(dataStr).slice(0, 10);
  const partes = limpa.split('-');
  if (partes.length !== 3) return limpa;
  return `${partes[2]}/${partes[1]}`;
}

export function formatarDataBR(dataStr) {
  if (!dataStr) return '-';
  const limpa = String(dataStr).slice(0, 10);
  const partes = limpa.split('-');
  if (partes.length !== 3) return limpa;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Seção 3.1: Cálculo da semana do mesociclo a partir do dia de início do mesociclo:
 * semana = floor((data da sessão - data de início do mesociclo) em dias / 7) + 1
 */
export function calcularSemanaMesociclo(dataSessaoStr, dataInicioMesocicloStr) {
  const msSessao = parseDataUTC(dataSessaoStr);
  const msInicio = parseDataUTC(dataInicioMesocicloStr);
  if (msSessao === null || msInicio === null) return 1;
  const diffDias = Math.round((msSessao - msInicio) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDias / 7) + 1;
}

/**
 * Verifica se uma sessão cai fora do período do mesociclo (Seção 3.1):
 * Se a data cair depois do fim do mesociclo (semana > totalSemanas) ou antes do início (semana < 1),
 * grava a semana calculada mesmo assim e mostra "Aula fora do período do mesociclo".
 */
export function verificarSessaoForaDoPeriodo(dataSessaoStr, mesociclo) {
  if (!mesociclo || !mesociclo.data_inicio) {
    return {
      foraDoPeriodo: false,
      semanaCalculada: 1,
      totalSemanas: Number(mesociclo?.semanas) || null,
      mensagem: null,
    };
  }
  const totalSemanas = Number(mesociclo.semanas) || 4;
  const semanaCalculada = calcularSemanaMesociclo(dataSessaoStr, mesociclo.data_inicio);
  const foraDoPeriodo = semanaCalculada < 1 || semanaCalculada > totalSemanas;

  return {
    foraDoPeriodo,
    semanaCalculada,
    totalSemanas,
    mensagem: foraDoPeriodo ? 'Aula fora do período do mesociclo' : null,
  };
}

/**
 * Calcula o progresso atual do mesociclo (ex: "Semana 3 de 8").
 */
export function calcularProgressoMesociclo(meso, dataReferenciaStr = null) {
  if (!meso) return null;
  const totalSemanas = Number(meso.semanas) || 0;
  if (!totalSemanas || !meso.data_inicio) {
    return totalSemanas ? `${totalSemanas} semanas` : null;
  }
  const hojeISO = dataReferenciaStr || new Date().toISOString().slice(0, 10);
  const semanaCalc = calcularSemanaMesociclo(hojeISO, meso.data_inicio);
  const semanaAtual = Math.min(totalSemanas, Math.max(1, semanaCalc));
  return `Semana ${semanaAtual} de ${totalSemanas}`;
}

/**
 * Ordena os treinos de um mesociclo respeitando o campo `ordem` (Seção 6.2),
 * ou ordem natural do título (Treino A, Treino B, Treino C...) e data de criação.
 */
export function ordenarTreinosDoMesociclo(treinosLista = []) {
  return [...treinosLista].sort((a, b) => {
    const ordA = a.ordem !== null && a.ordem !== undefined && a.ordem !== '' ? Number(a.ordem) : null;
    const ordB = b.ordem !== null && b.ordem !== undefined && b.ordem !== '' ? Number(b.ordem) : null;
    if (ordA !== null && ordB !== null && ordA !== ordB) return ordA - ordB;
    if (ordA !== null && ordB === null) return -1;
    if (ordA === null && ordB !== null) return 1;

    const titA = (a.titulo || '').trim();
    const titB = (b.titulo || '').trim();
    const cmpTit = titA.localeCompare(titB, 'pt-BR', { numeric: true });
    if (cmpTit !== 0) return cmpTit;
    return new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime();
  });
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

  const ordenados = ordenarTreinosDoMesociclo(candidatos);

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

// ============================================================================
// FUNÇÕES DE PROGRESSÃO DE CARGA, SEMANAS E GRADE DO MESOCICLO (SEÇÕES 2 A 6)
// ============================================================================

const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatarNumeroCarga(val) {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
  if (Number.isNaN(num)) return null;
  return Number.isInteger(num) ? String(num) : String(arred(num, 2)).replace('.', ',');
}

export function parseCargaNumerica(val) {
  if (val === null || val === undefined || val === '' || val === '-' || String(val).toUpperCase() === 'PC') {
    return null;
  }
  const limpo = String(val).replace(',', '.').replace(/[^\d.-]/g, '').trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isNaN(n) ? null : arred(n, 2);
}

/**
 * Seção 4.2: Extrai o primeiro número do campo de repetições ("8-10" -> 8, "30 s" -> 30, "5/lado" -> 5)
 * e identifica a unidade ('s' para tempo ou 'reps' para repetições).
 */
export function extrairPrimeiroNumeroRepeticoes(repeticoesStr) {
  if (repeticoesStr === null || repeticoesStr === undefined) {
    return { valor: null, unidade: 'reps' };
  }
  const str = String(repeticoesStr).trim();
  const match = str.match(/(\d+(?:[.,]\d+)?)/);
  const valor = match ? Number(match[1].replace(',', '.')) : null;
  const ehTempo = /\b(s|seg|segundos|min|minutos)\b/i.test(str) || /\d+\s*s\b/i.test(str);
  return {
    valor: valor !== null && !Number.isNaN(valor) ? valor : null,
    unidade: ehTempo ? 's' : 'reps',
  };
}

/**
 * Formata a célula de execução de um exercício na sessão:
 * Ex: "3×4 · 65 kg" ou "3×8 · PC" (quando sem carga externa).
 */
export function formatarCelulaItemSessao(itemSessao) {
  if (!itemSessao) return '—';
  const series = itemSessao.series ?? '-';
  const reps = itemSessao.repeticoes ?? '-';
  const cargaNum = parseCargaNumerica(itemSessao.carga_kg ?? itemSessao.carga);
  const cargaLabel =
    cargaNum !== null && cargaNum > 0
      ? `${formatarNumeroCarga(cargaNum)} kg`
      : 'PC';
  return `${series}×${reps} · ${cargaLabel}`;
}

/**
 * Seção 5.2 e 5.3: Compara o item realizado na semana com o da semana anterior.
 * Retorna setinha ↑ ↓ = e o texto discreto (ex.: "↑ 5 kg", "↓ 2 reps", "=").
 */
export function compararItemComSemanaAnterior(itemAtual, itemAnterior) {
  if (!itemAtual || !itemAnterior) return null;

  const cargaAtual = parseCargaNumerica(itemAtual.carga_kg ?? itemAtual.carga);
  const cargaAnt = parseCargaNumerica(itemAnterior.carga_kg ?? itemAnterior.carga);

  // Se pelo menos um dos dois tem carga externa (> 0), compara pela carga (kg)
  if ((cargaAtual !== null && cargaAtual > 0) || (cargaAnt !== null && cargaAnt > 0)) {
    const cAt = cargaAtual || 0;
    const cAn = cargaAnt || 0;
    const diff = arred(cAt - cAn, 2);
    if (diff > 0) {
      return {
        seta: '↑',
        texto: `↑ ${formatarNumeroCarga(diff)} kg`,
        delta: diff,
        unidade: 'kg',
        cor: '#15803d',
        fundo: '#dcfce7',
      };
    }
    if (diff < 0) {
      return {
        seta: '↓',
        texto: `↓ ${formatarNumeroCarga(Math.abs(diff))} kg`,
        delta: diff,
        unidade: 'kg',
        cor: '#b45309',
        fundo: '#fef3c7',
      };
    }
    return {
      seta: '=',
      texto: '=',
      delta: 0,
      unidade: 'kg',
      cor: '#64748b',
      fundo: '#f1f5f9',
    };
  }

  // Exercícios sem carga (PC): compara pelas repetições ou pelo tempo
  const { valor: repAt, unidade } = extrairPrimeiroNumeroRepeticoes(itemAtual.repeticoes);
  const { valor: repAn } = extrairPrimeiroNumeroRepeticoes(itemAnterior.repeticoes);

  if (repAt !== null && repAn !== null) {
    const diff = arred(repAt - repAn, 1);
    if (diff > 0) {
      return {
        seta: '↑',
        texto: `↑ ${formatarNumeroCarga(diff)} ${unidade}`,
        delta: diff,
        unidade,
        cor: '#15803d',
        fundo: '#dcfce7',
      };
    }
    if (diff < 0) {
      return {
        seta: '↓',
        texto: `↓ ${formatarNumeroCarga(Math.abs(diff))} ${unidade}`,
        delta: diff,
        unidade,
        cor: '#b45309',
        fundo: '#fef3c7',
      };
    }
    return {
      seta: '=',
      texto: '=',
      delta: 0,
      unidade,
      cor: '#64748b',
      fundo: '#f1f5f9',
    };
  }

  return {
    seta: '=',
    texto: '=',
    delta: 0,
    unidade: 'reps',
    cor: '#64748b',
    fundo: '#f1f5f9',
  };
}

/**
 * Busca a última carga registrada de um exercício para um aluno a partir das sessões salvas (Seção 2.1).
 * Retorna { cargaKg: number | null, textoPlaceholder: string, sessaoData: string | null }
 */
export function obterUltimaCargaExercicioAluno(sessoesDoAluno = [], exercicioId = null, exercicioNome = '') {
  const ativas = (sessoesDoAluno || [])
    .filter((s) => !s.excluido_em)
    .sort((a, b) => {
      const cmpData = String(b.data || '').localeCompare(String(a.data || ''));
      if (cmpData !== 0) return cmpData;
      return new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
    });

  const nomeNorm = normalizarTexto(exercicioNome);

  for (const sessao of ativas) {
    const itens = Array.isArray(sessao.sessao_itens) ? sessao.sessao_itens : [];
    const encontrado = itens.find((it) => {
      if (exercicioId && it.exercicio_id && String(it.exercicio_id) === String(exercicioId)) {
        return true;
      }
      if (nomeNorm && it.exercicio_nome && normalizarTexto(it.exercicio_nome) === nomeNorm) {
        return true;
      }
      return false;
    });

    if (encontrado) {
      const cargaNum = parseCargaNumerica(encontrado.carga_kg);
      if (cargaNum !== null && cargaNum > 0) {
        return {
          cargaKg: cargaNum,
          textoPlaceholder: `última: ${formatarNumeroCarga(cargaNum)} kg`,
          repeticoes: encontrado.repeticoes,
          series: encontrado.series,
          sessaoData: sessao.data,
        };
      }
      return {
        cargaKg: null,
        textoPlaceholder: 'última: PC',
        repeticoes: encontrado.repeticoes,
        series: encontrado.series,
        sessaoData: sessao.data,
      };
    }
  }

  return {
    cargaKg: null,
    textoPlaceholder: 'PC / carga (kg)',
    repeticoes: null,
    series: null,
    sessaoData: null,
  };
}

/**
 * Seção 5.1 e 5.2: Gera a faixa de semanas do mesociclo e os 7 dias de cada semana
 * (contados a partir do dia de início do mesociclo, não da segunda-feira do calendário).
 */
export function gerarFaixaSemanasMesociclo(mesociclo, sessoesDoMesociclo = [], dataReferenciaStr = null) {
  if (!mesociclo) return { semanaHoje: 1, totalSemanasPlanejadas: 4, semanas: [] };

  const totalSemanasPlanejadas = Math.max(1, Number(mesociclo.semanas) || 4);
  const dataInicioStr = mesociclo.data_inicio || new Date().toISOString().slice(0, 10);
  const msInicioMeso = parseDataUTC(dataInicioStr) ?? Date.now();
  const hojeStr = dataReferenciaStr || new Date().toISOString().slice(0, 10);

  const semanaHojeBruta = calcularSemanaMesociclo(hojeStr, dataInicioStr);
  const sessoesAtivas = (sessoesDoMesociclo || []).filter(
    (s) => !s.excluido_em && String(s.mesociclo_id) === String(mesociclo.id)
  );

  // Verifica se há sessões registradas além do número planejado de semanas (ex: semana 9 de 8)
  const maiorSemanaComSessao = sessoesAtivas.reduce((max, s) => {
    const sem = s.semana ?? calcularSemanaMesociclo(s.data, dataInicioStr);
    return Math.max(max, Number(sem) || 1);
  }, totalSemanasPlanejadas);

  const maxSemanasExibir = Math.max(totalSemanasPlanejadas, maiorSemanaComSessao);
  const freqEsperada = Number(mesociclo.frequencia) || null;
  const umDiaMs = 24 * 60 * 60 * 1000;

  const semanas = [];

  for (let s = 1; s <= maxSemanasExibir; s++) {
    const msIniSem = msInicioMeso + (s - 1) * 7 * umDiaMs;
    const msFimSem = msInicioMeso + (s * 7 - 1) * umDiaMs;
    const dataIniSem = formatarDataISO(msIniSem);
    const dataFimSem = formatarDataISO(msFimSem);

    const dIni = new Date(msIniSem);
    const dFim = new Date(msFimSem);
    const diaIniStr = String(dIni.getUTCDate()).padStart(2, '0');
    const mesIniStr = String(dIni.getUTCMonth() + 1).padStart(2, '0');
    const diaFimStr = String(dFim.getUTCDate()).padStart(2, '0');
    const mesFimStr = String(dFim.getUTCMonth() + 1).padStart(2, '0');

    const intervaloCurto =
      mesIniStr === mesFimStr
        ? `${diaIniStr}–${diaFimStr}/${mesFimStr}`
        : `${diaIniStr}/${mesIniStr}–${diaFimStr}/${mesFimStr}`;

    const sessoesDaSemana = sessoesAtivas
      .filter((sess) => {
        const semSess = sess.semana ?? calcularSemanaMesociclo(sess.data, dataInicioStr);
        return Number(semSess) === s;
      })
      .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

    const isSemanaAtual = s === semanaHojeBruta;
    const isPassada = s < semanaHojeBruta;
    const isFutura = s > semanaHojeBruta;
    const foraDoPeriodo = s > totalSemanasPlanejadas || s < 1;

    const qtdAulas = sessoesDaSemana.length;
    let statusFrequencia = 'cinza';
    let textoFrequencia = freqEsperada ? `${qtdAulas}/${freqEsperada}` : `${qtdAulas} aula${qtdAulas === 1 ? '' : 's'}`;

    if (freqEsperada) {
      if (qtdAulas >= freqEsperada) statusFrequencia = 'verde';
      else if (qtdAulas > 0) statusFrequencia = 'laranja';
      else statusFrequencia = 'cinza';
    } else if (qtdAulas > 0) {
      statusFrequencia = 'verde';
    }

    // Linha de 7 dias da semana (a partir do dia de início do mesociclo)
    const dias = [];
    for (let d = 0; d < 7; d++) {
      const msDia = msIniSem + d * umDiaMs;
      const dataDiaISO = formatarDataISO(msDia);
      const dtObj = new Date(msDia);
      const diaSemanaNome = DIAS_SEMANA_CURTOS[dtObj.getUTCDay()];
      const dataCurta = formatarDataCurtaDDMM(dataDiaISO);
      const sessoesNoDia = sessoesDaSemana.filter((sess) => String(sess.data).slice(0, 10) === dataDiaISO);

      dias.push({
        data: dataDiaISO,
        diaSemana: diaSemanaNome,
        dataCurta,
        rotuloDia: `${diaSemanaNome} ${dataCurta}`,
        sessoes: sessoesNoDia,
      });
    }

    semanas.push({
      numero: s,
      rotuloBotao: `S${s} ${intervaloCurto}`,
      intervaloCurto,
      dataInicio: dataIniSem,
      dataFim: dataFimSem,
      isSemanaAtual,
      isPassada,
      isFutura,
      foraDoPeriodo,
      qtdAulas,
      frequenciaEsperada: freqEsperada,
      textoFrequencia,
      statusFrequencia,
      sessoes: sessoesDaSemana,
      dias,
    });
  }

  return {
    semanaHoje: semanaHojeBruta,
    semanaAtualDestacada: Math.min(maxSemanasExibir, Math.max(1, semanaHojeBruta)),
    totalSemanasPlanejadas,
    semanas,
  };
}

/**
 * Seção 5.3: Constrói a Grade Completa de um Treino no Mesociclo
 * (exercícios nas linhas × semanas S1..SN nas colunas).
 * Regra de múltiplas sessões na mesma semana: mostra a sessão de MAIOR CARGA e o selo "2×" (ou N×).
 * Regra de histórico: se um exercício foi trocado ou removido do treino, as aulas antigas continuam
 * aparecendo com o exercício que foi feito nelas!
 */
export function construirGradeMesocicloPorTreino({
  treino,
  mesociclo,
  sessoesDoTreino = [],
  todosExercicios = [],
  dataReferenciaStr = null,
}) {
  const totalSemanasPlanejadas = Math.max(1, Number(mesociclo?.semanas) || 4);
  const dataInicioStr = mesociclo?.data_inicio || new Date().toISOString().slice(0, 10);
  const hojeStr = dataReferenciaStr || new Date().toISOString().slice(0, 10);
  const semanaAtual = calcularSemanaMesociclo(hojeStr, dataInicioStr);

  const sessoesAtivas = (sessoesDoTreino || []).filter(
    (s) => !s.excluido_em && String(s.treino_id) === String(treino?.id)
  );

  const maiorSemanaSessao = sessoesAtivas.reduce((max, s) => {
    const sem = s.semana ?? calcularSemanaMesociclo(s.data, dataInicioStr);
    return Math.max(max, Number(sem) || 1);
  }, totalSemanasPlanejadas);

  const numColunasSemanas = Math.max(totalSemanasPlanejadas, maiorSemanaSessao);

  // 1. Coleta os exercícios prescritos no treino (ignorando aquecimento de texto livre e cardio)
  const itensEstruturados = ordenarItensTreinoPorBloco(treino?.itens_estruturados || []);
  const linhasExercicios = [];
  const mapaLinhasPorChave = new Map();

  const obterChaveExercicio = (exercicioId, nomeEx) => {
    if (exercicioId) return `id:${String(exercicioId)}`;
    return `nome:${normalizarTexto(nomeEx)}`;
  };

  itensEstruturados.forEach((item) => {
    if (item.tipo === 'cardio' || item.tipo === 'texto') return;
    const chave = obterChaveExercicio(item.exercicio_id, item.nome);
    if (!mapaLinhasPorChave.has(chave)) {
      const exBib = item.exercicio_id
        ? todosExercicios.find((e) => String(e.id) === String(item.exercicio_id))
        : todosExercicios.find((e) => normalizarTexto(e.nome) === normalizarTexto(item.nome));

      const linha = {
        chave,
        exercicio_id: item.exercicio_id || exBib?.id || null,
        nome: item.nome || exBib?.nome || 'Exercício',
        bloco: normalizarBloco(item.bloco),
        prescrito: `${item.series || '-'}×${item.repeticoes || '-'}`,
        cargaPrescrita: item.carga && item.carga !== '-' ? `${item.carga} kg` : 'PC',
        itemPrescrito: item,
        historicoRemovidoDoTreino: false,
        celulasPorSemana: {},
      };
      mapaLinhasPorChave.set(chave, linha);
      linhasExercicios.push(linha);
    }
  });

  // 2. Verifica se existem exercícios feitos em sessões passadas deste treino que foram trocados/removidos depois (Seção 6.3)
  sessoesAtivas.forEach((sessao) => {
    const itensSess = Array.isArray(sessao.sessao_itens) ? sessao.sessao_itens : [];
    itensSess.forEach((itSess) => {
      const exBib = itSess.exercicio_id
        ? todosExercicios.find((e) => String(e.id) === String(itSess.exercicio_id))
        : null;
      const nomeEx = itSess.exercicio_nome || exBib?.nome || 'Exercício';
      const chave = obterChaveExercicio(itSess.exercicio_id, nomeEx);

      if (!mapaLinhasPorChave.has(chave)) {
        const linhaHistorica = {
          chave,
          exercicio_id: itSess.exercicio_id || null,
          nome: nomeEx,
          bloco: '1',
          prescrito: `${itSess.series || '-'}×${itSess.repeticoes || '-'}`,
          cargaPrescrita: '-',
          itemPrescrito: null,
          historicoRemovidoDoTreino: true,
          celulasPorSemana: {},
        };
        mapaLinhasPorChave.set(chave, linhaHistorica);
        linhasExercicios.push(linhaHistorica);
      }
    });
  });

  // 3. Preenche as células de cada exercício para as semanas 1..numColunasSemanas
  linhasExercicios.forEach((linha) => {
    let ultimoItemRealizadoSemanaAnterior = null;

    for (let s = 1; s <= numColunasSemanas; s++) {
      const sessoesDaSemana = sessoesAtivas.filter((sess) => {
        const sem = sess.semana ?? calcularSemanaMesociclo(sess.data, dataInicioStr);
        return Number(sem) === s;
      });

      // Coleta todas as execuções deste exercício na semana s
      const ocorrencias = [];
      sessoesDaSemana.forEach((sess) => {
        const itensSess = Array.isArray(sess.sessao_itens) ? sess.sessao_itens : [];
        const matchItem = itensSess.find((it) => {
          if (linha.exercicio_id && it.exercicio_id && String(it.exercicio_id) === String(linha.exercicio_id)) {
            return true;
          }
          const exBib = it.exercicio_id
            ? todosExercicios.find((e) => String(e.id) === String(it.exercicio_id))
            : null;
          const nomeIt = it.exercicio_nome || exBib?.nome || '';
          return normalizarTexto(nomeIt) === normalizarTexto(linha.nome);
        });

        if (matchItem) {
          ocorrencias.push({
            sessao: sess,
            item: matchItem,
            cargaNum: parseCargaNumerica(matchItem.carga_kg) ?? -1,
            repsNum: extrairPrimeiroNumeroRepeticoes(matchItem.repeticoes).valor ?? 0,
          });
        }
      });

      if (ocorrencias.length === 0) {
        const isFutura = s > semanaAtual;
        linha.celulasPorSemana[s] = {
          semana: s,
          vazia: true,
          isFutura,
          texto: isFutura ? '' : '—',
          qtdSessoes: 0,
          seloRepeticaoSemana: null,
          comparacao: null,
          ocorrencias: [],
          principal: null,
        };
      } else {
        // Se o mesmo treino foi feito duas vezes na mesma semana, escolhe a sessão de MAIOR CARGA (Seção 5.3)
        const ordenadasPorMaiorCarga = [...ocorrencias].sort((a, b) => {
          if (b.cargaNum !== a.cargaNum) return b.cargaNum - a.cargaNum;
          if (b.repsNum !== a.repsNum) return b.repsNum - a.repsNum;
          return String(b.sessao.data || '').localeCompare(String(a.sessao.data || ''));
        });

        const principal = ordenadasPorMaiorCarga[0];
        const textoCelula = formatarCelulaItemSessao(principal.item);
        const comparacao = ultimoItemRealizadoSemanaAnterior
          ? compararItemComSemanaAnterior(principal.item, ultimoItemRealizadoSemanaAnterior)
          : null;

        ultimoItemRealizadoSemanaAnterior = principal.item;

        linha.celulasPorSemana[s] = {
          semana: s,
          vazia: false,
          isFutura: false,
          texto: textoCelula,
          qtdSessoes: ocorrencias.length,
          seloRepeticaoSemana: ocorrencias.length >= 2 ? `${ocorrencias.length}×` : null,
          comparacao,
          ocorrencias,
          principal,
        };
      }
    }
  });

  return {
    numColunasSemanas,
    semanaAtual,
    linhasExercicios,
  };
}

/**
 * Seção 4.1 e 4.2: Calcula os pontos do gráfico, tabela e os 4 números em destaque da aba Progressão:
 * carga inicial, carga atual, variação (em kg e em %) e melhor carga.
 * Também calcula 1RM estimado (Epley, quando reps <= 10) e Volume da sessão (séries × reps × carga).
 */
export function calcularDadosProgressaoExercicio({
  sessoesDoAluno = [],
  exercicioId,
  exercicioNome = '',
  mesociclosMap = {},
}) {
  const nomeNorm = normalizarTexto(exercicioNome);
  const registros = [];

  (sessoesDoAluno || [])
    .filter((s) => !s.excluido_em)
    .forEach((sessao) => {
      const itens = Array.isArray(sessao.sessao_itens) ? sessao.sessao_itens : [];
      const itemMatch = itens.find((it) => {
        if (exercicioId && it.exercicio_id && String(it.exercicio_id) === String(exercicioId)) {
          return true;
        }
        if (nomeNorm && it.exercicio_nome && normalizarTexto(it.exercicio_nome) === nomeNorm) {
          return true;
        }
        return false;
      });

      if (itemMatch) {
        const meso = sessao.mesociclo_id ? mesociclosMap[String(sessao.mesociclo_id)] : null;
        const semana =
          sessao.semana ??
          (meso?.data_inicio ? calcularSemanaMesociclo(sessao.data, meso.data_inicio) : 1);
        const cargaNum = parseCargaNumerica(itemMatch.carga_kg);
        const { valor: repsNum, unidade: unidadeReps } = extrairPrimeiroNumeroRepeticoes(
          itemMatch.repeticoes
        );
        const seriesNum = Number(itemMatch.series) || 1;

        const umRmEstimado =
          cargaNum !== null && cargaNum > 0 && repsNum !== null && repsNum >= 1 && repsNum <= 10
            ? arred(umRM(cargaNum, repsNum), 1)
            : null;

        const volumeSessao =
          cargaNum !== null && cargaNum > 0 && repsNum !== null
            ? arred(seriesNum * repsNum * cargaNum, 1)
            : null;

        const dataCurta = formatarDataCurtaDDMM(sessao.data);
        const rotuloEixoX = semana ? `S${semana} · ${dataCurta}` : dataCurta;

        registros.push({
          sessaoId: sessao.id,
          sessao,
          itemSessao: itemMatch,
          data: sessao.data,
          dataBR: formatarDataBR(sessao.data),
          mesocicloId: sessao.mesociclo_id || null,
          mesocicloNome: meso?.nome || sessao.mesociclo_nome || 'Avulso',
          mesocicloDataInicio: meso?.data_inicio || null,
          semana,
          series: itemMatch.series,
          repeticoes: itemMatch.repeticoes,
          seriesXReps: `${itemMatch.series || '-'}×${itemMatch.repeticoes || '-'}`,
          cargaKg: cargaNum,
          cargaFormatada:
            cargaNum !== null && cargaNum > 0 ? `${formatarNumeroCarga(cargaNum)} kg` : 'PC',
          repsValor: repsNum,
          unidadeReps,
          umRmEstimado,
          volumeSessao,
          rotuloEixoX,
        });
      }
    });

  // Ordena cronologicamente (mais antigo -> mais recente) para o gráfico
  const pontosCronologicos = [...registros].sort((a, b) => {
    const cmp = String(a.data || '').localeCompare(String(b.data || ''));
    if (cmp !== 0) return cmp;
    return new Date(a.sessao?.criado_em || 0).getTime() - new Date(b.sessao?.criado_em || 0).getTime();
  });

  // Tabela abaixo do gráfico: mais recente primeiro (Seção 4.2)
  const tabelaMaisRecentePrimeiro = [...pontosCronologicos].reverse();

  const usaCargaExterna = pontosCronologicos.some((p) => p.cargaKg !== null && p.cargaKg > 0);
  const unidadeEixo = usaCargaExterna
    ? 'kg'
    : pontosCronologicos[0]?.unidadeReps === 's'
    ? 's'
    : 'reps';

  const obterValorMetrica = (ponto) => {
    if (usaCargaExterna) return ponto.cargaKg ?? 0;
    return ponto.repsValor ?? 0;
  };

  if (pontosCronologicos.length === 0) {
    return {
      usaCargaExterna: true,
      unidadeEixo: 'kg',
      pontosGrafico: [],
      tabelaSessoes: [],
      marcadoresMesociclo: [],
      destaques: {
        inicial: null,
        atual: null,
        variacaoAbs: null,
        variacaoPct: null,
        melhor: null,
        resumoTexto: 'Sem registros no período',
      },
    };
  }

  const valores = pontosCronologicos.map(obterValorMetrica);
  const valInicial = valores[0];
  const valAtual = valores[valores.length - 1];
  const valMelhor = Math.max(...valores);
  const variacaoAbs = arred(valAtual - valInicial, 2);
  const variacaoPct = valInicial > 0 ? arred(((valAtual - valInicial) / valInicial) * 100, 0) : 0;

  const fmtVal = (v) => `${formatarNumeroCarga(v)} ${unidadeEixo}`;
  const sinal = variacaoAbs > 0 ? '+' : '';
  const sinalPct = variacaoPct > 0 ? '+' : '';

  const resumoTexto = `${fmtVal(valInicial)} → ${fmtVal(valAtual)} · ${sinal}${formatarNumeroCarga(
    variacaoAbs
  )} ${unidadeEixo} (${sinalPct}${variacaoPct}%) · melhor ${fmtVal(valMelhor)}`;

  // Identifica linhas verticais tracejadas quando o período tiver mais de um mesociclo (Seção 4.2)
  const mesociclosVistos = new Set();
  const marcadoresMesociclo = [];
  pontosCronologicos.forEach((p, idx) => {
    const mKey = p.mesocicloId || p.mesocicloNome;
    if (mKey && !mesociclosVistos.has(mKey)) {
      mesociclosVistos.add(mKey);
      marcadoresMesociclo.push({
        indexPonto: idx,
        mesocicloId: p.mesocicloId,
        mesocicloNome: p.mesocicloNome,
        data: p.data,
      });
    }
  });

  return {
    usaCargaExterna,
    unidadeEixo,
    pontosGrafico: pontosCronologicos.map((p, idx) => ({
      ...p,
      index: idx,
      valorPrincipal: obterValorMetrica(p),
    })),
    tabelaSessoes: tabelaMaisRecentePrimeiro,
    marcadoresMesociclo: marcadoresMesociclo.length > 1 ? marcadoresMesociclo : [],
    destaques: {
      inicial: valInicial,
      atual: valAtual,
      variacaoAbs,
      variacaoPct,
      melhor: valMelhor,
      inicialFormatado: fmtVal(valInicial),
      atualFormatado: fmtVal(valAtual),
      variacaoFormatada: `${sinal}${formatarNumeroCarga(variacaoAbs)} ${unidadeEixo} (${sinalPct}${variacaoPct}%)`,
      melhorFormatado: fmtVal(valMelhor),
      resumoTexto,
    },
  };
}

/**
 * Seção 6.3: Recalcula a semana de todas as sessões de um mesociclo quando a data de início
 * ou o número de semanas mudar, e verifica se há sessões que ficarão fora do período.
 */
export function analisarImpactoEdicaoMesocicloNasSessoes(
  sessoesDoMesociclo = [],
  novaDataInicioStr,
  novoNumeroSemanas
) {
  const numSem = Math.max(1, Number(novoNumeroSemanas) || 4);
  const ativas = (sessoesDoMesociclo || []).filter((s) => !s.excluido_em);

  const sessoesRecalculadas = ativas.map((s) => {
    const novaSemana = calcularSemanaMesociclo(s.data, novaDataInicioStr);
    const ficaFora = novaSemana < 1 || novaSemana > numSem;
    return {
      ...s,
      semanaAnterior: s.semana,
      novaSemana,
      ficaFora,
    };
  });

  const sessoesFora = sessoesRecalculadas.filter((s) => s.ficaFora);

  // Agrupa por semana para montar o aviso exato da Seção 6.3:
  // "Existem 2 aulas registradas na semana 7. Elas vão aparecer como fora do período do mesociclo"
  let avisoForaDoPeriodo = null;
  if (sessoesFora.length > 0) {
    const porSemana = new Map();
    sessoesFora.forEach((s) => {
      porSemana.set(s.novaSemana, (porSemana.get(s.novaSemana) || 0) + 1);
    });
    const partes = Array.from(porSemana.entries()).map(([sem, qtd]) => {
      if (qtd === 1) return `Existe 1 aula registrada na semana ${sem}.`;
      return `Existem ${qtd} aulas registradas na semana ${sem}.`;
    });
    avisoForaDoPeriodo = `${partes.join(' ')} ${
      sessoesFora.length === 1
        ? 'Ela vai aparecer como fora do período do mesociclo.'
        : 'Elas vão aparecer como fora do período do mesociclo.'
    }`;
  }

  return {
    sessoesRecalculadas,
    sessoesFora,
    avisoForaDoPeriodo,
  };
}

// ============================================================================
// PERSISTÊNCIA DE SESSÕES NO SUPABASE COM FALLBACK LOCALSTORAGE (SEÇÃO 3)
// ============================================================================

const STORAGE_SESSOES_CACHE_KEY = 'bodypuzzle_sessoes_local_cache_v1';

function lerSessoesCacheLocal(alunoId = null) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_SESSOES_CACHE_KEY);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return [];
    return alunoId ? lista.filter((s) => String(s.aluno_id) === String(alunoId)) : lista;
  } catch {
    return [];
  }
}

function salvarSessaoNoCacheLocal(sessaoCompleta) {
  if (typeof window === 'undefined' || !window.localStorage || !sessaoCompleta?.id) return;
  try {
    const todas = lerSessoesCacheLocal(null);
    const idx = todas.findIndex((s) => String(s.id) === String(sessaoCompleta.id));
    if (idx >= 0) {
      todas[idx] = sessaoCompleta;
    } else {
      todas.unshift(sessaoCompleta);
    }
    window.localStorage.setItem(STORAGE_SESSOES_CACHE_KEY, JSON.stringify(todas));
  } catch {
    // ignora quota
  }
}

/**
 * Carrega todas as sessões (e seus sessao_itens) de um aluno, mesclando banco + cache local.
 */
export async function carregarSessoesDoAluno(alunoId) {
  if (!alunoId) return [];
  const cacheLocal = lerSessoesCacheLocal(alunoId);

  try {
    const { data: sessoesDb, error } = await supabase
      .from('sessoes')
      .select('*, sessao_itens(*)')
      .eq('aluno_id', alunoId)
      .order('data', { ascending: false });

    if (error) {
      return cacheLocal;
    }

    const mapa = new Map();
    cacheLocal.forEach((s) => mapa.set(String(s.id), s));
    (sessoesDb || []).forEach((s) => {
      const localExistente = mapa.get(String(s.id));
      mapa.set(String(s.id), {
        ...localExistente,
        ...s,
        sessao_itens: Array.isArray(s.sessao_itens)
          ? s.sessao_itens.map((it) => {
              const itLocal = localExistente?.sessao_itens?.find(
                (l) => String(l.id) === String(it.id) || String(l.exercicio_id) === String(it.exercicio_id)
              );
              return {
                ...itLocal,
                ...it,
              };
            })
          : localExistente?.sessao_itens || [],
      });
    });

    const unificadas = Array.from(mapa.values()).sort((a, b) => {
      const cmp = String(b.data || '').localeCompare(String(a.data || ''));
      if (cmp !== 0) return cmp;
      return new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
    });

    return unificadas;
  } catch {
    return cacheLocal;
  }
}

/**
 * Registra uma nova sessão de aula (Seções 2.2 e 3).
 * Grava em `sessoes` e `sessao_itens` apenas os exercícios marcados como feitos ou com carga digitada.
 */
export async function registrarSessaoDeAula({
  alunoId,
  mesociclo,
  treino,
  dataSessao,
  professorId = null,
  professorNome = 'Professor',
  observacao = null,
  itensRealizados = [],
  itensTextoFeitos = [],
}) {
  if (!alunoId) throw new Error('Aluno não informado para registrar a sessão.');
  if (!treino?.id) throw new Error('Treino não informado para registrar a sessão.');

  const dataFinal = dataSessao || new Date().toISOString().slice(0, 10);
  const mesocicloId = mesociclo?.id || treino?.mesociclo_id || null;
  const dataInicioMeso = mesociclo?.data_inicio || treino?.mesociclos?.data_inicio || null;
  const semanaCalc = dataInicioMeso ? calcularSemanaMesociclo(dataFinal, dataInicioMeso) : 1;

  const payloadSessao = {
    aluno_id: alunoId,
    mesociclo_id: mesocicloId,
    treino_id: treino.id,
    data: dataFinal,
    semana: semanaCalc,
    professor_id: professorId || null,
    observacao: observacao || null,
  };

  let sessaoCriada = null;

  // Tenta inserir na tabela sessoes do Supabase
  const { data: dbSessao, error: errSessao } = await supabase
    .from('sessoes')
    .insert([
      {
        ...payloadSessao,
        professor_nome: professorNome,
        itens_texto_feitos: itensTextoFeitos,
      },
    ])
    .select()
    .single();

  if (errSessao) {
    // Tenta sem as colunas extras caso o usuário tenha rodado o SQL enxuto da Seção 3
    const retry = await supabase.from('sessoes').insert([payloadSessao]).select().single();
    if (!retry.error && retry.data) {
      sessaoCriada = {
        ...retry.data,
        professor_nome: professorNome,
        itens_texto_feitos: itensTextoFeitos,
      };
    }
  } else {
    sessaoCriada = dbSessao;
  }

  const sessaoId =
    sessaoCriada?.id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`);

  const linhasItensBanco = itensRealizados
    .filter((it) => it.exercicio_id)
    .map((it, idx) => ({
      sessao_id: sessaoId,
      item_treino_id: it.item_treino_id || null,
      exercicio_id: it.exercicio_id,
      series: it.series !== undefined && it.series !== '' ? parseInt(it.series, 10) || null : null,
      repeticoes: it.repeticoes !== undefined && it.repeticoes !== null ? String(it.repeticoes) : null,
      carga_kg: parseCargaNumerica(it.carga_kg),
      observacao: it.observacao || null,
      ordem: idx + 1,
    }));

  let itensInseridosDb = [];
  if (sessaoCriada?.id && linhasItensBanco.length > 0) {
    const { data: dataItens, error: errItens } = await supabase
      .from('sessao_itens')
      .insert(linhasItensBanco)
      .select();

    if (errItens) {
      // Fallback sem a coluna `ordem` caso a tabela tenha apenas as colunas mínimas da Seção 3
      const linhasSemOrdem = linhasItensBanco.map(({ ordem: _o, item_treino_id: _it, ...rest }) => rest);
      const retryItens = await supabase.from('sessao_itens').insert(linhasSemOrdem).select();
      if (!retryItens.error && retryItens.data) {
        itensInseridosDb = retryItens.data;
      }
    } else if (dataItens) {
      itensInseridosDb = dataItens;
    }
  }

  // Atualiza ultima_execucao_em no treino
  await supabase
    .from('treinos')
    .update({ ultima_execucao_em: new Date().toISOString() })
    .eq('id', treino.id);

  const sessaoCompleta = {
    id: sessaoId,
    aluno_id: alunoId,
    mesociclo_id: mesocicloId,
    mesociclo_nome: mesociclo?.nome || treino?.mesociclos?.nome || null,
    treino_id: treino.id,
    treino_titulo: treino.titulo || 'Treino',
    data: dataFinal,
    semana: semanaCalc,
    professor_id: professorId,
    professor_nome: professorNome,
    observacao: observacao || null,
    itens_texto_feitos: itensTextoFeitos,
    excluido_em: null,
    criado_em: sessaoCriada?.criado_em || new Date().toISOString(),
    sessao_itens: itensRealizados.map((it, idx) => {
      const dbMatch = itensInseridosDb[idx] || {};
      return {
        id: dbMatch.id || `si-${sessaoId}-${idx}`,
        sessao_id: sessaoId,
        item_treino_id: it.item_treino_id || null,
        exercicio_id: it.exercicio_id,
        exercicio_nome: it.exercicio_nome || it.nome || 'Exercício',
        series: it.series !== undefined && it.series !== '' ? parseInt(it.series, 10) || null : null,
        repeticoes: it.repeticoes !== undefined && it.repeticoes !== null ? String(it.repeticoes) : null,
        carga_kg: parseCargaNumerica(it.carga_kg),
        observacao: it.observacao || null,
        ordem: idx + 1,
      };
    }),
  };

  salvarSessaoNoCacheLocal(sessaoCompleta);
  return sessaoCompleta;
}

/**
 * Seção 4.3: Atualiza uma sessão existente (data, semana recalculada, observação e itens).
 */
export async function atualizarSessaoDeAula({
  sessaoOriginal,
  novaData,
  mesociclo,
  novaObservacao,
  novosItens = [],
  itensTextoFeitos = null,
}) {
  if (!sessaoOriginal?.id) throw new Error('Sessão inválida para edição.');

  const dataFinal = novaData || sessaoOriginal.data;
  const dataInicioMeso = mesociclo?.data_inicio || null;
  const novaSemana = dataInicioMeso
    ? calcularSemanaMesociclo(dataFinal, dataInicioMeso)
    : sessaoOriginal.semana || 1;

  try {
    await supabase
      .from('sessoes')
      .update({
        data: dataFinal,
        semana: novaSemana,
        observacao: novaObservacao ?? sessaoOriginal.observacao ?? null,
        ...(itensTextoFeitos !== null ? { itens_texto_feitos: itensTextoFeitos } : {}),
      })
      .eq('id', sessaoOriginal.id);

    await supabase.from('sessao_itens').delete().eq('sessao_id', sessaoOriginal.id);

    const linhasInsert = novosItens
      .filter((it) => it.exercicio_id)
      .map((it) => ({
        sessao_id: sessaoOriginal.id,
        exercicio_id: it.exercicio_id,
        series: it.series !== undefined && it.series !== '' ? parseInt(it.series, 10) || null : null,
        repeticoes: it.repeticoes !== undefined && it.repeticoes !== null ? String(it.repeticoes) : null,
        carga_kg: parseCargaNumerica(it.carga_kg),
        observacao: it.observacao || null,
      }));

    if (linhasInsert.length > 0) {
      await supabase.from('sessao_itens').insert(linhasInsert);
    }
  } catch {
    // Continua com atualização no cache local caso offline
  }

  const sessaoAtualizada = {
    ...sessaoOriginal,
    data: dataFinal,
    semana: novaSemana,
    observacao: novaObservacao ?? sessaoOriginal.observacao ?? null,
    ...(itensTextoFeitos !== null ? { itens_texto_feitos: itensTextoFeitos } : {}),
    sessao_itens: novosItens.map((it, idx) => ({
      ...it,
      id: it.id || `si-${sessaoOriginal.id}-${idx}`,
      sessao_id: sessaoOriginal.id,
      series: it.series !== undefined && it.series !== '' ? parseInt(it.series, 10) || null : null,
      repeticoes: it.repeticoes !== undefined && it.repeticoes !== null ? String(it.repeticoes) : null,
      carga_kg: parseCargaNumerica(it.carga_kg),
      ordem: idx + 1,
    })),
  };

  salvarSessaoNoCacheLocal(sessaoAtualizada);
  return sessaoAtualizada;
}

/**
 * Seção 4.3: Exclusão suave (lixeira de 30 dias) e restauração de uma sessão registrada.
 */
export async function alterarExclusaoSuaveSessao(sessaoObj, excluir = true) {
  if (!sessaoObj?.id) throw new Error('Sessão inválida.');
  const novoValor = excluir ? new Date().toISOString() : null;

  try {
    await supabase.from('sessoes').update({ excluido_em: novoValor }).eq('id', sessaoObj.id);
  } catch {
    // fallback cache local
  }

  const atualizada = {
    ...sessaoObj,
    excluido_em: novoValor,
  };
  salvarSessaoNoCacheLocal(atualizada);
  return atualizada;
}

/**
 * Seção 6.3: Recalcula e persiste no banco a semana de todas as sessões de um mesociclo
 * quando a data de início do mesociclo muda.
 */
export async function recalcularEPersistirSemanasMesociclo(mesocicloId, novaDataInicioStr, sessoesAtuais = []) {
  if (!mesocicloId || !novaDataInicioStr) return [];
  const doMeso = (sessoesAtuais || []).filter(
    (s) => String(s.mesociclo_id) === String(mesocicloId)
  );

  const atualizadas = [];
  for (const sess of doMeso) {
    const novaSemana = calcularSemanaMesociclo(sess.data, novaDataInicioStr);
    if (Number(sess.semana) !== Number(novaSemana)) {
      try {
        await supabase.from('sessoes').update({ semana: novaSemana }).eq('id', sess.id);
      } catch {
        // ignora erro de rede
      }
    }
    const mod = { ...sess, semana: novaSemana };
    salvarSessaoNoCacheLocal(mod);
    atualizadas.push(mod);
  }
  return atualizadas;
}

