import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import {
  normalizarTexto,
  normalizarBloco,
  ordenarItensTreinoPorBloco,
  extrairDuracaoAquecimento,
  formatarTextoTreino,
  salvarItensNaTabelaItensTreino,
  formatarAuditoriaAula,
  calcularProgressoMesociclo,
  sugerirProximoTreino,
} from '../utils/prescricaoUtils';

const CORES_ALUNOS = [
  { primaria: '#4460B8', fundoClaro: '#eff6ff', bordaClara: '#bfdbfe', nomeCor: 'Azul' },
  { primaria: '#2DAFAB', fundoClaro: '#f0fdfa', bordaClara: '#99f6e4', nomeCor: 'Verde-água' },
  { primaria: '#E17900', fundoClaro: '#fff7ed', bordaClara: '#fed7aa', nomeCor: 'Laranja' },
  { primaria: '#7C3AED', fundoClaro: '#f5f3ff', bordaClara: '#ddd6fe', nomeCor: 'Roxo' },
];

const STORAGE_SESSAO_KEY = 'bodypuzzle_sessao_exposicao_ativa_v1';

function obterChaveRascunho(alunoId, treinoId) {
  return `bodypuzzle_rascunho_exposicao_${alunoId}_${treinoId}`;
}

function lerRascunhoStorage(alunoId, treinoId) {
  if (!alunoId || !treinoId) return null;
  try {
    const raw = window.localStorage.getItem(obterChaveRascunho(alunoId, treinoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.itens)) {
      return parsed;
    }
  } catch {
    // ignora erro de parse
  }
  return null;
}

function salvarRascunhoStorage(alunoId, treinoId, dadosRascunho) {
  if (!alunoId || !treinoId) return;
  try {
    window.localStorage.setItem(
      obterChaveRascunho(alunoId, treinoId),
      JSON.stringify({
        ...dadosRascunho,
        atualizadoEm: new Date().toISOString(),
      })
    );
  } catch {
    // ignora quota
  }
}

function limparRascunhoStorage(alunoId, treinoId) {
  if (!alunoId || !treinoId) return;
  try {
    window.localStorage.removeItem(obterChaveRascunho(alunoId, treinoId));
  } catch {
    // ignora
  }
}

function serializarItemComparacao(item) {
  const bloco = normalizarBloco(item?.bloco);
  if (item?.tipo === 'cardio' || item?.tipo === 'texto') {
    return JSON.stringify({
      tipo: item.tipo,
      bloco,
      titulo: (item.titulo || '').trim(),
      descricao: item.descricao || '',
      duracao_min: item.duracao_min ? Number(item.duracao_min) : null,
    });
  }
  return JSON.stringify({
    tipo: 'exercicio',
    exercicio_id: item?.exercicio_id ? String(item.exercicio_id) : '',
    bloco,
    nome: (item?.nome || '').trim(),
    series: String(item?.series || '').trim(),
    repeticoes: String(item?.repeticoes || '').trim(),
    carga: String(item?.carga || '-').trim(),
    intervalo: String(item?.intervalo || '-').trim(),
    observacao: String(item?.observacao || '').trim(),
  });
}

function garantirIdsNosItens(itens = []) {
  return ordenarItensTreinoPorBloco(itens).map((item, idx) => ({
    ...item,
    id_unico: item.id_unico || Date.now() + idx + Math.floor(Math.random() * 100000),
    bloco: normalizarBloco(item.bloco),
    ordem: idx + 1,
  }));
}

/**
 * Calcula dinamicamente o tamanho da fonte do nome do exercício:
 * Base = 28px (legível a 2-3 metros). Se houver muitos itens ou múltiplas colunas,
 * reduz progressivamente até o mínimo de 20px antes de precisar de rolagem.
 */
function calcularFonteExercicioPx(qtdItens, numColunasVisiveis) {
  let base = 28;
  if (numColunasVisiveis === 2) base = 26;
  if (numColunasVisiveis === 3) base = 24;
  if (numColunasVisiveis >= 4) base = 22;

  if (qtdItens > 10) {
    base -= Math.ceil((qtdItens - 10) * 1.2);
  } else if (qtdItens > 6) {
    base -= Math.ceil((qtdItens - 6) * 0.8);
  }

  return Math.max(20, Math.min(28, base));
}

export default function ExposicaoTreino() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const containerFullscreenRef = useRef(null);
  const wakeLockRef = useRef(null);

  const [carregando, setCarregando] = useState(true);
  const [professorNome, setProfessorNome] = useState('Professor');
  const [professorId, setProfessorId] = useState(null);

  const [alunos, setAlunos] = useState([]);
  const [mesociclos, setMesociclos] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);

  // Configuração de 1 a 4 alunos
  const [qtdAlunosAula, setQtdAlunosAula] = useState(1);
  const [slotsConfig, setSlotsConfig] = useState([
    { alunoId: '', treinoId: '', sugeridoId: '' },
    { alunoId: '', treinoId: '', sugeridoId: '' },
    { alunoId: '', treinoId: '', sugeridoId: '' },
    { alunoId: '', treinoId: '', sugeridoId: '' },
  ]);

  // Estado da exposição ativa
  const [exposicaoAtiva, setExposicaoAtiva] = useState(false);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const [wakeLockAtivo, setWakeLockAtivo] = useState(false);
  const [colunaExpandidaIdx, setColunaExpandidaIdx] = useState(null);

  // Estado por coluna ativa na exposição:
  // chave = `${alunoId}_${treinoId}` -> {
  //   modoEdicao: boolean,
  //   itensAtuais: Array,
  //   itensOriginais: Array,
  //   duracaoAquecimentoAtual: string,
  //   duracaoAquecimentoOriginal: string,
  //   concluidosMap: { [id_unico]: boolean },
  //   adicionandoItemTipo: null | 'exercicio' | 'texto_aquecimento' | 'cardio',
  //   trocandoExercicioItemId: null | number,
  //   termoBuscaEx: string,
  // }
  const [colunasState, setColunasState] = useState({});

  // Modal de confirmação de salvar edição de um aluno
  const [confirmacaoSalvarCol, setConfirmacaoSalvarCol] = useState(null);
  const [salvandoColuna, setSalvandoColuna] = useState(false);

  // Modal ao tentar sair com rascunhos não salvos ("Salvar, descartar ou continuar editando?")
  const [modalSaidaRascunhos, setModalSaidaRascunhos] = useState(false);

  // Modal de visualização de mídia do exercício
  const [midiaModal, setMidiaModal] = useState(null);

  // 1. Carregamento inicial de dados do Supabase
  useEffect(() => {
    async function carregarBase() {
      setCarregando(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setProfessorId(session.user.id);
        const emailPrefix = session.user.email ? session.user.email.split('@')[0] : 'Professor';
        const nomeMeta = session.user.user_metadata?.nome || session.user.user_metadata?.full_name;
        setProfessorNome(nomeMeta || emailPrefix);
      }

      const [resAlunos, resMesos, resTreinos, resExercicios] = await Promise.all([
        supabase.from('alunos').select('*').order('nome', { ascending: true }),
        supabase.from('mesociclos').select('*').order('data_inicio', { ascending: false }),
        supabase
          .from('treinos')
          .select('*, mesociclos(id, nome, status, data_inicio, semanas, data_fim, excluido_em)')
          .order('criado_em', { ascending: false }),
        supabase.from('exercicios').select('*').order('nome', { ascending: true }),
      ]);

      const alunosAtivos = (resAlunos.data || []).filter((a) => a.ativo !== false);
      const mesosAtivos = (resMesos.data || []).filter((m) => !m.excluido_em);
      const treinosAtivos = (resTreinos.data || []).filter(
        (t) => !t.excluido_em && !t.mesociclos?.excluido_em
      );
      const exAtivos = (resExercicios.data || []).filter((e) => e.status !== 'Inativo');

      setAlunos(alunosAtivos);
      setMesociclos(mesosAtivos);
      setTreinos(treinosAtivos);
      setBiblioteca(exAtivos);

      // Verifica se veio com ?alunoId=...&treinoId=... na URL
      const urlAlunoId = searchParams.get('alunoId');
      const urlTreinoId = searchParams.get('treinoId');

      if (urlAlunoId) {
        const treinosDoAluno = treinosAtivos.filter((t) => String(t.aluno_id) === String(urlAlunoId));
        const mesosDoAluno = mesosAtivos.filter((m) => String(m.aluno_id) === String(urlAlunoId));
        const sugerido = sugerirProximoTreino(treinosDoAluno, mesosDoAluno, urlAlunoId);
        const treinoEscolhidoId =
          urlTreinoId && treinosDoAluno.some((t) => String(t.id) === String(urlTreinoId))
            ? urlTreinoId
            : sugerido?.id || treinosDoAluno[0]?.id || '';

        const novosSlots = [
          {
            alunoId: String(urlAlunoId),
            treinoId: String(treinoEscolhidoId),
            sugeridoId: sugerido ? String(sugerido.id) : '',
          },
          { alunoId: '', treinoId: '', sugeridoId: '' },
          { alunoId: '', treinoId: '', sugeridoId: '' },
          { alunoId: '', treinoId: '', sugeridoId: '' },
        ];
        setSlotsConfig(novosSlots);
        setQtdAlunosAula(1);

        if (urlTreinoId && treinoEscolhidoId) {
          inicializarEstadoColunas([novosSlots[0]], treinosAtivos);
          setExposicaoAtiva(true);
        }
      } else {
        // Verifica se havia uma sessão de exposição ativa no localStorage (para sobreviver a reload / F5 no iPad)
        try {
          const sessaoSalvaRaw = window.localStorage.getItem(STORAGE_SESSAO_KEY);
          if (sessaoSalvaRaw) {
            const sessaoSalva = JSON.parse(sessaoSalvaRaw);
            if (sessaoSalva?.ativa && Array.isArray(sessaoSalva.slots) && sessaoSalva.slots.length > 0) {
              const slotsValidos = sessaoSalva.slots.filter(
                (s) =>
                  s.alunoId &&
                  s.treinoId &&
                  treinosAtivos.some((t) => String(t.id) === String(s.treinoId))
              );
              if (slotsValidos.length > 0) {
                const preenchidos = [0, 1, 2, 3].map(
                  (i) => slotsValidos[i] || { alunoId: '', treinoId: '', sugeridoId: '' }
                );
                setSlotsConfig(preenchidos);
                setQtdAlunosAula(slotsValidos.length);
                inicializarEstadoColunas(slotsValidos, treinosAtivos);
                setExposicaoAtiva(true);
              }
            }
          }
        } catch {
          // ignora erro de storage
        }
      }

      setCarregando(false);
    }

    carregarBase();
  }, []);

  // Inicializa o estado das colunas mesclando com rascunhos salvos no localStorage (Seção 9)
  const inicializarEstadoColunas = useCallback((slotsAtivos, listaTreinosRef = treinos) => {
    const novoMapa = {};

    slotsAtivos.forEach((slot) => {
      if (!slot.alunoId || !slot.treinoId) return;
      const chave = `${slot.alunoId}:::${slot.treinoId}`;
      const treinoObj = listaTreinosRef.find((t) => String(t.id) === String(slot.treinoId));
      if (!treinoObj) return;

      const itensOriginais = garantirIdsNosItens(treinoObj.itens_estruturados || []);
      const durOrig = extrairDuracaoAquecimento(treinoObj);
      const durOrigStr = durOrig ? String(durOrig) : '';

      const rascunho = lerRascunhoStorage(slot.alunoId, slot.treinoId);
      const itensAtuais = rascunho?.itens ? garantirIdsNosItens(rascunho.itens) : itensOriginais;
      const durAtualStr =
        rascunho?.duracaoAquecimentoMin !== undefined
          ? String(rascunho.duracaoAquecimentoMin || '')
          : durOrigStr;

      novoMapa[chave] = {
        modoEdicao: Boolean(rascunho?.modoEdicao),
        itensAtuais,
        itensOriginais,
        duracaoAquecimentoAtual: durAtualStr,
        duracaoAquecimentoOriginal: durOrigStr,
        concluidosMap: rascunho?.concluidosMap || {},
        adicionandoItemTipo: null,
        novoItemForm: {
          bloco: '1',
          exercicioId: '',
          termoBusca: '',
          series: '',
          repeticoes: '',
          carga: '',
          intervalo: '',
          observacao: '',
          titulo: '',
          descricao: '',
          duracao_min: '',
        },
        trocandoExercicioItemId: null,
        termoTrocaExercicio: '',
      };
    });

    setColunasState(novoMapa);
  }, [treinos]);

  // 2. Screen Wake Lock API com reativação automática em visibilitychange (Seção 8)
  const solicitarWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignora
        }
      }
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLockAtivo(true);
      lock.addEventListener('release', () => {
        setWakeLockAtivo(false);
      });
    } catch {
      setWakeLockAtivo(false);
    }
  }, []);

  useEffect(() => {
    if (!exposicaoAtiva) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setWakeLockAtivo(false);
      return;
    }

    solicitarWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && exposicaoAtiva) {
        solicitarWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [exposicaoAtiva, solicitarWakeLock]);

  // 3. Fullscreen API com fallback webkitRequestFullscreen para Safari / iPadOS (Seção 8)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      setEmTelaCheia(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  async function entrarTelaCheia() {
    const el = containerFullscreenRef.current || document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      // Caso o navegador restrinja, mantém o overlay fixo em 100vw/100vh
    }
  }

  async function sairTelaCheia() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch {
      // ignora
    }
  }

  async function alternarTelaCheia() {
    if (emTelaCheia) {
      await sairTelaCheia();
    } else {
      await entrarTelaCheia();
    }
  }

  // Verifica se uma coluna específica possui alterações não salvas em relação ao original
  function colunaTemAlteracoesNaoSalvas(chave) {
    const stCol = colunasState[chave];
    if (!stCol) return false;
    if (String(stCol.duracaoAquecimentoAtual || '') !== String(stCol.duracaoAquecimentoOriginal || '')) {
      return true;
    }
    const orig = stCol.itensOriginais || [];
    const atual = stCol.itensAtuais || [];
    if (orig.length !== atual.length) return true;
    for (let i = 0; i < atual.length; i++) {
      if (serializarItemComparacao(atual[i]) !== serializarItemComparacao(orig[i])) {
        return true;
      }
    }
    return false;
  }

  function itemFoiModificado(chave, item) {
    const stCol = colunasState[chave];
    if (!stCol) return false;
    const origItem = (stCol.itensOriginais || []).find(
      (o) => String(o.id_unico) === String(item.id_unico)
    );
    if (!origItem) return true; // item novo adicionado na exposição
    return serializarItemComparacao(item) !== serializarItemComparacao(origItem);
  }

  const slotsAtivosNaAula = slotsConfig
    .slice(0, qtdAlunosAula)
    .filter((s) => s.alunoId && s.treinoId);

  const chavesComRascunhoPendente = slotsAtivosNaAula
    .map((s) => `${s.alunoId}:::${s.treinoId}`)
    .filter((chave) => colunaTemAlteracoesNaoSalvas(chave));

  // Alerta nativo beforeunload caso tente fechar a aba com rascunhos pendentes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (exposicaoAtiva && chavesComRascunhoPendente.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [exposicaoAtiva, chavesComRascunhoPendente.length]);

  // --- CONFIGURAÇÃO DE SLOTS DE ALUNOS E SUGESTÃO AUTOMÁTICA DE PRÓXIMO TREINO ---
  function handleSelecionarAlunoNoSlot(slotIdx, novoAlunoId) {
    const treinosDoAluno = treinos.filter((t) => String(t.aluno_id) === String(novoAlunoId));
    const mesosDoAluno = mesociclos.filter((m) => String(m.aluno_id) === String(novoAlunoId));
    const sugerido = sugerirProximoTreino(treinosDoAluno, mesosDoAluno, novoAlunoId);

    setSlotsConfig((prev) => {
      const copia = [...prev];
      copia[slotIdx] = {
        alunoId: novoAlunoId,
        treinoId: sugerido ? String(sugerido.id) : treinosDoAluno[0] ? String(treinosDoAluno[0].id) : '',
        sugeridoId: sugerido ? String(sugerido.id) : '',
      };
      return copia;
    });
  }

  function handleSelecionarTreinoNoSlot(slotIdx, novoTreinoId) {
    setSlotsConfig((prev) => {
      const copia = [...prev];
      copia[slotIdx] = {
        ...copia[slotIdx],
        treinoId: novoTreinoId,
      };
      return copia;
    });
  }

  async function handleIniciarExposicao() {
    const validos = slotsConfig.slice(0, qtdAlunosAula).filter((s) => s.alunoId && s.treinoId);
    if (validos.length === 0) {
      return window.alert('Selecione pelo menos 1 aluno e o respectivo treino para iniciar a exposição.');
    }

    inicializarEstadoColunas(validos, treinos);
    setColunaExpandidaIdx(null);
    setExposicaoAtiva(true);

    // Persiste a sessão ativa no localStorage e registra o treino como último realizado de cada aluno
    try {
      window.localStorage.setItem(
        STORAGE_SESSAO_KEY,
        JSON.stringify({ ativa: true, slots: validos })
      );
      validos.forEach((s) => {
        window.localStorage.setItem(`bodypuzzle_ultimo_treino_${s.alunoId}`, String(s.treinoId));
      });
    } catch {
      // ignora
    }

    // Atualiza ultima_execucao_em de forma assíncrona no banco (sem bloquear a aula)
    validos.forEach((s) => {
      supabase
        .from('treinos')
        .update({ ultima_execucao_em: new Date().toISOString() })
        .eq('id', s.treinoId)
        .then(() => {});
    });

    await entrarTelaCheia();
  }

  function atualizarColuna(chave, fnAtualizadora, persistirStorage = true) {
    setColunasState((prev) => {
      const atual = prev[chave];
      if (!atual) return prev;
      const novo = fnAtualizadora(atual);

      if (persistirStorage) {
        const [alunoId, treinoId] = chave.split(':::');
        salvarRascunhoStorage(alunoId, treinoId, {
          itens: novo.itensAtuais,
          duracaoAquecimentoMin: novo.duracaoAquecimentoAtual,
          modoEdicao: novo.modoEdicao,
          concluidosMap: novo.concluidosMap,
        });
      }

      return {
        ...prev,
        [chave]: novo,
      };
    });
  }

  // --- PROGRESSO VISUAL LOCAL (TOCAR NO EXERCÍCIO PARA MARCAR/DESMARCAR CONCLUÍDO) ---
  function toggleExercicioConcluido(chave, idUnico) {
    atualizarColuna(chave, (col) => ({
      ...col,
      concluidosMap: {
        ...col.concluidosMap,
        [idUnico]: !col.concluidosMap?.[idUnico],
      },
    }));
  }

  // --- OPERAÇÕES DE EDIÇÃO DURANTE A EXPOSIÇÃO (SEÇÃO 9) ---
  function atualizarCampoItem(chave, idUnico, campo, valor) {
    atualizarColuna(chave, (col) => {
      const novosItens = col.itensAtuais.map((item) => {
        if (String(item.id_unico) !== String(idUnico)) return item;
        return {
          ...item,
          [campo]: valor,
        };
      });
      return {
        ...col,
        itensAtuais: ordenarItensTreinoPorBloco(novosItens),
      };
    });
  }

  function trocarExercicioDoItem(chave, idUnico, novoExBiblioteca) {
    const equipTexto =
      Array.isArray(novoExBiblioteca.equipamentos) && novoExBiblioteca.equipamentos.length > 0
        ? novoExBiblioteca.equipamentos.join(', ')
        : novoExBiblioteca.equipamento_original || 'Livre';

    atualizarColuna(chave, (col) => ({
      ...col,
      trocandoExercicioItemId: null,
      termoTrocaExercicio: '',
      itensAtuais: col.itensAtuais.map((item) => {
        if (String(item.id_unico) !== String(idUnico)) return item;
        return {
          ...item,
          exercicio_id: novoExBiblioteca.id,
          nome: novoExBiblioteca.nome,
          padrao: novoExBiblioteca.padrao,
          subpadrao: novoExBiblioteca.subpadrao || null,
          nivel: novoExBiblioteca.nivel,
          equipamento: equipTexto,
          midia_url: novoExBiblioteca.midia_url || null,
          pontos_atencao: novoExBiblioteca.pontos_atencao || item.pontos_atencao,
        };
      }),
    }));
  }

  function moverItemColuna(chave, idUnico, direcao) {
    atualizarColuna(chave, (col) => {
      const lista = [...col.itensAtuais];
      const idx = lista.findIndex((i) => String(i.id_unico) === String(idUnico));
      if (idx === -1) return col;
      const novoIdx = idx + direcao;
      if (novoIdx < 0 || novoIdx >= lista.length) return col;
      const [removido] = lista.splice(idx, 1);
      lista.splice(novoIdx, 0, removido);
      return {
        ...col,
        itensAtuais: ordenarItensTreinoPorBloco(lista),
      };
    });
  }

  function removerItemColuna(chave, idUnico) {
    atualizarColuna(chave, (col) => ({
      ...col,
      itensAtuais: col.itensAtuais.filter((i) => String(i.id_unico) !== String(idUnico)),
    }));
  }

  function inserirNovoItemNaColuna(chave) {
    const stCol = colunasState[chave];
    if (!stCol) return;
    const f = stCol.novoItemForm;
    const tipoAdicao = stCol.adicionandoItemTipo;

    let novoItem = null;
    const idUnico = Date.now() + Math.floor(Math.random() * 100000);

    if (tipoAdicao === 'exercicio') {
      const exBib = biblioteca.find((e) => String(e.id) === String(f.exercicioId));
      if (!exBib || !f.series || !f.repeticoes) {
        return window.alert('Selecione um exercício e preencha Séries e Repetições/Tempo.');
      }
      const equipTexto =
        Array.isArray(exBib.equipamentos) && exBib.equipamentos.length > 0
          ? exBib.equipamentos.join(', ')
          : exBib.equipamento_original || 'Livre';

      novoItem = {
        id_unico: idUnico,
        tipo: 'exercicio',
        exercicio_id: exBib.id,
        bloco: normalizarBloco(f.bloco),
        nome: exBib.nome,
        padrao: exBib.padrao,
        subpadrao: exBib.subpadrao || null,
        nivel: exBib.nivel,
        equipamento: equipTexto,
        midia_url: exBib.midia_url || null,
        series: f.series,
        repeticoes: f.repeticoes,
        carga: f.carga || '-',
        intervalo: f.intervalo || '-',
        observacao: f.observacao || '',
        pontos_atencao: exBib.pontos_atencao || 'Executar com controle',
      };
    } else if (tipoAdicao === 'texto_aquecimento') {
      if (!f.descricao.trim()) {
        return window.alert('Preencha o texto livre do aquecimento.');
      }
      novoItem = {
        id_unico: idUnico,
        tipo: 'texto',
        exercicio_id: null,
        bloco: '0',
        titulo: f.titulo.trim() || 'Aquecimento (Texto Livre)',
        descricao: f.descricao,
        duracao_min: null,
      };
    } else if (tipoAdicao === 'cardio') {
      if (!f.descricao.trim()) {
        return window.alert('Preencha o protocolo do bloco cardiorrespiratório.');
      }
      novoItem = {
        id_unico: idUnico,
        tipo: 'cardio',
        exercicio_id: null,
        bloco: normalizarBloco(f.bloco === '0' ? '1' : f.bloco),
        titulo: f.titulo.trim() || 'Bloco Cardiorrespiratório',
        descricao: f.descricao,
        duracao_min: f.duracao_min !== '' && !Number.isNaN(Number(f.duracao_min)) ? Number(f.duracao_min) : null,
      };
    }

    if (!novoItem) return;

    atualizarColuna(chave, (col) => ({
      ...col,
      adicionandoItemTipo: null,
      itensAtuais: ordenarItensTreinoPorBloco([...col.itensAtuais, novoItem]),
      novoItemForm: {
        bloco: '1',
        exercicioId: '',
        termoBusca: '',
        series: '',
        repeticoes: '',
        carga: '',
        intervalo: '',
        observacao: '',
        titulo: '',
        descricao: '',
        duracao_min: '',
      },
    }));
  }

  // --- DESCARTAR RASCUNHO INDIVIDUAL DE UM ALUNO (SEÇÃO 9) ---
  function handleDescartarAlteracoesColuna(alunoId, treinoId) {
    const chave = `${alunoId}:::${treinoId}`;
    limparRascunhoStorage(alunoId, treinoId);

    setColunasState((prev) => {
      const col = prev[chave];
      if (!col) return prev;
      return {
        ...prev,
        [chave]: {
          ...col,
          modoEdicao: false,
          itensAtuais: garantirIdsNosItens(col.itensOriginais),
          duracaoAquecimentoAtual: col.duracaoAquecimentoOriginal,
          adicionandoItemTipo: null,
          trocandoExercicioItemId: null,
        },
      };
    });
  }

  // --- SALVAR EDIÇÃO NO TREINO VIA RPC TRANSACIONAL salvar_edicao_exposicao (SEÇÃO 9) ---
  async function executarSalvarNoTreino({ alunoId, treinoId }) {
    const chave = `${alunoId}:::${treinoId}`;
    const col = colunasState[chave];
    const treinoObj = treinos.find((t) => String(t.id) === String(treinoId));
    if (!col || !treinoObj) return false;

    const durAqNum =
      col.duracaoAquecimentoAtual !== '' && !Number.isNaN(Number(col.duracaoAquecimentoAtual))
        ? Number(col.duracaoAquecimentoAtual)
        : null;

    const itensOrdenados = ordenarItensTreinoPorBloco(col.itensAtuais).map((item, idx) => ({
      ...item,
      bloco: normalizarBloco(item.bloco),
      ordem: idx + 1,
      ...(normalizarBloco(item.bloco) === '0' && durAqNum ? { duracao_aquecimento_min: durAqNum } : {}),
    }));

    const textoFormatado = formatarTextoTreino(itensOrdenados, durAqNum);

    // 1. Tenta via RPC transacional salvar_edicao_exposicao (Seção 9)
    let registroAtualizado = null;
    const { data: rpcData, error: rpcError } = await supabase.rpc('salvar_edicao_exposicao', {
      p_treino_id: String(treinoId),
      p_itens_estruturados: itensOrdenados,
      p_exercicios_texto: textoFormatado,
      p_duracao_aquecimento_min: durAqNum,
      p_expected_updated_at: treinoObj.updated_at || null,
      p_professor_nome: professorNome,
    });

    if (rpcError) {
      // Verifica se foi erro de conflito de edição simultânea (40001)
      if (rpcError.message?.includes('CONFLITO_CONCORRENCIA') || rpcError.code === '40001') {
        throw new Error(rpcError.message);
      }

      // Fallback caso a RPC ainda não tenha sido criada no banco pelo usuário
      const agoraIso = new Date().toISOString();
      await supabase.from('treinos_historico').insert([
        {
          treino_id: treinoId,
          professor_id: professorId,
          professor_nome: professorNome,
          snapshot_itens: col.itensOriginais,
          criado_em: agoraIso,
        },
      ]);

      const payloadUpdate = {
        itens_estruturados: itensOrdenados,
        exercicios: textoFormatado,
        duracao_aquecimento_min: durAqNum,
        ultima_edicao_aula_em: agoraIso,
        ultima_edicao_aula_por: professorId,
        ultima_edicao_aula_por_nome: professorNome,
        updated_at: agoraIso,
      };

      let { data: updData, error: updErr } = await supabase
        .from('treinos')
        .update(payloadUpdate)
        .eq('id', treinoId)
        .select()
        .single();

      if (updErr) {
        // Fallback mínimo se colunas novas de auditoria ainda não rodaram na migration
        const retry = await supabase
          .from('treinos')
          .update({
            itens_estruturados: itensOrdenados,
            exercicios: textoFormatado,
          })
          .eq('id', treinoId)
          .select()
          .single();

        if (retry.error) throw new Error(retry.error.message);
        updData = {
          ...retry.data,
          duracao_aquecimento_min: durAqNum,
          ultima_edicao_aula_em: agoraIso,
          ultima_edicao_aula_por: professorId,
          ultima_edicao_aula_por_nome: professorNome,
        };
      }

      await supabase.from('itens_treino').delete().eq('treino_id', treinoId);
      await salvarItensNaTabelaItensTreino(treinoId, itensOrdenados);
      registroAtualizado = updData;
    } else {
      registroAtualizado = rpcData;
    }

    // Limpa o rascunho daquele treino no localStorage
    limparRascunhoStorage(alunoId, treinoId);

    // Atualiza o treino na lista em memória (preservando dados do mesociclo)
    setTreinos((prev) =>
      prev.map((t) =>
        String(t.id) === String(treinoId)
          ? {
              ...t,
              ...(registroAtualizado || {}),
              itens_estruturados: itensOrdenados,
              exercicios: textoFormatado,
              duracao_aquecimento_min: durAqNum,
              ultima_edicao_aula_em: registroAtualizado?.ultima_edicao_aula_em || new Date().toISOString(),
              ultima_edicao_aula_por: registroAtualizado?.ultima_edicao_aula_por || professorId,
              ultima_edicao_aula_por_nome: registroAtualizado?.ultima_edicao_aula_por_nome || professorNome,
            }
          : t
      )
    );

    // Atualiza estado da coluna como salvo
    setColunasState((prev) => {
      const atual = prev[chave];
      if (!atual) return prev;
      return {
        ...prev,
        [chave]: {
          ...atual,
          modoEdicao: false,
          itensAtuais: itensOrdenados,
          itensOriginais: itensOrdenados,
          duracaoAquecimentoAtual: durAqNum ? String(durAqNum) : '',
          duracaoAquecimentoOriginal: durAqNum ? String(durAqNum) : '',
          adicionandoItemTipo: null,
          trocandoExercicioItemId: null,
        },
      };
    });

    return true;
  }

  async function confirmarESalvarColuna() {
    if (!confirmacaoSalvarCol) return;
    setSalvandoColuna(true);
    try {
      await executarSalvarNoTreino(confirmacaoSalvarCol);
      setConfirmacaoSalvarCol(null);
    } catch (err) {
      window.alert('Erro ao salvar alterações no treino: ' + err.message);
    } finally {
      setSalvandoColuna(false);
    }
  }

  // --- SAÍDA SEGURA DA EXPOSIÇÃO (VERIFICANDO RASCUNHOS PENDENTES - SEÇÃO 9) ---
  function solicitarSaidaExposicao() {
    if (chavesComRascunhoPendente.length > 0) {
      setModalSaidaRascunhos(true);
    } else {
      finalizarSaidaExposicao();
    }
  }

  async function finalizarSaidaExposicao() {
    try {
      window.localStorage.removeItem(STORAGE_SESSAO_KEY);
    } catch {
      // ignora
    }
    await sairTelaCheia();
    setModalSaidaRascunhos(false);
    setExposicaoAtiva(false);
    setColunaExpandidaIdx(null);
  }

  async function salvarTodosRascunhosESair() {
    setSalvandoColuna(true);
    try {
      for (const chave of chavesComRascunhoPendente) {
        const [alunoId, treinoId] = chave.split(':::');
        await executarSalvarNoTreino({ alunoId, treinoId });
      }
      await finalizarSaidaExposicao();
    } catch (err) {
      window.alert('Erro ao salvar rascunhos: ' + err.message);
    } finally {
      setSalvandoColuna(false);
    }
  }

  async function descartarTodosRascunhosESair() {
    for (const chave of chavesComRascunhoPendente) {
      const [alunoId, treinoId] = chave.split(':::');
      handleDescartarAlteracoesColuna(alunoId, treinoId);
    }
    await finalizarSaidaExposicao();
  }

  // Agrupa os itens de um treino nos cartões da Exposição:
  // Ordem estrita (Seção 8): Aquecimento (#E17900), Blocos Numerados (#4460B8), Cardiorrespiratório (#2DAFAB)
  function agruparItensEmBlocosExposicao(itens = [], duracaoAquecimentoAtual = '') {
    const ordenados = ordenarItensTreinoPorBloco(itens);
    const grupos = [];

    // 1. Aquecimento (bloco === '0' e tipo !== 'cardio')
    const itensAquecimento = ordenados.filter(
      (i) => normalizarBloco(i.bloco) === '0' && i.tipo !== 'cardio'
    );
    if (itensAquecimento.length > 0) {
      grupos.push({
        idGrupo: 'bloco-0',
        tipoGrupo: 'aquecimento',
        blocoCodigo: '0',
        titulo: `🔥 AQUECIMENTO${duracaoAquecimentoAtual ? ` • ${duracaoAquecimentoAtual} min` : ''}`,
        cor: '#E17900',
        corFundo: '#fff7ed',
        itens: itensAquecimento,
      });
    }

    // 2. Blocos Numerados (1, 2, 3, 4... onde tipo !== 'cardio')
    const mapasBlocosNum = new Map();
    ordenados
      .filter((i) => normalizarBloco(i.bloco) !== '0' && i.tipo !== 'cardio')
      .forEach((item) => {
        const bl = normalizarBloco(item.bloco);
        if (!mapasBlocosNum.has(bl)) {
          mapasBlocosNum.set(bl, []);
        }
        mapasBlocosNum.get(bl).push(item);
      });

    Array.from(mapasBlocosNum.entries())
      .sort(([a], [b]) => (parseInt(a, 10) || 1) - (parseInt(b, 10) || 1))
      .forEach(([bl, listaBl]) => {
        grupos.push({
          idGrupo: `bloco-${bl}`,
          tipoGrupo: 'numerado',
          blocoCodigo: bl,
          titulo: `BLOCO ${bl}`,
          cor: '#4460B8',
          corFundo: '#ffffff',
          itens: listaBl,
        });
      });

    // 3. Cardiorrespiratório (tipo === 'cardio')
    const itensCardio = ordenados.filter((i) => i.tipo === 'cardio');
    if (itensCardio.length > 0) {
      grupos.push({
        idGrupo: 'bloco-cardio',
        tipoGrupo: 'cardio',
        blocoCodigo: 'C',
        titulo: '🫀 CARDIORRESPIRATÓRIO',
        cor: '#2DAFAB',
        corFundo: '#f0fdfa',
        itens: itensCardio,
      });
    }

    return grupos;
  }

  if (carregando) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', fontSize: '18px', color: '#334155' }}>
        Carregando módulo de Exposição de Treinos...
      </div>
    );
  }

  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR');

  // ============================================================================
  // MODO 1: TELA DE CONFIGURAÇÃO DA AULA (SELEÇÃO DE 1 A 4 ALUNOS E TREINOS)
  // ============================================================================
  if (!exposicaoAtiva) {
    return (
      <div
        style={{
          maxWidth: '1050px',
          margin: '30px auto',
          padding: '28px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '22px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>
              📺 Exposição da Rotina de Treino (iPad / Paisagem)
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '14px' }}>
              Selecione de <strong>1 a 4 alunos</strong> para a aula. O sistema sugere automaticamente o próximo treino na sequência do mesociclo ativo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ← Voltar ao Painel
          </button>
        </div>

        {/* SELETOR DE QUANTIDADE DE ALUNOS NA AULA (1 A 4) */}
        <div
          style={{
            background: '#f8fafc',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <strong style={{ color: '#0f172a', fontSize: '15px' }}>👥 Formato da Aula (Layout iPad Paisagem):</strong>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
              1 aluno = Tela inteira • 2 alunos = 2 colunas • 3 alunos = 3 colunas • 4 alunos = Grade 2x2
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4].map((num) => {
              const ativo = qtdAlunosAula === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQtdAlunosAula(num)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: ativo ? 'none' : '1px solid #cbd5e1',
                    background: ativo ? '#4460B8' : '#ffffff',
                    color: ativo ? '#ffffff' : '#0f172a',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {num} {num === 1 ? 'Aluno' : 'Alunos'}
                </button>
              );
            })}
          </div>
        </div>

        {/* SLOTS DE CONFIGURAÇÃO DOS ALUNOS (1 A 4) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: qtdAlunosAula === 1 ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {slotsConfig.slice(0, qtdAlunosAula).map((slot, idx) => {
            const corSlot = CORES_ALUNOS[idx % CORES_ALUNOS.length];
            const treinosDoAluno = slot.alunoId
              ? treinos.filter((t) => String(t.aluno_id) === String(slot.alunoId))
              : [];
            const rascunhoExistente =
              slot.alunoId && slot.treinoId ? lerRascunhoStorage(slot.alunoId, slot.treinoId) : null;

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${corSlot.bordaClara}`,
                  borderTop: `6px solid ${corSlot.primaria}`,
                  borderRadius: '12px',
                  padding: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      background: corSlot.primaria,
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '12.5px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Coluna {idx + 1} • Identificação {corSlot.nomeCor}
                  </span>
                  {rascunhoExistente && (
                    <span
                      style={{
                        background: '#fff7ed',
                        color: '#E17900',
                        border: '1px solid #E17900',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      ⚠️ Rascunho salvo no dispositivo
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Aluno {idx + 1} *
                  </label>
                  <select
                    value={slot.alunoId}
                    onChange={(e) => handleSelecionarAlunoNoSlot(idx, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14.5px',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 'bold',
                    }}
                  >
                    <option value="">👤 Selecione o aluno...</option>
                    {alunos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {slot.alunoId && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                        Treino para Expor *
                      </label>
                      {slot.sugeridoId && String(slot.treinoId) === String(slot.sugeridoId) && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 'bold',
                            color: '#0f766e',
                            background: '#ccfbf1',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          ✨ Próximo sugerido na sequência
                        </span>
                      )}
                    </div>

                    {treinosDoAluno.length === 0 ? (
                      <div style={{ padding: '10px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
                        Este aluno não possui treinos ativos cadastrados.
                      </div>
                    ) : (
                      <select
                        value={slot.treinoId}
                        onChange={(e) => handleSelecionarTreinoNoSlot(idx, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14.5px',
                          background: '#ffffff',
                          color: '#0f172a',
                        }}
                      >
                        {treinosDoAluno.map((t) => {
                          const isSug = String(t.id) === String(slot.sugeridoId);
                          const prog = calcularProgressoMesociclo(t.mesociclos);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.titulo || 'Treino'} — {t.mesociclos?.nome || 'Avulso'}
                              {prog ? ` (${prog})` : ''}
                              {isSug ? ' ★ [Sugerido]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleIniciarExposicao}
          style={{
            width: '100%',
            padding: '16px',
            background: '#4460B8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '17px',
            fontWeight: '800',
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          📺 INICIAR EXPOSIÇÃO EM TELA CHEIA ({slotsAtivosNaAula.length}{' '}
          {slotsAtivosNaAula.length === 1 ? 'ALUNO' : 'ALUNOS'})
        </button>
      </div>
    );
  }

  // ============================================================================
  // MODO 2: TELA DE EXPOSIÇÃO ATIVA (IPAD / PAISAGEM / FULLSCREEN + WAKE LOCK)
  // ============================================================================
  const slotsVisiveis =
    colunaExpandidaIdx !== null && slotsAtivosNaAula[colunaExpandidaIdx]
      ? [{ slot: slotsAtivosNaAula[colunaExpandidaIdx], idxOriginal: colunaExpandidaIdx }]
      : slotsAtivosNaAula.map((slot, idxOriginal) => ({ slot, idxOriginal }));

  const totalColunasRenderizadas = slotsVisiveis.length;

  // Layout responsivo otimizado para iPad em modo paisagem (Seção 8):
  // 1 aluno: tela inteira | 2 alunos: 2 colunas | 3 alunos: 3 colunas | 4 alunos: grade 2x2
  const gridStyleAula = (() => {
    if (totalColunasRenderizadas === 1) {
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    }
    if (totalColunasRenderizadas === 2) {
      return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
    }
    if (totalColunasRenderizadas === 3) {
      return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr' };
    }
    return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  })();

  return (
    <div
      ref={containerFullscreenRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#f1f5f9',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* BARRA SUPERIOR DISCRETA DE CONTROLE DA EXPOSIÇÃO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 14px',
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          flexShrink: 0,
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>
            🧩 Body Puzzle • Exposição ({slotsAtivosNaAula.length}{' '}
            {slotsAtivosNaAula.length === 1 ? 'aluno' : 'alunos'})
          </strong>
          <span style={{ fontSize: '12px', color: '#475569' }}>📅 {dataHojeFormatada}</span>
          <span
            style={{
              fontSize: '11.5px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: wakeLockAtivo ? '#dcfce7' : '#f1f5f9',
              color: wakeLockAtivo ? '#166534' : '#475569',
              fontWeight: 'bold',
            }}
            title="Screen Wake Lock API impede que a tela do iPad bloqueie durante a aula"
          >
            {wakeLockAtivo ? '🔆 Tela sempre ativa' : '🔆 Modo aula'}
          </span>
          {slotsAtivosNaAula.length > 1 && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              💡 Toque no cabeçalho de um aluno para {colunaExpandidaIdx !== null ? 'restaurar a grade' : 'expandir em tela cheia'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {colunaExpandidaIdx !== null && (
            <button
              type="button"
              onClick={() => setColunaExpandidaIdx(null)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #4460B8',
                background: '#eff6ff',
                color: '#4460B8',
                fontWeight: 'bold',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              ⊞ Restaurar Grade ({slotsAtivosNaAula.length} alunos)
            </button>
          )}
          <button
            type="button"
            onClick={alternarTelaCheia}
            style={{
              padding: '5px 11px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 'bold',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            {emTelaCheia ? '🗗 Sair da Tela Cheia' : '⛶ Tela Cheia'}
          </button>
          <button
            type="button"
            onClick={solicitarSaidaExposicao}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 'bold',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            ✕ Sair da Exposição
          </button>
        </div>
      </div>

      {/* GRADE DE COLUNAS DOS ALUNOS (1, 2, 3 OU 4 ALUNOS EM 2x2) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          ...gridStyleAula,
          gap: '10px',
          padding: '10px',
          overflow: 'hidden',
          background: '#e2e8f0',
        }}
      >
        {slotsVisiveis.map(({ slot, idxOriginal }) => {
          const corAluno = CORES_ALUNOS[idxOriginal % CORES_ALUNOS.length];
          const alunoObj = alunos.find((a) => String(a.id) === String(slot.alunoId));
          const treinoObj = treinos.find((t) => String(t.id) === String(slot.treinoId));
          const chave = `${slot.alunoId}:::${slot.treinoId}`;
          const stCol = colunasState[chave];

          if (!alunoObj || !treinoObj || !stCol) return null;

          const temRascunho = colunaTemAlteracoesNaoSalvas(chave);
          const modoEdicao = stCol.modoEdicao;
          const gruposBlocos = agruparItensEmBlocosExposicao(
            stCol.itensAtuais,
            stCol.duracaoAquecimentoAtual
          );

          // Determina o primeiro bloco ainda não concluído para destacar com borda mais espessa (Seção 8)
          const primeiroBlocoNaoConcluidoId = gruposBlocos.find((g) =>
            g.itens.some((it) => !stCol.concluidosMap?.[it.id_unico])
          )?.idGrupo;

          // Calcula fonte dinâmica legível a 2-3 metros (28px até mínimo de 20px antes de habilitar rolagem)
          const fontSizeNomeExercicio = calcularFonteExercicioPx(
            stCol.itensAtuais.length,
            totalColunasRenderizadas
          );
          const fontSizeMetadados = Math.max(15, Math.round(fontSizeNomeExercicio * 0.72));

          const progressoMeso = calcularProgressoMesociclo(treinoObj.mesociclos);
          const auditoriaTexto = formatarAuditoriaAula(treinoObj);
          const fotoUrl = alunoObj.foto_url || alunoObj.avatar_url || null;

          return (
            <div
              key={chave}
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: `2px solid ${corAluno.primaria}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
              }}
            >
              {/* CABEÇALHO DO ALUNO (TOCAR EXPANDE/RESTAURA NO MODO MULTI-ALUNO) */}
              <div
                onClick={() => {
                  if (slotsAtivosNaAula.length > 1) {
                    setColunaExpandidaIdx((prev) => (prev === idxOriginal ? null : idxOriginal));
                  }
                }}
                style={{
                  background: corAluno.primaria,
                  color: '#ffffff',
                  padding: '10px 14px',
                  cursor: slotsAtivosNaAula.length > 1 ? 'pointer' : 'default',
                  flexShrink: 0,
                }}
                title={
                  slotsAtivosNaAula.length > 1
                    ? 'Toque no cabeçalho para expandir/restaurar a coluna deste aluno'
                    : ''
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt={alunoObj.nome}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #ffffff',
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.22)',
                          border: '2px solid #ffffff',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '18px',
                          fontWeight: '900',
                        }}
                      >
                        {alunoObj.nome.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '19px', letterSpacing: '0.2px' }}>
                          {alunoObj.nome}
                        </strong>
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.22)',
                            padding: '2px 9px',
                            borderRadius: '999px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                          }}
                        >
                          {treinoObj.titulo || 'Treino'}
                        </span>
                        {temRascunho && (
                          <span
                            style={{
                              background: '#E17900',
                              color: '#ffffff',
                              border: '1px solid #ffffff',
                              padding: '2px 9px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          >
                            ⚠️ Alterações não salvas
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12.5px', opacity: 0.95, marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {treinoObj.mesociclos?.nome && <span>📂 {treinoObj.mesociclos.nome}</span>}
                        {progressoMeso && <span>• 📊 {progressoMeso}</span>}
                        <span>• 📅 {dataHojeFormatada}</span>
                      </div>

                      {auditoriaTexto && (
                        <div style={{ fontSize: '11.5px', background: 'rgba(0,0,0,0.22)', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', display: 'inline-block' }}>
                          ✏️ {auditoriaTexto}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTÕES DE EDIÇÃO / SALVAR / DESCARTAR INDEPENDENTES POR COLUNA (SEÇÃO 9) */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(modoEdicao || temRascunho) && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmacaoSalvarCol({
                              alunoId: slot.alunoId,
                              treinoId: slot.treinoId,
                              alunoNome: alunoObj.nome,
                              treinoTitulo: treinoObj.titulo || 'Treino',
                            })
                          }
                          style={{
                            background: '#22c55e',
                            color: '#ffffff',
                            border: '1px solid #ffffff',
                            padding: '6px 11px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                          }}
                        >
                          💾 Salvar no treino
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDescartarAlteracoesColuna(slot.alunoId, slot.treinoId)}
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            border: '1px solid #ffffff',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                          }}
                        >
                          🗑️ Descartar
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        atualizarColuna(chave, (col) => ({
                          ...col,
                          modoEdicao: !col.modoEdicao,
                        }))
                      }
                      style={{
                        background: modoEdicao ? '#ffffff' : 'rgba(255,255,255,0.2)',
                        color: modoEdicao ? corAluno.primaria : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.6)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                      }}
                      title="Editar treino durante a exposição"
                    >
                      ✏️ {modoEdicao ? 'Fechar Edição' : 'Editar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* CORPO DA COLUNA COM OS CARTÕES DE BLOCOS */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* BARRA DE FERRAMENTAS DO MODO EDIÇÃO DA COLUNA (SEÇÃO 9) */}
                {modoEdicao && (
                  <div
                    style={{
                      background: '#fff7ed',
                      border: '2px solid #E17900',
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#9a3412' }}>
                        ✏️ Modo Edição Ativo (alterações salvas em rascunho automático)
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#9a3412' }}>
                          🔥 Duração Aquecimento (min):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={stCol.duracaoAquecimentoAtual}
                          onChange={(e) =>
                            atualizarColuna(chave, (col) => ({
                              ...col,
                              duracaoAquecimentoAtual: e.target.value,
                            }))
                          }
                          placeholder="Ex: 10"
                          style={{
                            width: '68px',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            border: '1px solid #fdba74',
                            fontSize: '12.5px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() =>
                          atualizarColuna(chave, (col) => ({
                            ...col,
                            adicionandoItemTipo: col.adicionandoItemTipo === 'exercicio' ? null : 'exercicio',
                          }))
                        }
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #4460B8',
                          background: '#eff6ff',
                          color: '#4460B8',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        + Adicionar Exercício
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          atualizarColuna(chave, (col) => ({
                            ...col,
                            adicionandoItemTipo:
                              col.adicionandoItemTipo === 'texto_aquecimento' ? null : 'texto_aquecimento',
                          }))
                        }
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #E17900',
                          background: '#fff7ed',
                          color: '#9a3412',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🔥 + Texto Aquecimento
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          atualizarColuna(chave, (col) => ({
                            ...col,
                            adicionandoItemTipo: col.adicionandoItemTipo === 'cardio' ? null : 'cardio',
                          }))
                        }
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #2DAFAB',
                          background: '#f0fdfa',
                          color: '#0f766e',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🫀 + Bloco Cardio
                      </button>
                    </div>

                    {/* FORMULÁRIO COMPACTO DE ADICIONAR ITEM NA EXPOSIÇÃO */}
                    {stCol.adicionandoItemTipo && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        {stCol.adicionandoItemTipo === 'exercicio' && (() => {
                          const f = stCol.novoItemForm;
                          const isAq = f.bloco === '0';
                          const termoNorm = normalizarTexto(f.termoBusca);
                          const sugestoes = biblioteca
                            .filter((ex) => {
                              if (!termoNorm) return isAq ? ex.padrao === 'Mobilidade' : true;
                              return (
                                normalizarTexto(ex.nome).includes(termoNorm) ||
                                normalizarTexto(ex.padrao).includes(termoNorm)
                              );
                            })
                            .sort((a, b) => {
                              if (isAq) {
                                const mA = a.padrao === 'Mobilidade' ? 0 : 1;
                                const mB = b.padrao === 'Mobilidade' ? 0 : 1;
                                if (mA !== mB) return mA - mB;
                              }
                              return (a.nome || '').localeCompare(b.nome || '');
                            })
                            .slice(0, 12);

                          return (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '8px' }}>
                                <select
                                  value={f.bloco}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, bloco: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                                >
                                  <option value="0">🔥 Aquecimento</option>
                                  <option value="1">Bloco 1</option>
                                  <option value="2">Bloco 2</option>
                                  <option value="3">Bloco 3</option>
                                  <option value="4">Bloco 4</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="🔍 Buscar exercício (sem acentos)..."
                                  value={f.termoBusca}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, termoBusca: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                              </div>

                              <select
                                value={f.exercicioId}
                                onChange={(e) =>
                                  atualizarColuna(
                                    chave,
                                    (col) => ({
                                      ...col,
                                      novoItemForm: { ...col.novoItemForm, exercicioId: e.target.value },
                                    }),
                                    false
                                  )
                                }
                                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }}
                              >
                                <option value="">Selecione o exercício...</option>
                                {sugestoes.map((ex) => (
                                  <option key={ex.id} value={ex.id}>
                                    {ex.padrao === 'Mobilidade' ? '🧘 [Mobilidade] ' : ''}
                                    {ex.nome} ({ex.padrao})
                                  </option>
                                ))}
                              </select>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                <input
                                  placeholder="Séries *"
                                  value={f.series}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, series: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <input
                                  placeholder="Reps/Tempo *"
                                  value={f.repeticoes}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, repeticoes: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <input
                                  placeholder="Carga (kg)"
                                  value={f.carga}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, carga: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <input
                                  placeholder="Intervalo"
                                  value={f.intervalo}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, intervalo: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                              </div>

                              <input
                                placeholder="Observação (opcional)"
                                value={f.observacao}
                                onChange={(e) =>
                                  atualizarColuna(
                                    chave,
                                    (col) => ({
                                      ...col,
                                      novoItemForm: { ...col.novoItemForm, observacao: e.target.value },
                                    }),
                                    false
                                  )
                                }
                                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }}
                              />
                            </div>
                          );
                        })()}

                        {(stCol.adicionandoItemTipo === 'texto_aquecimento' ||
                          stCol.adicionandoItemTipo === 'cardio') && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <input
                                placeholder="Título (opcional)"
                                value={stCol.novoItemForm.titulo}
                                onChange={(e) =>
                                  atualizarColuna(
                                    chave,
                                    (col) => ({
                                      ...col,
                                      novoItemForm: { ...col.novoItemForm, titulo: e.target.value },
                                    }),
                                    false
                                  )
                                }
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              />
                              {stCol.adicionandoItemTipo === 'cardio' && (
                                <input
                                  type="number"
                                  placeholder="Minutos"
                                  value={stCol.novoItemForm.duracao_min}
                                  onChange={(e) =>
                                    atualizarColuna(
                                      chave,
                                      (col) => ({
                                        ...col,
                                        novoItemForm: { ...col.novoItemForm, duracao_min: e.target.value },
                                      }),
                                      false
                                    )
                                  }
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                              )}
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Descrição livre (ex: 5 min de bike leve)..."
                              value={stCol.novoItemForm.descricao}
                              onChange={(e) =>
                                atualizarColuna(
                                  chave,
                                  (col) => ({
                                    ...col,
                                    novoItemForm: { ...col.novoItemForm, descricao: e.target.value },
                                  }),
                                  false
                                )
                              }
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => inserirNovoItemNaColuna(chave)}
                            style={{ padding: '6px 12px', background: '#2DAFAB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Inserir no Treino
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              atualizarColuna(chave, (col) => ({ ...col, adicionandoItemTipo: null }), false)
                            }
                            style={{ padding: '6px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RENDERIZAÇÃO DOS CARTÕES DE BLOCO (AQUECIMENTO -> BLOCOS 1..N -> CARDIO) */}
                {gruposBlocos.map((grupo) => {
                  const isPrimeiroPendente = grupo.idGrupo === primeiroBlocoNaoConcluidoId;

                  return (
                    <div
                      key={grupo.idGrupo}
                      style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: isPrimeiroPendente
                          ? `3px solid ${grupo.cor}`
                          : '1px solid #cbd5e1',
                        borderTop: `6px solid ${grupo.cor}`,
                        boxShadow: isPrimeiroPendente
                          ? '0 4px 12px rgba(15, 23, 42, 0.08)'
                          : 'none',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {/* FAIXA SUPERIOR DO BLOCO */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 12px',
                          background: grupo.corFundo,
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <strong style={{ fontSize: '14px', color: grupo.cor, letterSpacing: '0.4px' }}>
                          {grupo.titulo}
                        </strong>
                        {isPrimeiroPendente && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: grupo.cor,
                              color: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            Bloco Atual
                          </span>
                        )}
                      </div>

                      {/* LISTA DE ITENS DO BLOCO */}
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {grupo.itens.map((item, idxNoBloco) => {
                          const numeroExibicao = `${grupo.blocoCodigo}.${idxNoBloco + 1}`;
                          const concluido = Boolean(stCol.concluidosMap?.[item.id_unico]);
                          const modificado = itemFoiModificado(chave, item);

                          // Busca mídia na Biblioteca caso o item tenha exercicio_id
                          const exBib = item.exercicio_id
                            ? biblioteca.find((e) => String(e.id) === String(item.exercicio_id))
                            : null;
                          const urlMidia = item.midia_url || exBib?.midia_url || null;

                          return (
                            <div
                              key={item.id_unico}
                              onClick={() => {
                                if (!modoEdicao) {
                                  toggleExercicioConcluido(chave, item.id_unico);
                                }
                              }}
                              style={{
                                background: modificado
                                  ? '#fff7ed'
                                  : concluido
                                  ? '#f0fdf4'
                                  : '#ffffff',
                                border: modificado
                                  ? '2px solid #E17900'
                                  : concluido
                                  ? '1px solid #86efac'
                                  : '1px solid #e2e8f0',
                                borderLeft: modificado
                                  ? '6px solid #E17900'
                                  : `5px solid ${concluido ? '#22c55e' : grupo.cor}`,
                                borderRadius: '8px',
                                padding: '8px 10px',
                                cursor: modoEdicao ? 'default' : 'pointer',
                                opacity: concluido && !modoEdicao ? 0.68 : 1,
                              }}
                            >
                              {!modoEdicao ? (
                                /* VISUALIZAÇÃO NORMAL EM AULA (ALTO CONTRASTE, FONTE 20px-28px) */
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                        <span
                                          style={{
                                            fontSize: `${Math.max(16, fontSizeNomeExercicio - 4)}px`,
                                            fontWeight: '900',
                                            color: grupo.cor,
                                          }}
                                        >
                                          {numeroExibicao}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: `${fontSizeNomeExercicio}px`,
                                            fontWeight: '800',
                                            color: '#0f172a',
                                            lineHeight: 1.2,
                                            textDecoration: concluido ? 'line-through' : 'none',
                                          }}
                                        >
                                          {item.tipo === 'cardio' || item.tipo === 'texto'
                                            ? item.titulo || (item.tipo === 'cardio' ? 'Protocolo Cardio' : 'Aquecimento')
                                            : item.nome}
                                        </span>
                                        {modificado && (
                                          <span
                                            style={{
                                              background: '#E17900',
                                              color: '#fff',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              padding: '2px 7px',
                                              borderRadius: '999px',
                                            }}
                                          >
                                            Modificado
                                          </span>
                                        )}
                                      </div>

                                      {item.tipo === 'cardio' || item.tipo === 'texto' ? (
                                        <div
                                          style={{
                                            whiteSpace: 'pre-wrap',
                                            fontSize: `${fontSizeMetadados}px`,
                                            color: '#1e293b',
                                            marginTop: '4px',
                                            lineHeight: 1.4,
                                            fontWeight: '600',
                                          }}
                                        >
                                          {item.duracao_min ? `⏱️ ${item.duracao_min} min\n` : ''}
                                          {item.descricao}
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '10px',
                                            marginTop: '5px',
                                            fontSize: `${fontSizeMetadados}px`,
                                            color: '#1e293b',
                                            fontWeight: '700',
                                          }}
                                        >
                                          <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                                            🔁 {item.series} x {item.repeticoes}
                                          </span>
                                          {item.carga && item.carga !== '-' && (
                                            <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '6px' }}>
                                              🏋️ {item.carga}
                                              {String(item.carga).toLowerCase().includes('kg') ? '' : ' kg'}
                                            </span>
                                          )}
                                          {item.intervalo && item.intervalo !== '-' && (
                                            <span style={{ background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                                              ⏱️ {item.intervalo}
                                            </span>
                                          )}
                                          {item.equipamento && item.equipamento !== 'Livre' && (
                                            <span style={{ color: '#475569', fontWeight: '600' }}>
                                              • {item.equipamento}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {item.observacao && (
                                        <div
                                          style={{
                                            fontSize: `${Math.max(14, fontSizeMetadados - 2)}px`,
                                            color: '#334155',
                                            marginTop: '4px',
                                            background: '#f8fafc',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                          }}
                                        >
                                          📝 {item.observacao}
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {urlMidia && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMidiaModal({
                                              nome: item.nome || item.titulo,
                                              url: urlMidia,
                                            });
                                          }}
                                          style={{
                                            padding: '6px 9px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            color: '#2563eb',
                                            fontWeight: 'bold',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                          }}
                                          title="Ver demonstração de mídia"
                                        >
                                          🎬 Mídia
                                        </button>
                                      )}

                                      <div
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          border: concluido ? '2px solid #22c55e' : '2px solid #cbd5e1',
                                          background: concluido ? '#22c55e' : '#ffffff',
                                          color: '#ffffff',
                                          display: 'flex',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          fontWeight: 'bold',
                                          fontSize: '15px',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {concluido ? '✓' : ''}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* MODO EDIÇÃO INLINE DO ITEM DURANTE A EXPOSIÇÃO (SEÇÃO 9) */
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <strong style={{ color: grupo.cor }}>{numeroExibicao}</strong>
                                      <strong>{item.tipo === 'exercicio' ? item.nome : item.titulo || 'Texto Livre'}</strong>
                                      {modificado && (
                                        <span style={{ background: '#E17900', color: '#fff', fontSize: '10.5px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '999px' }}>
                                          🟠 Modificado
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {item.tipo !== 'cardio' && (
                                        <select
                                          value={normalizarBloco(item.bloco)}
                                          onChange={(e) =>
                                            atualizarCampoItem(chave, item.id_unico, 'bloco', e.target.value)
                                          }
                                          style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', fontWeight: 'bold' }}
                                          title="Mover para outro bloco"
                                        >
                                          <option value="0">🔥 Aquecimento</option>
                                          <option value="1">Bloco 1</option>
                                          <option value="2">Bloco 2</option>
                                          <option value="3">Bloco 3</option>
                                          <option value="4">Bloco 4</option>
                                        </select>
                                      )}
                                      {item.tipo === 'exercicio' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            atualizarColuna(
                                              chave,
                                              (col) => ({
                                                ...col,
                                                trocandoExercicioItemId:
                                                  col.trocandoExercicioItemId === item.id_unico
                                                    ? null
                                                    : item.id_unico,
                                                termoTrocaExercicio: '',
                                              }),
                                              false
                                            )
                                          }
                                          style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid #4460B8', background: '#eff6ff', color: '#4460B8', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          🔄 Trocar exercício
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => moverItemColuna(chave, item.id_unico, -1)}
                                        style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                                        title="Subir item"
                                      >
                                        ⬆️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moverItemColuna(chave, item.id_unico, 1)}
                                        style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                                        title="Descer item"
                                      >
                                        ⬇️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removerItemColuna(chave, item.id_unico)}
                                        style={{ padding: '3px 7px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                                        title="Remover item"
                                      >
                                        X
                                      </button>
                                    </div>
                                  </div>

                                  {/* BUSCA PARA TROCAR O EXERCÍCIO (SEÇÃO 9) */}
                                  {stCol.trocandoExercicioItemId === item.id_unico && (() => {
                                    const isAq = normalizarBloco(item.bloco) === '0';
                                    const termoNorm = normalizarTexto(stCol.termoTrocaExercicio);
                                    const opcoesTroca = biblioteca
                                      .filter((ex) => {
                                        if (!termoNorm) return isAq ? ex.padrao === 'Mobilidade' : true;
                                        return (
                                          normalizarTexto(ex.nome).includes(termoNorm) ||
                                          normalizarTexto(ex.padrao).includes(termoNorm)
                                        );
                                      })
                                      .sort((a, b) => {
                                        if (isAq) {
                                          const mA = a.padrao === 'Mobilidade' ? 0 : 1;
                                          const mB = b.padrao === 'Mobilidade' ? 0 : 1;
                                          if (mA !== mB) return mA - mB;
                                        }
                                        return (a.nome || '').localeCompare(b.nome || '');
                                      })
                                      .slice(0, 10);

                                    return (
                                      <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #93c5fd', marginBottom: '6px' }}>
                                        <input
                                          type="text"
                                          placeholder="🔍 Digite para buscar substituto na Biblioteca..."
                                          value={stCol.termoTrocaExercicio}
                                          onChange={(e) =>
                                            atualizarColuna(
                                              chave,
                                              (col) => ({ ...col, termoTrocaExercicio: e.target.value }),
                                              false
                                            )
                                          }
                                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '6px', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {opcoesTroca.map((ex) => (
                                            <button
                                              key={ex.id}
                                              type="button"
                                              onClick={() => trocarExercicioDoItem(chave, item.id_unico, ex)}
                                              style={{
                                                textAlign: 'left',
                                                padding: '5px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #e2e8f0',
                                                background: '#ffffff',
                                                cursor: 'pointer',
                                                fontSize: '12.5px',
                                              }}
                                            >
                                              <strong>{ex.nome}</strong>{' '}
                                              <span style={{ color: '#64748b' }}>({ex.padrao})</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {item.tipo === 'cardio' || item.tipo === 'texto' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                                        <input
                                          value={item.titulo || ''}
                                          onChange={(e) =>
                                            atualizarCampoItem(chave, item.id_unico, 'titulo', e.target.value)
                                          }
                                          placeholder="Título"
                                          style={{ padding: '5px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                                        />
                                        {item.tipo === 'cardio' && (
                                          <input
                                            type="number"
                                            value={item.duracao_min ?? ''}
                                            onChange={(e) =>
                                              atualizarCampoItem(
                                                chave,
                                                item.id_unico,
                                                'duracao_min',
                                                e.target.value ? Number(e.target.value) : null
                                              )
                                            }
                                            placeholder="Minutos"
                                            style={{ padding: '5px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                                          />
                                        )}
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={item.descricao || ''}
                                        onChange={(e) =>
                                          atualizarCampoItem(chave, item.id_unico, 'descricao', e.target.value)
                                        }
                                        style={{ width: '100%', padding: '5px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                        <div>
                                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569' }}>Séries</label>
                                          <input
                                            value={item.series || ''}
                                            onChange={(e) =>
                                              atualizarCampoItem(chave, item.id_unico, 'series', e.target.value)
                                            }
                                            style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569' }}>Reps/Tempo</label>
                                          <input
                                            value={item.repeticoes || ''}
                                            onChange={(e) =>
                                              atualizarCampoItem(chave, item.id_unico, 'repeticoes', e.target.value)
                                            }
                                            style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569' }}>Carga (kg)</label>
                                          <input
                                            value={item.carga || ''}
                                            onChange={(e) =>
                                              atualizarCampoItem(chave, item.id_unico, 'carga', e.target.value)
                                            }
                                            style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#475569' }}>Intervalo</label>
                                          <input
                                            value={item.intervalo || ''}
                                            onChange={(e) =>
                                              atualizarCampoItem(chave, item.id_unico, 'intervalo', e.target.value)
                                            }
                                            style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                      </div>
                                      <input
                                        placeholder="Observação do exercício..."
                                        value={item.observacao || ''}
                                        onChange={(e) =>
                                          atualizarCampoItem(chave, item.id_unico, 'observacao', e.target.value)
                                        }
                                        style={{ width: '100%', padding: '5px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CONFIRMAÇÃO AO SALVAR EDIÇÃO NO TREINO DE UM ALUNO (SEÇÃO 9) */}
      {confirmacaoSalvarCol && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10050,
            padding: '20px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '450px', width: '100%', padding: '24px', borderTop: '5px solid #22c55e' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>💾 Confirmar Salvamento</h3>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
              Salvar alterações no {confirmacaoSalvarCol.treinoTitulo} do {confirmacaoSalvarCol.alunoNome}?
            </p>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              A versão anterior será salva automaticamente no histórico de auditoria (<code>treinos_historico</code>) e o treino será atualizado com a data da aula e seu nome.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                disabled={salvandoColuna}
                onClick={() => setConfirmacaoSalvarCol(null)}
                style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoColuna}
                onClick={confirmarESalvarColuna}
                style={{ padding: '9px 16px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {salvandoColuna ? 'Salvando...' : 'Sim, Salvar no Treino'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO AO TENTAR SAIR COM RASCUNHOS NÃO SALVOS (SEÇÃO 9) */}
      {modalSaidaRascunhos && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10050,
            padding: '20px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '24px', borderTop: '5px solid #E17900' }}>
            <h3 style={{ marginTop: 0, color: '#9a3412' }}>⚠️ Alterações não salvas na exposição</h3>
            <p style={{ fontSize: '15.5px', fontWeight: 'bold', color: '#0f172a' }}>
              Salvar, descartar ou continuar editando?
            </p>
            <p style={{ fontSize: '13.5px', color: '#475569' }}>
              Há {chavesComRascunhoPendente.length} treino(s) com edições em rascunho ainda não salvas no banco de dados.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                disabled={salvandoColuna}
                onClick={salvarTodosRascunhosESair}
                style={{ padding: '11px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {salvandoColuna ? 'Salvando...' : '💾 Salvar alterações e sair'}
              </button>
              <button
                type="button"
                disabled={salvandoColuna}
                onClick={descartarTodosRascunhosESair}
                style={{ padding: '11px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🗑️ Descartar alterações e sair
              </button>
              <button
                type="button"
                disabled={salvandoColuna}
                onClick={() => setModalSaidaRascunhos(false)}
                style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✏️ Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MÍDIA / DEMONSTRAÇÃO DO EXERCÍCIO */}
      {midiaModal && (
        <div
          onClick={() => setMidiaModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10060,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '640px', width: '100%', padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🎬 {midiaModal.nome}</h3>
              <button
                type="button"
                onClick={() => setMidiaModal(null)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Fechar
              </button>
            </div>
            {/\.(mp4|webm|ogg)$/i.test(midiaModal.url) ? (
              <video src={midiaModal.url} controls style={{ width: '100%', borderRadius: '8px' }} />
            ) : /\.(jpg|jpeg|png|gif|webp)$/i.test(midiaModal.url) ? (
              <img src={midiaModal.url} alt={midiaModal.nome} style={{ width: '100%', borderRadius: '8px' }} />
            ) : (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <a
                  href={midiaModal.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '16px' }}
                >
                  Abrir demonstração externa em nova aba ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
