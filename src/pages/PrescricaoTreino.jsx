import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import { PADROES_OPCOES, TIPOS_OPCOES } from './Biblioteca';
import {
  normalizarTexto,
  normalizarBloco,
  ordenarItensTreinoPorBloco,
  extrairDuracaoAquecimento,
  formatarTextoTreino,
  clonarItensTreino,
  salvarItensNaTabelaItensTreino,
  copiarMesocicloTransacional,
  importarTreinoParaMesociclo,
  verificarExercicioInativo,
  ordenarTreinosDoMesociclo,
  analisarImpactoEdicaoMesocicloNasSessoes,
  recalcularEPersistirSemanasMesociclo,
  carregarSessoesDoAluno,
  formatarAuditoriaAula,
} from '../utils/prescricaoUtils';

function garantirIdsItensPrescricao(itens = []) {
  return ordenarItensTreinoPorBloco(itens).map((item, idx) => ({
    ...item,
    id_unico: item.id_unico || Date.now() + idx + Math.floor(Math.random() * 100000),
    bloco: normalizarBloco(item.bloco),
    ordem: idx + 1,
  }));
}

function serializarEstadoTreino(titulo, durAq, itens = []) {
  return JSON.stringify({
    titulo: (titulo || '').trim(),
    durAq: String(durAq || '').trim(),
    itens: (itens || []).map((it) => ({
      tipo: it.tipo || 'exercicio',
      exercicio_id: it.exercicio_id ? String(it.exercicio_id) : '',
      bloco: normalizarBloco(it.bloco),
      nome: (it.nome || '').trim(),
      titulo: (it.titulo || '').trim(),
      descricao: it.descricao || '',
      duracao_min: it.duracao_min ? Number(it.duracao_min) : null,
      series: String(it.series || '').trim(),
      repeticoes: String(it.repeticoes || '').trim(),
      carga: String(it.carga || '-').trim(),
      intervalo: String(it.intervalo || '-').trim(),
      observacao: String(it.observacao || '').trim(),
    })),
  });
}

export default function PrescricaoTreino() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [professorId, setProfessorId] = useState(null);
  const [professorNome, setProfessorNome] = useState('Professor');

  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(searchParams.get('alunoId') || '');

  // Estados para Mesociclos
  const [mesociclos, setMesociclos] = useState([]);
  const [mesocicloSelecionadoId, setMesocicloSelecionadoId] = useState(searchParams.get('mesocicloId') || '');
  const [criandoMesociclo, setCriandoMesociclo] = useState(false);
  const [editandoMesociclo, setEditandoMesociclo] = useState(searchParams.get('editarMesociclo') === '1');
  const [salvandoMeso, setSalvandoMeso] = useState(false);

  const [novoMeso, setNovoMeso] = useState({
    nome: '',
    dataInicio: new Date().toISOString().split('T')[0],
    semanas: '4',
    objetivo: '',
    frequencia: '',
    observacoes: '',
  });

  const [formEditarMeso, setFormEditarMeso] = useState({
    nome: '',
    dataInicio: '',
    semanas: '4',
    objetivo: '',
    frequencia: '',
    observacoes: '',
  });

  // Lista de treinos pertencentes ao mesociclo selecionado (para editar ordem, renomear, excluir ou selecionar para editar)
  const [treinosDoMesociclo, setTreinosDoMesociclo] = useState([]);

  // Estado de edição de treino existente (Seção 6)
  const [treinoEmEdicaoId, setTreinoEmEdicaoId] = useState(searchParams.get('treinoId') || '');
  const [treinoOriginalObj, setTreinoOriginalObj] = useState(null);
  const [assinaturaOriginalTreino, setAssinaturaOriginalTreino] = useState(
    serializarEstadoTreino('', '', [])
  );
  const [historicoVersoesTreino, setHistoricoVersoesTreino] = useState([]);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);

  // Cópia ao criar mesociclo (Melhoria 4)
  const [copiarDeExistente, setCopiarDeExistente] = useState(false);
  const [alunoOrigemMesoId, setAlunoOrigemMesoId] = useState('');
  const [mesociclosOrigem, setMesociclosOrigem] = useState([]);
  const [mesocicloOrigemId, setMesocicloOrigemId] = useState('');
  const [manterCargasMeso, setManterCargasMeso] = useState(true);

  // Importar treino dentro de mesociclo existente (Melhoria 4)
  const [painelImportarTreino, setPainelImportarTreino] = useState(false);
  const [alunoOrigemTreinoId, setAlunoOrigemTreinoId] = useState('');
  const [treinosOrigemLista, setTreinosOrigemLista] = useState([]);
  const [treinoOrigemSelecionadoId, setTreinoOrigemSelecionadoId] = useState('');
  const [manterCargasTreino, setManterCargasTreino] = useState(true);
  const [importandoTreino, setImportandoTreino] = useState(false);

  // Modal Duplicar Mesociclo para... (Melhoria 4)
  const [modalDuplicarMeso, setModalDuplicarMeso] = useState(false);
  const [alunoDestinoDupId, setAlunoDestinoDupId] = useState('');
  const [manterCargasDup, setManterCargasDup] = useState(true);
  const [formDupMeso, setFormDupMeso] = useState({
    nome: '',
    dataInicio: new Date().toISOString().split('T')[0],
    semanas: '4',
    objetivo: '',
    frequencia: '',
  });
  const [duplicandoMeso, setDuplicandoMeso] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [duracaoAquecimentoMin, setDuracaoAquecimentoMin] = useState('');
  const [todosExercicios, setTodosExercicios] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);
  const [carregandoBib, setCarregandoBib] = useState(true);

  // Pesquisa e Autocomplete
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [exercicioSelecionadoId, setExercicioSelecionadoId] = useState('');
  const [detalhesExercicio, setDetalhesExercicio] = useState(null);

  // Criação rápida de exercício na Biblioteca (Proposta)
  const [criandoExercicioRapido, setCriandoExercicioRapido] = useState(false);
  const [novoEx, setNovoEx] = useState({
    nome: '',
    padrao: PADROES_OPCOES[0],
    nivel: '',
    tipo: 'Força',
  });

  // Campos do Exercício no Treino (Seção 7: Aquecimento = '0' é a primeira opção no seletor)
  const [bloco, setBloco] = useState('1');
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [carga, setCarga] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [observacaoExercicio, setObservacaoExercicio] = useState('');

  // Campos de Texto Livre no Aquecimento (Seção 7)
  const [adicionandoTextoAquecimento, setAdicionandoTextoAquecimento] = useState(false);
  const [tituloTextoAquecimento, setTituloTextoAquecimento] = useState('');
  const [descricaoTextoAquecimento, setDescricaoTextoAquecimento] = useState('');

  // Campos do Bloco Cardiorrespiratório (Melhoria 5)
  const [adicionandoCardio, setAdicionandoCardio] = useState(false);
  const [blocoCardio, setBlocoCardio] = useState('1');
  const [tituloCardio, setTituloCardio] = useState('');
  const [descricaoCardio, setDescricaoCardio] = useState('');
  const [duracaoCardio, setDuracaoCardio] = useState('');

  const [listaExerciciosTreino, setListaExerciciosTreino] = useState([]);

  // Estado para trocar exercício de um item já existente na lista e drag-and-drop (Seção 6.2)
  const [trocandoItemUnicoId, setTrocandoItemUnicoId] = useState(null);
  const [termoBuscaTrocaItem, setTermoBuscaTrocaItem] = useState('');
  const [draggedItemIdx, setDraggedItemIdx] = useState(null);

  // Verifica se há mudanças não salvas no formulário de treino (Seção 6.3)
  const assinaturaAtualTreino = serializarEstadoTreino(
    titulo,
    duracaoAquecimentoMin,
    listaExerciciosTreino
  );
  const temMudancasNaoSalvasTreino = assinaturaAtualTreino !== assinaturaOriginalTreino;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (temMudancasNaoSalvasTreino) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [temMudancasNaoSalvasTreino]);

  useEffect(() => {
    const idUrl = searchParams.get('alunoId');
    const mesoUrl = searchParams.get('mesocicloId');
    const trUrl = searchParams.get('treinoId');
    const edMesoUrl = searchParams.get('editarMesociclo') === '1';
    if (idUrl) setAlunoSelecionadoId(idUrl);
    if (mesoUrl) setMesocicloSelecionadoId(mesoUrl);
    if (trUrl) setTreinoEmEdicaoId(trUrl);
    if (edMesoUrl) setEditandoMesociclo(true);
  }, [searchParams]);

  useEffect(() => {
    async function carregarDados() {
      setCarregandoBib(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setProfessorId(session.user.id);
        const emailPrefix = session.user.email ? session.user.email.split('@')[0] : 'Professor';
        const nomeMeta = session.user.user_metadata?.nome || session.user.user_metadata?.full_name;
        setProfessorNome(nomeMeta || emailPrefix);
      }

      const { data: dadosAlunos } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (dadosAlunos) setAlunos(dadosAlunos);

      const { data: dadosExercicios } = await supabase.from('exercicios').select('*').order('nome');
      if (dadosExercicios) {
        setTodosExercicios(dadosExercicios);
        setBiblioteca(dadosExercicios.filter((ex) => ex.status !== 'Inativo'));
      }
      setCarregandoBib(false);
    }
    carregarDados();
  }, []);

  // Carrega um treino específico para edição (Seção 6)
  const carregarTreinoParaEdicao = useCallback(async (idDoTreino) => {
    if (!idDoTreino) {
      setTreinoOriginalObj(null);
      setTitulo('');
      setDuracaoAquecimentoMin('');
      setListaExerciciosTreino([]);
      setAssinaturaOriginalTreino(serializarEstadoTreino('', '', []));
      setHistoricoVersoesTreino([]);
      return;
    }

    const { data: tr, error } = await supabase
      .from('treinos')
      .select('*, mesociclos(*)')
      .eq('id', idDoTreino)
      .single();

    if (error || !tr) return;

    setTreinoOriginalObj(tr);
    if (tr.aluno_id) setAlunoSelecionadoId(String(tr.aluno_id));
    if (tr.mesociclo_id) setMesocicloSelecionadoId(String(tr.mesociclo_id));

    const tit = tr.titulo || '';
    const durAq = extrairDuracaoAquecimento(tr);
    const durStr = durAq ? String(durAq) : '';
    const itensComIds = garantirIdsItensPrescricao(tr.itens_estruturados || []);

    setTitulo(tit);
    setDuracaoAquecimentoMin(durStr);
    setListaExerciciosTreino(itensComIds);
    setAssinaturaOriginalTreino(serializarEstadoTreino(tit, durStr, itensComIds));

    // Carrega histórico de versões anteriores deste treino (Seção 6.3)
    const { data: histData } = await supabase
      .from('treinos_historico')
      .select('*')
      .eq('treino_id', idDoTreino)
      .order('criado_em', { ascending: false });

    setHistoricoVersoesTreino(histData || []);
  }, []);

  useEffect(() => {
    if (treinoEmEdicaoId) {
      carregarTreinoParaEdicao(treinoEmEdicaoId);
    }
  }, [treinoEmEdicaoId, carregarTreinoParaEdicao]);

  // Carregar Mesociclos quando seleciona o aluno (ignorando excluido_em != null - Seção 3.1)
  useEffect(() => {
    async function carregarMesociclos() {
      if (!alunoSelecionadoId) {
        setMesociclos([]);
        setMesocicloSelecionadoId('');
        return;
      }
      const { data } = await supabase
        .from('mesociclos')
        .select('*')
        .eq('aluno_id', alunoSelecionadoId)
        .order('data_inicio', { ascending: false });

      if (data) {
        const ativos = data.filter((m) => !m.excluido_em);
        setMesociclos(ativos);
        const mesoUrl = searchParams.get('mesocicloId');
        if (mesoUrl && ativos.some((m) => String(m.id) === String(mesoUrl))) {
          setMesocicloSelecionadoId(mesoUrl);
        } else if (ativos.length > 0 && !mesocicloSelecionadoId) {
          const ativo = ativos.find((m) => m.status === 'Ativo') || ativos[0];
          setMesocicloSelecionadoId(ativo.id);
        }
      }
    }
    carregarMesociclos();
  }, [alunoSelecionadoId]);

  // Carrega os dados do mesociclo selecionado e os treinos dele (Seção 6.2)
  const carregarTreinosDoMesocicloAtual = useCallback(async (mesoId) => {
    if (!mesoId) {
      setTreinosDoMesociclo([]);
      return;
    }
    const { data } = await supabase
      .from('treinos')
      .select('*')
      .eq('mesociclo_id', mesoId)
      .order('criado_em', { ascending: true });

    const ativos = ordenarTreinosDoMesociclo((data || []).filter((t) => !t.excluido_em));
    setTreinosDoMesociclo(ativos);
  }, []);

  useEffect(() => {
    if (!mesocicloSelecionadoId) {
      setTreinosDoMesociclo([]);
      return;
    }
    const mesoObj = mesociclos.find((m) => String(m.id) === String(mesocicloSelecionadoId));
    if (mesoObj) {
      setFormEditarMeso({
        nome: mesoObj.nome || '',
        dataInicio: mesoObj.data_inicio || new Date().toISOString().split('T')[0],
        semanas: String(mesoObj.semanas || 4),
        objetivo: mesoObj.objetivo || '',
        frequencia: mesoObj.frequencia ? String(mesoObj.frequencia) : '',
        observacoes: mesoObj.observacoes || '',
      });
    }
    carregarTreinosDoMesocicloAtual(mesocicloSelecionadoId);
  }, [mesocicloSelecionadoId, mesociclos, carregarTreinosDoMesocicloAtual]);

  // Quando muda aluno de origem na cópia de mesociclo, ajusta cargas padrão e carrega mesociclos ativos dele
  useEffect(() => {
    async function carregarMesosOrigem() {
      if (!alunoOrigemMesoId) {
        setMesociclosOrigem([]);
        setMesocicloOrigemId('');
        return;
      }
      setManterCargasMeso(String(alunoOrigemMesoId) === String(alunoSelecionadoId));

      const { data } = await supabase
        .from('mesociclos')
        .select('*')
        .eq('aluno_id', alunoOrigemMesoId)
        .order('data_inicio', { ascending: false });

      const ativos = (data || []).filter((m) => !m.excluido_em);
      setMesociclosOrigem(ativos);
      setMesocicloOrigemId(ativos?.[0]?.id || '');
    }
    if (copiarDeExistente) {
      carregarMesosOrigem();
    }
  }, [alunoOrigemMesoId, copiarDeExistente, alunoSelecionadoId]);

  // Quando muda aluno de origem ao importar treino, ajusta cargas padrão e busca treinos ativos dele
  useEffect(() => {
    async function carregarTreinosOrigem() {
      if (!alunoOrigemTreinoId) {
        setTreinosOrigemLista([]);
        setTreinoOrigemSelecionadoId('');
        return;
      }
      setManterCargasTreino(String(alunoOrigemTreinoId) === String(alunoSelecionadoId));

      const { data } = await supabase
        .from('treinos')
        .select('*, mesociclos(nome, data_inicio, excluido_em)')
        .eq('aluno_id', alunoOrigemTreinoId)
        .order('criado_em', { ascending: false });

      const ativos = (data || []).filter((t) => !t.excluido_em && !t.mesociclos?.excluido_em);
      setTreinosOrigemLista(ativos);
      setTreinoOrigemSelecionadoId(ativos?.[0]?.id || '');
    }
    if (painelImportarTreino) {
      carregarTreinosOrigem();
    }
  }, [alunoOrigemTreinoId, painelImportarTreino, alunoSelecionadoId]);

  async function handleSalvarNovoMesociclo(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno primeiro.');
    setSalvandoMeso(true);

    try {
      const alunoObj = alunos.find((a) => String(a.id) === String(alunoSelecionadoId));

      if (copiarDeExistente) {
        if (!mesocicloOrigemId) {
          setSalvandoMeso(false);
          return window.alert('Selecione o mesociclo de origem para copiar.');
        }

        const { novoMesociclo, treinosCriados, exerciciosInativos } = await copiarMesocicloTransacional({
          mesocicloOrigemId,
          alunoDestino: alunoObj || { id: alunoSelecionadoId },
          dadosNovoMeso: novoMeso,
          manterCargas: manterCargasMeso,
          todosExercicios,
        });

        setMesociclos([novoMesociclo, ...mesociclos]);
        setMesocicloSelecionadoId(novoMesociclo.id);
        setCriandoMesociclo(false);
        setCopiarDeExistente(false);
        setNovoMeso({
          nome: '',
          dataInicio: new Date().toISOString().split('T')[0],
          semanas: '4',
          objetivo: '',
          frequencia: '',
          observacoes: '',
        });

        let msg = `Mesociclo "${novoMesociclo.nome}" criado com sucesso (${treinosCriados.length} treino(s) copiado(s))!`;
        if (exerciciosInativos.length > 0) {
          msg += `\n\n⚠️ ATENÇÃO: Os seguintes exercícios copiados estão marcados como INATIVOS na Biblioteca:\n• ${exerciciosInativos.join(
            '\n• '
          )}\nRecomendamos revisá-los ou substituí-los.`;
        }
        window.alert(msg);
      } else {
        const semanasNum = parseInt(novoMeso.semanas, 10) || 4;
        const dataInicioObj = new Date(`${novoMeso.dataInicio}T00:00:00`);
        dataInicioObj.setDate(dataInicioObj.getDate() + semanasNum * 7);
        const dataFimFormatada = dataInicioObj.toISOString().split('T')[0];

        const payloadMeso = {
          aluno_id: alunoSelecionadoId,
          nome: novoMeso.nome,
          data_inicio: novoMeso.dataInicio,
          semanas: semanasNum,
          data_fim: dataFimFormatada,
          objetivo: novoMeso.objetivo || null,
          frequencia: parseInt(novoMeso.frequencia, 10) || null,
          observacoes: novoMeso.observacoes || null,
          status: 'Ativo',
        };

        let { data, error } = await supabase.from('mesociclos').insert([payloadMeso]).select().single();
        if (error && error.message?.includes('observacoes')) {
          const { observacoes: _obs, ...semObs } = payloadMeso;
          const retry = await supabase.from('mesociclos').insert([semObs]).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw new Error(error.message);

        setMesociclos([data, ...mesociclos]);
        setMesocicloSelecionadoId(data.id);
        setCriandoMesociclo(false);
        setNovoMeso({
          nome: '',
          dataInicio: new Date().toISOString().split('T')[0],
          semanas: '4',
          objetivo: '',
          frequencia: '',
          observacoes: '',
        });
      }
    } catch (err) {
      window.alert('Erro ao criar mesociclo: ' + err.message);
    } finally {
      setSalvandoMeso(false);
    }
  }

  // --- SALVAR EDIÇÃO DE MESOCICLO PRONTO (SEÇÃO 6.2 e 6.3) ---
  async function handleSalvarEdicaoMesociclo(e) {
    e.preventDefault();
    if (!mesocicloSelecionadoId) return;
    const mesoOriginal = mesociclos.find((m) => String(m.id) === String(mesocicloSelecionadoId));
    if (!mesoOriginal) return;

    const novasSemanasNum = Math.max(1, parseInt(formEditarMeso.semanas, 10) || 4);
    const novaDataInicio = formEditarMeso.dataInicio || mesoOriginal.data_inicio;

    // Seção 6.3: Verifica sessões registradas neste mesociclo para recalcular semanas e alertar se semanas diminuírem
    const todasSessoesAluno = await carregarSessoesDoAluno(alunoSelecionadoId);
    const sessoesDesteMeso = todasSessoesAluno.filter(
      (s) => !s.excluido_em && String(s.mesociclo_id) === String(mesocicloSelecionadoId)
    );

    const impacto = analisarImpactoEdicaoMesocicloNasSessoes(
      sessoesDesteMeso,
      novaDataInicio,
      novasSemanasNum
    );

    if (impacto.avisoForaDoPeriodo) {
      const prosseguir = window.confirm(
        `⚠️ ${impacto.avisoForaDoPeriodo}\n\nDeseja salvar as alterações do mesociclo mesmo assim?`
      );
      if (!prosseguir) return;
    }

    setSalvandoMeso(true);
    try {
      const dataInicioObj = new Date(`${novaDataInicio}T00:00:00`);
      dataInicioObj.setDate(dataInicioObj.getDate() + novasSemanasNum * 7);
      const dataFimFormatada = dataInicioObj.toISOString().split('T')[0];

      const payloadUpdate = {
        nome: formEditarMeso.nome.trim() || mesoOriginal.nome,
        data_inicio: novaDataInicio,
        semanas: novasSemanasNum,
        data_fim: dataFimFormatada,
        objetivo: formEditarMeso.objetivo || null,
        frequencia: formEditarMeso.frequencia ? parseInt(formEditarMeso.frequencia, 10) : null,
        observacoes: formEditarMeso.observacoes || null,
      };

      let { data: mesoAtualizado, error } = await supabase
        .from('mesociclos')
        .update(payloadUpdate)
        .eq('id', mesocicloSelecionadoId)
        .select()
        .single();

      if (error && error.message?.includes('observacoes')) {
        const { observacoes: _obs, ...semObs } = payloadUpdate;
        const retry = await supabase
          .from('mesociclos')
          .update(semObs)
          .eq('id', mesocicloSelecionadoId)
          .select()
          .single();
        mesoAtualizado = retry.data ? { ...retry.data, observacoes: formEditarMeso.observacoes } : null;
        error = retry.error;
      }

      if (error) throw new Error(error.message);

      // Se a data de início do mesociclo mudou, recalcula a semana de todas as sessões dele (Seção 6.3)
      if (String(novaDataInicio) !== String(mesoOriginal.data_inicio) && sessoesDesteMeso.length > 0) {
        await recalcularEPersistirSemanasMesociclo(
          mesocicloSelecionadoId,
          novaDataInicio,
          sessoesDesteMeso
        );
      }

      // Persiste renomeação e nova ordem dos treinos do mesociclo (Seção 6.2)
      for (let i = 0; i < treinosDoMesociclo.length; i++) {
        const t = treinosDoMesociclo[i];
        const novaOrdem = i + 1;
        const { error: errOrd } = await supabase
          .from('treinos')
          .update({ titulo: t.titulo, ordem: novaOrdem })
          .eq('id', t.id);

        if (errOrd && errOrd.message?.includes('ordem')) {
          await supabase.from('treinos').update({ titulo: t.titulo }).eq('id', t.id);
        }
      }

      setMesociclos((prev) =>
        prev.map((m) => (String(m.id) === String(mesocicloSelecionadoId) ? { ...m, ...mesoAtualizado } : m))
      );

      setEditandoMesociclo(false);
      window.alert('Mesociclo atualizado com sucesso!');
    } catch (err) {
      window.alert('Erro ao atualizar mesociclo: ' + err.message);
    } finally {
      setSalvandoMeso(false);
    }
  }

  // Reordenar, renomear e excluir treinos dentro do mesociclo (Seção 6.2)
  function moverTreinoDoMesociclo(idx, direcao) {
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= treinosDoMesociclo.length) return;
    const copia = [...treinosDoMesociclo];
    const [rem] = copia.splice(idx, 1);
    copia.splice(novoIdx, 0, rem);
    setTreinosDoMesociclo(copia.map((t, i) => ({ ...t, ordem: i + 1 })));
  }

  function renomearTreinoDoMesocicloLocal(treinoId, novoTitulo) {
    setTreinosDoMesociclo((prev) =>
      prev.map((t) => (String(t.id) === String(treinoId) ? { ...t, titulo: novoTitulo } : t))
    );
    if (String(treinoEmEdicaoId) === String(treinoId)) {
      setTitulo(novoTitulo);
    }
  }

  async function excluirTreinoDoMesocicloParaLixeira(treinoObj) {
    const confirmar = window.confirm(
      `Excluir o "${treinoObj.titulo || 'Treino'}"? Ele irá para a Lixeira (30 dias) e poderá ser restaurado na página do aluno.`
    );
    if (!confirmar) return;

    const agoraIso = new Date().toISOString();
    const { error } = await supabase
      .from('treinos')
      .update({ excluido_em: agoraIso })
      .eq('id', treinoObj.id);

    if (error) {
      return window.alert('Erro ao excluir treino: ' + error.message);
    }

    setTreinosDoMesociclo((prev) => prev.filter((t) => String(t.id) !== String(treinoObj.id)));
    if (String(treinoEmEdicaoId) === String(treinoObj.id)) {
      setTreinoEmEdicaoId('');
      carregarTreinoParaEdicao('');
    }
  }

  // Importar treino para a tela de edição ou salvar direto no mesociclo (Melhoria 4 + Seção 7 Aquecimento)
  async function handleExecutarImportacaoTreino(salvarDiretoNoBanco = false) {
    const treinoOrig = treinosOrigemLista.find((t) => String(t.id) === String(treinoOrigemSelecionadoId));
    if (!treinoOrig) return window.alert('Selecione um treino para importar.');

    if (salvarDiretoNoBanco) {
      if (!mesocicloSelecionadoId) return window.alert('Selecione um mesociclo de destino primeiro.');
      setImportandoTreino(true);
      try {
        const alunoObj = alunos.find((a) => String(a.id) === String(alunoSelecionadoId));
        const { novoTreino, exerciciosInativos } = await importarTreinoParaMesociclo({
          treinoOrigem: treinoOrig,
          alunoDestino: alunoObj || { id: alunoSelecionadoId },
          mesocicloDestinoId: mesocicloSelecionadoId,
          manterCargas: manterCargasTreino,
          todosExercicios,
        });

        let msg = `Treino "${novoTreino.titulo}" importado diretamente para o mesociclo!`;
        if (exerciciosInativos.length > 0) {
          msg += `\n\n⚠️ ATENÇÃO: Exercícios INATIVOS detectados no treino importado:\n• ${exerciciosInativos.join('\n• ')}`;
        }
        window.alert(msg);
        setPainelImportarTreino(false);
        carregarTreinosDoMesocicloAtual(mesocicloSelecionadoId);
      } catch (err) {
        window.alert(err.message);
      } finally {
        setImportandoTreino(false);
      }
    } else {
      const itensOrig = Array.isArray(treinoOrig.itens_estruturados) ? treinoOrig.itens_estruturados : [];
      const durAq = extrairDuracaoAquecimento(treinoOrig);
      const { itensNovos, exerciciosInativos } = clonarItensTreino(itensOrig, manterCargasTreino, todosExercicios);
      setTitulo(treinoOrig.titulo ? `${treinoOrig.titulo}` : 'Treino Importado');
      setDuracaoAquecimentoMin(durAq ? String(durAq) : '');
      setListaExerciciosTreino(ordenarItensTreinoPorBloco(itensNovos));
      setPainelImportarTreino(false);

      if (exerciciosInativos.length > 0) {
        window.alert(
          `⚠️ ATENÇÃO: O treino carregado possui exercício(s) marcado(s) como INATIVO na Biblioteca:\n• ${exerciciosInativos.join(
            '\n• '
          )}\nEles estão sinalizados em vermelho na lista abaixo.`
        );
      }
    }
  }

  function abrirModalDuplicarMesocicloAtual() {
    const mesoAtual = mesociclos.find((m) => String(m.id) === String(mesocicloSelecionadoId));
    if (!mesoAtual) return window.alert('Selecione um mesociclo primeiro.');
    setAlunoDestinoDupId(alunoSelecionadoId);
    setManterCargasDup(true);
    setFormDupMeso({
      nome: `${mesoAtual.nome} (Cópia)`,
      dataInicio: new Date().toISOString().split('T')[0],
      semanas: String(mesoAtual.semanas || 4),
      objetivo: mesoAtual.objetivo || '',
      frequencia: mesoAtual.frequencia ? String(mesoAtual.frequencia) : '',
    });
    setModalDuplicarMeso(true);
  }

  async function handleConfirmarDuplicarMesociclo(e) {
    e.preventDefault();
    if (!mesocicloSelecionadoId || !alunoDestinoDupId) return;
    setDuplicandoMeso(true);
    try {
      const alunoDestObj = alunos.find((a) => String(a.id) === String(alunoDestinoDupId));
      const { novoMesociclo, treinosCriados, exerciciosInativos } = await copiarMesocicloTransacional({
        mesocicloOrigemId: mesocicloSelecionadoId,
        alunoDestino: alunoDestObj || { id: alunoDestinoDupId },
        dadosNovoMeso: formDupMeso,
        manterCargas: manterCargasDup,
        todosExercicios,
      });

      if (String(alunoDestinoDupId) === String(alunoSelecionadoId)) {
        setMesociclos([novoMesociclo, ...mesociclos]);
        setMesocicloSelecionadoId(novoMesociclo.id);
      }

      setModalDuplicarMeso(false);
      let msg = `Mesociclo duplicado com sucesso para ${alunoDestObj?.nome || 'o aluno'} (${treinosCriados.length} treino(s) copiado(s))!`;
      if (exerciciosInativos.length > 0) {
        msg += `\n\n⚠️ ATENÇÃO: Exercícios INATIVOS detectados na cópia:\n• ${exerciciosInativos.join('\n• ')}`;
      }
      window.alert(msg);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDuplicandoMeso(false);
    }
  }

  // Seção 7: Ao buscar exercício dentro do bloco Aquecimento (bloco === '0'),
  // priorizar no topo os exercícios do padrão Mobilidade, permitindo escolher qualquer exercício da Biblioteca.
  const isBlocoAquecimento = bloco === '0';
  const termoNormalizado = normalizarTexto(termoPesquisa);
  const buscaAtiva = termoPesquisa.trim().length >= 2 || (isBlocoAquecimento && termoPesquisa.trim().length === 0);

  const exerciciosFiltrados = (() => {
    if (!buscaAtiva) return [];
    const candidatos = biblioteca.filter((ex) => {
      if (ex.status === 'Inativo') return false;
      if (!termoNormalizado) {
        return ex.padrao === 'Mobilidade' || ex.tipo === 'Mobilidade';
      }
      return (
        normalizarTexto(ex.nome).includes(termoNormalizado) ||
        normalizarTexto(ex.padrao).includes(termoNormalizado) ||
        normalizarTexto(ex.subpadrao).includes(termoNormalizado)
      );
    });

    if (isBlocoAquecimento) {
      candidatos.sort((a, b) => {
        const mobA = a.padrao === 'Mobilidade' || a.tipo === 'Mobilidade' ? 0 : 1;
        const mobB = b.padrao === 'Mobilidade' || b.tipo === 'Mobilidade' ? 0 : 1;
        if (mobA !== mobB) return mobA - mobB;
        return (a.nome || '').localeCompare(b.nome || '');
      });
    }

    return candidatos.slice(0, 15);
  })();

  function selecionarExercicio(ex) {
    setExercicioSelecionadoId(ex.id);
    setDetalhesExercicio(ex);
    const nivelLabel = ex.nivel ? ` • N${ex.nivel}` : '';
    setTermoPesquisa(`${ex.nome} — ${ex.padrao}${nivelLabel}`);
    setMostrarDropdown(false);
    setCriandoExercicioRapido(false);
  }

  function abrirCriacaoRapida() {
    setMostrarDropdown(false);
    setNovoEx({
      nome: termoPesquisa.trim(),
      padrao: isBlocoAquecimento ? 'Mobilidade' : PADROES_OPCOES[0],
      nivel: '',
      tipo: isBlocoAquecimento ? 'Mobilidade' : 'Força',
    });
    setCriandoExercicioRapido(true);
  }

  async function handleSalvarExercicioRapido(e) {
    e.preventDefault();
    if (!novoEx.nome.trim() || !novoEx.padrao) return window.alert('Preencha Nome e Padrão.');

    const nomeNorm = normalizarTexto(novoEx.nome);
    const parecido = todosExercicios.find((item) => normalizarTexto(item.nome) === nomeNorm);
    if (parecido) {
      const confirmar = window.confirm(
        `Já existe um exercício com nome parecido na Biblioteca: "${parecido.nome}" (${parecido.padrao} - Status: ${parecido.status}). Deseja criar mesmo assim?`
      );
      if (!confirmar) return;
    }

    const payload = {
      nome: novoEx.nome.trim(),
      padrao: novoEx.padrao,
      nivel: novoEx.nivel !== '' ? Number(novoEx.nivel) : null,
      tipo: novoEx.tipo,
      status: 'Proposta (revisar)',
      equipamentos: [],
    };

    const { data, error } = await supabase.from('exercicios').insert([payload]).select().single();
    if (error) {
      return window.alert('Erro ao criar exercício: ' + error.message);
    }

    setTodosExercicios([data, ...todosExercicios]);
    setBiblioteca([data, ...biblioteca]);
    selecionarExercicio(data);
    setCriandoExercicioRapido(false);
    window.alert(`"${data.nome}" criado na Biblioteca como "Proposta (revisar)" e selecionado!`);
  }

  function handleAdicionarALista(e) {
    e.preventDefault();
    if (!exercicioSelecionadoId || !series || !repeticoes || bloco === '') {
      return window.alert('Selecione um exercício da Biblioteca e preencha Bloco, Séries e Repetições/Tempo.');
    }

    const equipTexto =
      Array.isArray(detalhesExercicio.equipamentos) && detalhesExercicio.equipamentos.length > 0
        ? detalhesExercicio.equipamentos.join(', ')
        : detalhesExercicio.equipamento_original || 'Livre';

    const novoExercicio = {
      id_unico: Date.now() + Math.floor(Math.random() * 1000),
      tipo: 'exercicio',
      exercicio_id: detalhesExercicio.id,
      bloco: normalizarBloco(bloco),
      nome: detalhesExercicio.nome,
      padrao: detalhesExercicio.padrao,
      subpadrao: detalhesExercicio.subpadrao || null,
      nivel: detalhesExercicio.nivel,
      equipamento: equipTexto,
      midia_url: detalhesExercicio.midia_url || null,
      series,
      repeticoes,
      carga: carga || '-',
      intervalo: intervalo || '-',
      observacao: observacaoExercicio,
      pontos_atencao: detalhesExercicio.pontos_atencao || 'Executar com controle',
      exercicio_inativo: detalhesExercicio.status === 'Inativo',
    };

    setListaExerciciosTreino((prev) => ordenarItensTreinoPorBloco([...prev, novoExercicio]));

    setExercicioSelecionadoId('');
    setDetalhesExercicio(null);
    setTermoPesquisa('');
    setSeries('');
    setRepeticoes('');
    setCarga('');
    setIntervalo('');
    setObservacaoExercicio('');
  }

  // Seção 7: Adicionar item de texto livre no Aquecimento (ex: "5 min de bike leve")
  function handleAdicionarTextoAquecimento(e) {
    e.preventDefault();
    if (!descricaoTextoAquecimento.trim()) {
      return window.alert('Preencha o texto livre do aquecimento (ex: "5 min de bike leve").');
    }

    const novoTextoAq = {
      id_unico: Date.now() + Math.floor(Math.random() * 1000),
      tipo: 'texto',
      exercicio_id: null,
      bloco: '0',
      titulo: tituloTextoAquecimento.trim() || 'Aquecimento (Texto Livre)',
      descricao: descricaoTextoAquecimento,
      duracao_min: null,
    };

    setListaExerciciosTreino((prev) => ordenarItensTreinoPorBloco([...prev, novoTextoAq]));
    setTituloTextoAquecimento('');
    setDescricaoTextoAquecimento('');
    setAdicionandoTextoAquecimento(false);
  }

  // Melhoria 5: Adicionar bloco cardiorrespiratório de texto livre
  function handleAdicionarBlocoCardio(e) {
    e.preventDefault();
    if (!descricaoCardio.trim()) {
      return window.alert('Preencha a descrição do bloco cardiorrespiratório.');
    }

    const novoCardio = {
      id_unico: Date.now() + Math.floor(Math.random() * 1000),
      tipo: 'cardio',
      exercicio_id: null,
      bloco: blocoCardio || '1',
      titulo: tituloCardio.trim() || null,
      descricao: descricaoCardio,
      duracao_min: duracaoCardio !== '' && !Number.isNaN(Number(duracaoCardio)) ? Number(duracaoCardio) : null,
    };

    setListaExerciciosTreino((prev) => ordenarItensTreinoPorBloco([...prev, novoCardio]));
    setTituloCardio('');
    setDescricaoCardio('');
    setDuracaoCardio('');
    setAdicionandoCardio(false);
  }

  // --- EDIÇÃO COMPLETA DOS ITENS NA LISTA (SEÇÃO 6.2: BLOCO, ORDEM, SÉRIES, REPS, CARGA, INTERVALO, OBS, TROCAR EXERCÍCIO, DRAG & DROP) ---
  function atualizarCampoItemNaLista(idUnico, campo, valor) {
    setListaExerciciosTreino((prev) => {
      const atualizada = prev.map((it) => {
        if (String(it.id_unico) !== String(idUnico)) return it;
        return {
          ...it,
          [campo]: valor,
        };
      });
      return campo === 'bloco' ? ordenarItensTreinoPorBloco(atualizada) : atualizada;
    });
  }

  function trocarExercicioDeItemNaLista(idUnico, novoExBib) {
    const equipTexto =
      Array.isArray(novoExBib.equipamentos) && novoExBib.equipamentos.length > 0
        ? novoExBib.equipamentos.join(', ')
        : novoExBib.equipamento_original || 'Livre';

    setListaExerciciosTreino((prev) =>
      prev.map((it) => {
        if (String(it.id_unico) !== String(idUnico)) return it;
        return {
          ...it,
          exercicio_id: novoExBib.id,
          nome: novoExBib.nome,
          padrao: novoExBib.padrao,
          subpadrao: novoExBib.subpadrao || null,
          nivel: novoExBib.nivel,
          equipamento: equipTexto,
          midia_url: novoExBib.midia_url || null,
          pontos_atencao: novoExBib.pontos_atencao || it.pontos_atencao,
          exercicio_inativo: novoExBib.status === 'Inativo',
        };
      })
    );
    setTrocandoItemUnicoId(null);
    setTermoBuscaTrocaItem('');
  }

  function moverItemNaLista(index, direcao) {
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= listaExerciciosTreino.length) return;
    const copia = [...listaExerciciosTreino];
    const [removido] = copia.splice(index, 1);
    copia.splice(novoIndex, 0, removido);
    setListaExerciciosTreino(ordenarItensTreinoPorBloco(copia));
  }

  function handleDropReordenarItem(targetIdx) {
    if (draggedItemIdx === null || draggedItemIdx === targetIdx) {
      setDraggedItemIdx(null);
      return;
    }
    const copia = [...listaExerciciosTreino];
    const [movido] = copia.splice(draggedItemIdx, 1);
    const itemAlvo = listaExerciciosTreino[targetIdx];
    // Se arrastou para cima de um item de outro bloco, adota o bloco do alvo (exceto cardio)
    if (movido && itemAlvo && movido.tipo !== 'cardio' && itemAlvo.tipo !== 'cardio') {
      movido.bloco = normalizarBloco(itemAlvo.bloco);
    }
    copia.splice(targetIdx, 0, movido);
    setListaExerciciosTreino(ordenarItensTreinoPorBloco(copia));
    setDraggedItemIdx(null);
  }

  function removerDaLista(idParaRemover) {
    setListaExerciciosTreino(listaExerciciosTreino.filter((ex) => ex.id_unico !== idParaRemover));
  }

  // --- CANCELAR / SAIR COM VERIFICAÇÃO DE MUDANÇAS NÃO SALVAS (SEÇÃO 6.3) ---
  function handleCancelarEdicaoOuVoltar() {
    if (temMudancasNaoSalvasTreino) {
      const confirmar = window.confirm(
        'Você possui alterações não salvas neste treino. Deseja descartar as mudanças e sair?'
      );
      if (!confirmar) return;
    }
    if (alunoSelecionadoId) {
      navigate(`/alunos/${alunoSelecionadoId}`);
    } else {
      navigate('/dashboard');
    }
  }

  // --- SALVAR TREINO (NOVO OU EDIÇÃO DE TREINO EXISTENTE COM HISTÓRICO - SEÇÃO 6.3) ---
  async function handleSalvarTreinoFinal(e) {
    if (e) e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');
    if (!mesocicloSelecionadoId && !treinoEmEdicaoId) {
      return window.alert('Selecione ou crie um Mesociclo primeiro!');
    }
    if (listaExerciciosTreino.length === 0) {
      return window.alert('Adicione pelo menos um exercício ou bloco ao treino!');
    }

    const alunoObj = alunos.find((a) => String(a.id) === String(alunoSelecionadoId));
    const durAqNum =
      duracaoAquecimentoMin !== '' && !Number.isNaN(Number(duracaoAquecimentoMin))
        ? Number(duracaoAquecimentoMin)
        : null;

    const itensOrdenados = ordenarItensTreinoPorBloco(listaExerciciosTreino).map((item, idx) => ({
      ...item,
      bloco: normalizarBloco(item.bloco),
      ordem: idx + 1,
      ...(normalizarBloco(item.bloco) === '0' && durAqNum ? { duracao_aquecimento_min: durAqNum } : {}),
    }));

    const textoTreino = formatarTextoTreino(itensOrdenados, durAqNum);
    const agoraIso = new Date().toISOString();

    // MODO EDIÇÃO DE TREINO JÁ PRONTO (Seção 6.3)
    if (treinoEmEdicaoId) {
      // 1. Guarda a versão anterior em treinos_historico (mesmo histórico usado na exposição)
      try {
        await supabase.from('treinos_historico').insert([
          {
            treino_id: treinoEmEdicaoId,
            professor_id: professorId,
            professor_nome: professorNome,
            snapshot_itens: treinoOriginalObj?.itens_estruturados || [],
            criado_em: agoraIso,
          },
        ]);
      } catch {
        // ignora caso tabela ainda não exista
      }

      const payloadUpdate = {
        mesociclo_id: mesocicloSelecionadoId || null,
        titulo: titulo.trim() || 'Treino',
        exercicios: textoTreino,
        itens_estruturados: itensOrdenados,
        duracao_aquecimento_min: durAqNum,
        ultima_edicao_em: agoraIso,
        ultima_edicao_por: professorId,
        ultima_edicao_por_nome: professorNome,
        ultima_edicao_aula_em: agoraIso,
        ultima_edicao_aula_por: professorId,
        ultima_edicao_aula_por_nome: professorNome,
        updated_at: agoraIso,
      };

      let { error: errUpd } = await supabase
        .from('treinos')
        .update(payloadUpdate)
        .eq('id', treinoEmEdicaoId);

      if (errUpd) {
        // Fallback compatível com diferentes estágios de migration
        const retry = await supabase
          .from('treinos')
          .update({
            mesociclo_id: mesocicloSelecionadoId || null,
            titulo: titulo.trim() || 'Treino',
            exercicios: textoTreino,
            itens_estruturados: itensOrdenados,
            ultima_edicao_aula_em: agoraIso,
            ultima_edicao_aula_por_nome: professorNome,
          })
          .eq('id', treinoEmEdicaoId);

        if (retry.error) {
          const retryMin = await supabase
            .from('treinos')
            .update({
              mesociclo_id: mesocicloSelecionadoId || null,
              titulo: titulo.trim() || 'Treino',
              exercicios: textoTreino,
              itens_estruturados: itensOrdenados,
            })
            .eq('id', treinoEmEdicaoId);
          if (retryMin.error) {
            return window.alert('Erro ao salvar alterações no treino: ' + retryMin.error.message);
          }
        }
      }

      // Atualiza itens_treino
      await supabase.from('itens_treino').delete().eq('treino_id', treinoEmEdicaoId);
      await salvarItensNaTabelaItensTreino(treinoEmEdicaoId, itensOrdenados);

      setAssinaturaOriginalTreino(serializarEstadoTreino(titulo, duracaoAquecimentoMin, itensOrdenados));
      window.alert('Alterações do treino salvas com sucesso! (A versão anterior foi guardada no histórico).');
      navigate(`/alunos/${alunoSelecionadoId}`);
      return;
    }

    // MODO CRIAÇÃO DE TREINO NOVO
    const payloadInsert = {
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id || null,
      mesociclo_id: mesocicloSelecionadoId,
      titulo: titulo.trim() || 'Treino',
      exercicios: textoTreino,
      itens_estruturados: itensOrdenados,
      duracao_aquecimento_min: durAqNum,
      ordem: treinosDoMesociclo.length + 1,
      observacoes_sensoriais: 'Criado pela Biblioteca Body Puzzle',
    };

    let { data: treinoSalvo, error } = await supabase
      .from('treinos')
      .insert([payloadInsert])
      .select()
      .single();

    if (error && (error.message?.includes('duracao_aquecimento_min') || error.message?.includes('ordem'))) {
      const { duracao_aquecimento_min: _omit, ordem: _ord, ...payloadSemDur } = payloadInsert;
      const retry = await supabase.from('treinos').insert([payloadSemDur]).select().single();
      treinoSalvo = retry.data;
      error = retry.error;
    }

    if (error) {
      return window.alert('Erro ao salvar treino: ' + error.message);
    }

    const { error: errItens } = await salvarItensNaTabelaItensTreino(treinoSalvo.id, itensOrdenados);
    if (errItens) {
      console.warn('Aviso ao sincronizar itens_treino:', errItens.message);
    }

    window.alert('Treino salvo no Mesociclo com sucesso!');
    setTitulo('');
    setDuracaoAquecimentoMin('');
    setListaExerciciosTreino([]);
    setAssinaturaOriginalTreino(serializarEstadoTreino('', '', []));
    if (searchParams.get('alunoId')) {
      navigate(`/alunos/${alunoSelecionadoId}`);
    } else {
      carregarTreinosDoMesocicloAtual(mesocicloSelecionadoId);
    }
  }

  const temItensAquecimento = listaExerciciosTreino.some((i) => normalizarBloco(i.bloco) === '0');
  const auditoriaTreinoAtual = treinoOriginalObj ? formatarAuditoriaAula(treinoOriginalObj) : null;

  const styles = {
    container: { maxWidth: '880px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' },
    title: { color: '#1e293b', fontSize: '23px', fontWeight: '800', margin: 0, textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', color: '#334155', boxSizing: 'border-box', backgroundColor: '#f8fafc', marginBottom: '12px', outline: 'none' },
    sectionBox: { background: '#f1f5f9', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid4: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' },
    btnPrimary: { flex: 2, padding: '15px', background: '#4460B8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancel: { flex: 1, padding: '15px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
    btnSecondary: { padding: '12px 20px', background: '#2DAFAB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    btnOrange: { padding: '12px 20px', background: '#E17900', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    btnOutline: { padding: '10px', background: 'transparent', color: '#4460B8', border: '1px solid #4460B8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px', width: '100%' },
    btnTealOutline: { padding: '10px 14px', background: '#f0fdfa', color: '#0f766e', border: '2px solid #2DAFAB', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13.5px' },
    btnOrangeOutline: { padding: '10px 14px', background: '#fff7ed', color: '#9a3412', border: '2px solid #E17900', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13.5px' },
    searchContainer: { position: 'relative', marginBottom: '15px' },
    dropdownList: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '320px', overflowY: 'auto', zIndex: 20, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
    dropdownItem: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '14px', color: '#334155' },
  };

  return (
    <div style={styles.container}>
      {/* CABEÇALHO DA PÁGINA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '22px' }}>
        <div>
          <h2 style={styles.title}>
            {treinoEmEdicaoId ? `✏️ Editar Treino (${titulo || 'Treino'})` : 'Prescrever Treino'}
          </h2>
          {auditoriaTreinoAtual && (
            <div style={{ marginTop: '4px', fontSize: '12.5px', fontWeight: 'bold', color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 10px', borderRadius: '999px', display: 'inline-block' }}>
              ✏️ {auditoriaTreinoAtual}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {treinoEmEdicaoId && historicoVersoesTreino.length > 0 && (
            <button
              type="button"
              onClick={() => setModalHistoricoAberto(true)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #4460B8',
                background: '#eff6ff',
                color: '#4460B8',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🕒 Histórico de versões ({historicoVersoesTreino.length})
            </button>
          )}
          <button
            type="button"
            onClick={handleCancelarEdicaoOuVoltar}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ← Voltar
          </button>
        </div>
      </div>

      {!carregandoBib && todosExercicios.length === 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderLeft: '5px solid #ea580c', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#9a3412' }}>
          <strong>⚠️ Biblioteca de Exercícios vazia ou bloqueada pelo RLS:</strong> Nenhum exercício foi retornado do banco de dados.
          <div style={{ marginTop: '6px' }}>
            1. Certifique-se de executar o script <code>supabase-prescricao-e-exposicao.sql</code> no SQL Editor do Supabase.<br />
            2. Acesse a <button type="button" onClick={() => navigate('/biblioteca')} style={{ background: 'none', border: 'none', color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>Biblioteca de Exercícios</button> para importar o CSV ou sincronizar Calistenia e Mobilidade.
          </div>
        </div>
      )}

      {/* 1. SELEÇÃO DE ALUNO E MESOCICLO */}
      <div style={styles.sectionBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
            Aluno
          </label>
          {(treinoEmEdicaoId || editandoMesociclo) && (
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              🔒 Para levar um treino para outro aluno, use Importar ou Duplicar (Seção 6.3).
            </span>
          )}
        </div>
        <select
          style={{
            ...styles.input,
            backgroundColor: treinoEmEdicaoId || editandoMesociclo ? '#e2e8f0' : '#f8fafc',
          }}
          value={alunoSelecionadoId}
          disabled={Boolean(treinoEmEdicaoId || editandoMesociclo)}
          onChange={(e) => setAlunoSelecionadoId(e.target.value)}
          required
        >
          <option value="">👤 Selecione o Aluno...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>

        {alunoSelecionadoId && (
          <>
            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#334155' }}>
              Mesociclo
            </label>
            <select
              style={styles.input}
              value={mesocicloSelecionadoId}
              onChange={(e) => setMesocicloSelecionadoId(e.target.value)}
            >
              <option value="">📅 Selecione o Mesociclo...</option>
              {mesociclos.map((m) => {
                const anoMeso = m.data_inicio ? m.data_inicio.slice(0, 4) : '';
                return (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.semanas} sem{anoMeso ? ` • ${anoMeso}` : ''}){m.status === 'Ativo' ? ' — ATIVO' : ''}
                  </option>
                );
              })}
            </select>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                type="button"
                style={{ ...styles.btnOutline, flex: 1, marginBottom: 0 }}
                onClick={() => {
                  const abrir = !criandoMesociclo;
                  setCriandoMesociclo(abrir);
                  if (abrir) {
                    setEditandoMesociclo(false);
                    setAlunoOrigemMesoId(alunoSelecionadoId);
                    setManterCargasMeso(true);
                  }
                }}
              >
                {criandoMesociclo ? 'Cancelar Criação' : '+ Criar Novo Mesociclo'}
              </button>

              {mesocicloSelecionadoId && (
                <>
                  <button
                    type="button"
                    style={{
                      ...styles.btnOutline,
                      flex: 1,
                      marginBottom: 0,
                      borderColor: '#E17900',
                      color: editandoMesociclo ? '#fff' : '#9a3412',
                      background: editandoMesociclo ? '#E17900' : '#fff7ed',
                    }}
                    onClick={() => {
                      setEditandoMesociclo(!editandoMesociclo);
                      setCriandoMesociclo(false);
                    }}
                  >
                    {editandoMesociclo ? 'Fechar Edição do Mesociclo' : '✏️ Editar Mesociclo e Treinos'}
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.btnOutline, flex: 1, marginBottom: 0, borderColor: '#2DAFAB', color: '#0f766e' }}
                    onClick={() => {
                      const abrir = !painelImportarTreino;
                      setPainelImportarTreino(abrir);
                      if (abrir) {
                        setAlunoOrigemTreinoId(alunoSelecionadoId);
                        setManterCargasTreino(true);
                      }
                    }}
                  >
                    {painelImportarTreino ? 'Fechar Importação' : '📥 Importar Treino'}
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.btnOutline, flex: 1, marginBottom: 0, borderColor: '#64748b', color: '#334155' }}
                    onClick={abrirModalDuplicarMesocicloAtual}
                  >
                    📋 Duplicar Mesociclo para...
                  </button>
                </>
              )}
            </div>

            {/* PAINEL DE EDIÇÃO COMPLETA DO MESOCICLO E SEUS TREINOS (SEÇÃO 6.2) */}
            {editandoMesociclo && mesocicloSelecionadoId && (
              <form
                onSubmit={handleSalvarEdicaoMesociclo}
                style={{ background: '#ffffff', padding: '18px', borderRadius: '10px', border: '2px solid #E17900', marginBottom: '16px' }}
              >
                <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#9a3412' }}>
                  ✏️ Editar Mesociclo e Ordem dos Treinos
                </h4>

                <div style={styles.grid2}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nome do Mesociclo *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formEditarMeso.nome}
                      onChange={(e) => setFormEditarMeso({ ...formEditarMeso, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Objetivo / Foco</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Ex: Força Base"
                      value={formEditarMeso.objetivo}
                      onChange={(e) => setFormEditarMeso({ ...formEditarMeso, objetivo: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Data de Início *</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formEditarMeso.dataInicio}
                      onChange={(e) => setFormEditarMeso({ ...formEditarMeso, dataInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Número de Semanas *</label>
                    <input
                      type="number"
                      min="1"
                      style={styles.input}
                      value={formEditarMeso.semanas}
                      onChange={(e) => setFormEditarMeso({ ...formEditarMeso, semanas: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Frequência (x/sem)</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      style={styles.input}
                      value={formEditarMeso.frequencia}
                      onChange={(e) => setFormEditarMeso({ ...formEditarMeso, frequencia: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Observações do Mesociclo</label>
                  <textarea
                    rows={2}
                    style={{ ...styles.input, fontFamily: 'inherit', resize: 'vertical' }}
                    placeholder="Observações gerais deste mesociclo..."
                    value={formEditarMeso.observacoes}
                    onChange={(e) => setFormEditarMeso({ ...formEditarMeso, observacoes: e.target.value })}
                  />
                </div>

                {/* GESTÃO DOS TREINOS DO MESOCICLO: RENOMEAR, MUDAR ORDEM, EDITAR ITENS, ADICIONAR NOVO, EXCLUIR */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      🏋️ Treinos deste Mesociclo ({treinosDoMesociclo.length}):
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setTreinoEmEdicaoId('');
                        carregarTreinoParaEdicao('');
                        setEditandoMesociclo(false);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#4460B8',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      + Adicionar Treino Novo
                    </button>
                  </div>

                  {treinosDoMesociclo.length === 0 ? (
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Nenhum treino ativo neste mesociclo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {treinosDoMesociclo.map((t, idx) => {
                        const isEditandoEste = String(treinoEmEdicaoId) === String(t.id);
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: isEditandoEste ? '#eff6ff' : '#ffffff',
                              border: isEditandoEste ? '1px solid #4460B8' : '1px solid #cbd5e1',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', minWidth: '22px' }}>
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={t.titulo || ''}
                              onChange={(e) => renomearTreinoDoMesocicloLocal(t.id, e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 'bold',
                                fontSize: '13.5px',
                              }}
                            />
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moverTreinoDoMesociclo(idx, -1)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                              title="Subir na ordem do mesociclo"
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              disabled={idx === treinosDoMesociclo.length - 1}
                              onClick={() => moverTreinoDoMesociclo(idx, 1)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: idx === treinosDoMesociclo.length - 1 ? 'not-allowed' : 'pointer' }}
                              title="Descer na ordem do mesociclo"
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              onClick={() => setTreinoEmEdicaoId(String(t.id))}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '5px',
                                border: '1px solid #4460B8',
                                background: isEditandoEste ? '#4460B8' : '#eff6ff',
                                color: isEditandoEste ? '#fff' : '#4460B8',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              {isEditandoEste ? 'Editando abaixo' : '✏️ Editar Itens'}
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirTreinoDoMesocicloParaLixeira(t)}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '5px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#991b1b',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                              title="Mover treino para a Lixeira"
                            >
                              🗑️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={salvandoMeso} style={styles.btnOrange}>
                    {salvandoMeso ? 'Salvando Mesociclo...' : '💾 Salvar Alterações do Mesociclo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoMesociclo(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {criandoMesociclo && (
              <form
                onSubmit={handleSalvarNovoMesociclo}
                style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              >
                <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#1e293b' }}>Criar Novo Mesociclo</h4>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', color: '#4460B8' }}>
                    <input
                      type="checkbox"
                      checked={copiarDeExistente}
                      onChange={(e) => {
                        setCopiarDeExistente(e.target.checked);
                        if (e.target.checked && !alunoOrigemMesoId) {
                          setAlunoOrigemMesoId(alunoSelecionadoId);
                          setManterCargasMeso(true);
                        }
                      }}
                    />
                    📋 Copiar treinos de um mesociclo anterior (do mesmo ou de outro aluno)
                  </label>

                  {copiarDeExistente && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={styles.grid2}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Aluno de Origem</label>
                          <select
                            style={styles.input}
                            value={alunoOrigemMesoId}
                            onChange={(e) => setAlunoOrigemMesoId(e.target.value)}
                          >
                            {alunos.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nome} {String(a.id) === String(alunoSelecionadoId) ? '(Mesmo aluno)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Mesociclo de Origem *</label>
                          <select
                            style={styles.input}
                            value={mesocicloOrigemId}
                            onChange={(e) => {
                              const idOrig = e.target.value;
                              setMesocicloOrigemId(idOrig);
                              const mOrig = mesociclosOrigem.find((m) => String(m.id) === String(idOrig));
                              if (mOrig && !novoMeso.nome) {
                                setNovoMeso((prev) => ({
                                  ...prev,
                                  nome: `${mOrig.nome} (Cópia)`,
                                  semanas: String(mOrig.semanas || prev.semanas || 4),
                                  objetivo: mOrig.objetivo || prev.objetivo,
                                  frequencia: mOrig.frequencia ? String(mOrig.frequencia) : prev.frequencia,
                                }));
                              }
                            }}
                            required={copiarDeExistente}
                          >
                            <option value="">Selecione o mesociclo...</option>
                            {mesociclosOrigem.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nome} ({m.data_inicio ? new Date(`${m.data_inicio}T00:00:00`).toLocaleDateString('pt-BR') : '-'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={manterCargasMeso}
                          onChange={(e) => setManterCargasMeso(e.target.checked)}
                        />
                        Manter cargas dos exercícios{' '}
                        <span style={{ fontWeight: 'normal', color: '#64748b' }}>
                          ({String(alunoOrigemMesoId) === String(alunoSelecionadoId) ? 'padrão ativado para o mesmo aluno' : 'padrão desativado para outro aluno'})
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  style={styles.input}
                  placeholder="Nome do Novo Mesociclo (Ex: Mesociclo 1-2026)"
                  value={novoMeso.nome}
                  onChange={(e) => setNovoMeso({ ...novoMeso, nome: e.target.value })}
                  required
                />
                <div style={styles.grid2}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Data Início *</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={novoMeso.dataInicio}
                      onChange={(e) => setNovoMeso({ ...novoMeso, dataInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Semanas (Ex: 4) *</label>
                    <input
                      type="number"
                      min="1"
                      style={styles.input}
                      value={novoMeso.semanas}
                      onChange={(e) => setNovoMeso({ ...novoMeso, semanas: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={styles.grid2}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Foco / Objetivo (Ex: Força Base)"
                    value={novoMeso.objetivo}
                    onChange={(e) => setNovoMeso({ ...novoMeso, objetivo: e.target.value })}
                  />
                  <input
                    type="number"
                    min="1"
                    max="7"
                    style={styles.input}
                    placeholder="Frequência semanal (Ex: 2)"
                    value={novoMeso.frequencia}
                    onChange={(e) => setNovoMeso({ ...novoMeso, frequencia: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Observações do mesociclo (opcional)"
                  value={novoMeso.observacoes}
                  onChange={(e) => setNovoMeso({ ...novoMeso, observacoes: e.target.value })}
                />
                <button type="submit" disabled={salvandoMeso} style={styles.btnSecondary}>
                  {salvandoMeso ? 'Salvando...' : copiarDeExistente ? 'Criar e Copiar Mesociclo' : 'Salvar Mesociclo'}
                </button>
              </form>
            )}

            {painelImportarTreino && (
              <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '2px solid #2DAFAB', marginBottom: '14px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#0f766e' }}>📥 Importar Treino para este Mesociclo</h4>
                <div style={styles.grid2}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Aluno de Origem</label>
                    <select
                      style={styles.input}
                      value={alunoOrigemTreinoId}
                      onChange={(e) => setAlunoOrigemTreinoId(e.target.value)}
                    >
                      {alunos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome} {String(a.id) === String(alunoSelecionadoId) ? '(Mesmo aluno)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Treino a Importar</label>
                    <select
                      style={styles.input}
                      value={treinoOrigemSelecionadoId}
                      onChange={(e) => setTreinoOrigemSelecionadoId(e.target.value)}
                    >
                      <option value="">Selecione um treino...</option>
                      {treinosOrigemLista.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.titulo || 'Treino'} — {t.mesociclos?.nome || 'Treino avulso'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={manterCargasTreino}
                    onChange={(e) => setManterCargasTreino(e.target.checked)}
                  />
                  Trazer cargas dos exercícios
                </label>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={!treinoOrigemSelecionadoId || importandoTreino}
                    onClick={() => handleExecutarImportacaoTreino(false)}
                    style={{ ...styles.btnSecondary, background: '#4460B8' }}
                  >
                    ✏️ Carregar na Tela para Editar
                  </button>
                  <button
                    type="button"
                    disabled={!treinoOrigemSelecionadoId || importandoTreino}
                    onClick={() => handleExecutarImportacaoTreino(true)}
                    style={styles.btnSecondary}
                  >
                    {importandoTreino ? 'Importando...' : '⚡ Importar Direto no Mesociclo'}
                  </button>
                </div>
              </div>
            )}

            {/* FAIXA RÁPIDA DE TREINOS DO MESOCICLO PARA ALTERNAR ENTRE ELES OU CRIAR NOVO */}
            {treinosDoMesociclo.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  Treinos do mesociclo:
                </span>
                {treinosDoMesociclo.map((t) => {
                  const ativo = String(treinoEmEdicaoId) === String(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (temMudancasNaoSalvasTreino && !window.confirm('Descartar alterações não salvas e abrir outro treino?')) {
                          return;
                        }
                        setTreinoEmEdicaoId(String(t.id));
                      }}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '999px',
                        border: ativo ? 'none' : '1px solid #cbd5e1',
                        background: ativo ? '#4460B8' : '#ffffff',
                        color: ativo ? '#ffffff' : '#334155',
                        fontWeight: 'bold',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ {t.titulo || 'Treino'}
                    </button>
                  );
                })}
                {treinoEmEdicaoId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (temMudancasNaoSalvasTreino && !window.confirm('Descartar alterações não salvas e criar um treino novo?')) {
                        return;
                      }
                      setTreinoEmEdicaoId('');
                      carregarTreinoParaEdicao('');
                    }}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '999px',
                      border: '1px solid #2DAFAB',
                      background: '#f0fdfa',
                      color: '#0f766e',
                      fontWeight: 'bold',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    + Criar Novo Treino
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* TÍTULO DO TREINO E DURAÇÃO DO AQUECIMENTO */}
      <div style={styles.grid2}>
        <div>
          <label style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
            Título do Treino *
          </label>
          <input
            type="text"
            style={styles.input}
            placeholder="📝 Ex: Treino A"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div>
          <label style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#E17900', display: 'block', marginBottom: '4px' }}>
            🔥 Duração total do aquecimento em min (opcional)
          </label>
          <input
            type="number"
            min="1"
            style={{ ...styles.input, borderColor: temItensAquecimento || isBlocoAquecimento ? '#E17900' : '#cbd5e1' }}
            placeholder="Ex: 10 (exibido no cabeçalho do Aquecimento)"
            value={duracaoAquecimentoMin}
            onChange={(e) => setDuracaoAquecimentoMin(e.target.value)}
          />
        </div>
      </div>

      {/* 2. ADICIONAR EXERCÍCIOS E BLOCOS (AQUECIMENTO #E17900, BLOCOS #4460B8, CARDIO #2DAFAB) */}
      <div
        style={{
          ...styles.sectionBox,
          borderLeft: isBlocoAquecimento ? '6px solid #E17900' : '6px solid #4460B8',
          background: isBlocoAquecimento ? '#fff7ed' : '#f1f5f9',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, color: isBlocoAquecimento ? '#9a3412' : '#1e293b' }}>
            {isBlocoAquecimento ? '🔥 Adicionar ao Bloco de Aquecimento' : '+ Adicionar Exercício da Biblioteca'}
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={styles.btnOrangeOutline}
              onClick={() => {
                setBloco('0');
                setAdicionandoTextoAquecimento(!adicionandoTextoAquecimento);
                setAdicionandoCardio(false);
              }}
            >
              {adicionandoTextoAquecimento ? 'Fechar Texto Aquecimento' : '🔥 + Texto livre no Aquecimento'}
            </button>
            <button
              type="button"
              style={styles.btnTealOutline}
              onClick={() => {
                setAdicionandoCardio(!adicionandoCardio);
                setAdicionandoTextoAquecimento(false);
                setBlocoCardio(bloco === '0' ? '1' : bloco);
              }}
            >
              {adicionandoCardio ? 'Fechar Bloco Cardio' : '🫀 + Adicionar bloco cardiorrespiratório'}
            </button>
          </div>
        </div>

        {/* FORMULÁRIO DE TEXTO LIVRE NO AQUECIMENTO (SEÇÃO 7) */}
        {adicionandoTextoAquecimento && (
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '2px solid #E17900', marginBottom: '18px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#E17900' }}>
              🔥 Item de Texto Livre no Aquecimento (Bloco 0)
            </h4>
            <div style={styles.grid2}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#9a3412' }}>Título (opcional)</label>
                <input
                  type="text"
                  style={{ ...styles.input, background: '#fff' }}
                  placeholder="Ex: Ativação Geral / Bike Leve"
                  value={tituloTextoAquecimento}
                  onChange={(e) => setTituloTextoAquecimento(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#9a3412' }}>Duração total do Aquecimento (min, opcional)</label>
                <input
                  type="number"
                  min="1"
                  style={{ ...styles.input, background: '#fff' }}
                  placeholder="Ex: 8"
                  value={duracaoAquecimentoMin}
                  onChange={(e) => setDuracaoAquecimentoMin(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#9a3412', display: 'block', marginBottom: '4px' }}>
                Descrição do aquecimento livre * (ex: &quot;5 min de bike leve&quot;)
              </label>
              <textarea
                rows={3}
                style={{ ...styles.input, background: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
                placeholder={'Ex:\n5 min de bike leve\n2x 10 liberações miofasciais'}
                value={descricaoTextoAquecimento}
                onChange={(e) => setDescricaoTextoAquecimento(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleAdicionarTextoAquecimento} style={styles.btnOrange}>
                + Inserir Texto no Aquecimento
              </button>
              <button
                type="button"
                onClick={() => setAdicionandoTextoAquecimento(false)}
                style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* FORMULÁRIO DE BLOCO CARDIORRESPIRATÓRIO DE TEXTO LIVRE (MELHORIA 5) */}
        {adicionandoCardio && (
          <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '10px', border: '2px solid #2DAFAB', marginBottom: '18px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#0f766e' }}>
              🫀 Novo Bloco Cardiorrespiratório (Texto Livre)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e' }}>Bloco</label>
                <select
                  style={{ ...styles.input, background: '#fff' }}
                  value={blocoCardio}
                  onChange={(e) => setBlocoCardio(e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e' }}>Título (opcional)</label>
                <input
                  type="text"
                  style={{ ...styles.input, background: '#fff' }}
                  placeholder="Ex: HIIT na Bike / Corrida Contínua"
                  value={tituloCardio}
                  onChange={(e) => setTituloCardio(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e' }}>Duração em min (opcional)</label>
                <input
                  type="number"
                  min="1"
                  style={{ ...styles.input, background: '#fff' }}
                  placeholder="Ex: 15"
                  value={duracaoCardio}
                  onChange={(e) => setDuracaoCardio(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', display: 'block', marginBottom: '4px' }}>
                Descrição do protocolo * (quebras de linha serão preservadas)
              </label>
              <textarea
                rows={4}
                style={{ ...styles.input, background: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
                placeholder={'Ex:\n3 min aquecimento leve\n8x (30s forte / 30s leve)\n2 min volta à calma'}
                value={descricaoCardio}
                onChange={(e) => setDescricaoCardio(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleAdicionarBlocoCardio} style={styles.btnSecondary}>
                + Inserir Bloco Cardio no Treino
              </button>
              <button
                type="button"
                onClick={() => setAdicionandoCardio(false)}
                style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* SELETOR DE BLOCO E PARÂMETROS */}
        <div style={styles.grid4}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: isBlocoAquecimento ? '#E17900' : '#334155' }}>
              Bloco *
            </label>
            <select
              style={{
                ...styles.input,
                background: '#fff',
                fontWeight: 'bold',
                borderColor: isBlocoAquecimento ? '#E17900' : '#cbd5e1',
                color: isBlocoAquecimento ? '#E17900' : '#334155',
              }}
              value={bloco}
              onChange={(e) => setBloco(e.target.value)}
            >
              <option value="0">🔥 Aquecimento</option>
              <option value="1">Bloco 1</option>
              <option value="2">Bloco 2</option>
              <option value="3">Bloco 3</option>
              <option value="4">Bloco 4</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Séries *</label>
            <input
              type="text"
              style={{ ...styles.input, background: '#fff' }}
              placeholder="Ex: 2 ou 4"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {isBlocoAquecimento ? 'Reps ou Tempo *' : 'Repetições *'}
            </label>
            <input
              type="text"
              style={{ ...styles.input, background: '#fff' }}
              placeholder={isBlocoAquecimento ? 'Ex: 30 s ou 10/lado' : 'Ex: 8-10'}
              value={repeticoes}
              onChange={(e) => setRepeticoes(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Intervalo (opcional)</label>
            <input
              type="text"
              style={{ ...styles.input, background: '#fff' }}
              placeholder="Ex: 60s"
              value={intervalo}
              onChange={(e) => setIntervalo(e.target.value)}
            />
          </div>
        </div>

        {/* BUSCA DE EXERCÍCIOS (COM PRIORIDADE DE MOBILIDADE NO TOPO QUANDO BLOCO = AQUECIMENTO) */}
        <div style={styles.searchContainer}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: isBlocoAquecimento ? '#9a3412' : '#334155' }}>
            {isBlocoAquecimento
              ? '🔍 Buscar Exercício para o Aquecimento (exercícios de Mobilidade aparecem priorizados no topo)'
              : '🔍 Buscar Exercício na Biblioteca'}
          </label>
          <input
            type="text"
            style={{ ...styles.input, marginBottom: 0, background: '#fff' }}
            placeholder={
              isBlocoAquecimento
                ? '🔍 Clique ou digite para buscar (Mobilidade priorizada no topo)...'
                : '🔍 Digite pelo menos 2 letras para buscar (ex: Squat, Bulgaro, Front Lever)...'
            }
            value={termoPesquisa}
            onChange={(e) => {
              setTermoPesquisa(e.target.value);
              setMostrarDropdown(true);
              setExercicioSelecionadoId('');
              setDetalhesExercicio(null);
            }}
            onFocus={() => setMostrarDropdown(true)}
            onBlur={() => setTimeout(() => setMostrarDropdown(false), 220)}
          />

          {mostrarDropdown && (termoPesquisa.trim().length > 0 || isBlocoAquecimento) && (
            <div style={styles.dropdownList}>
              {!buscaAtiva ? (
                <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>
                  Digite pelo menos 2 letras para buscar na Biblioteca...
                </div>
              ) : (
                <>
                  {isBlocoAquecimento && (
                    <div style={{ padding: '6px 14px', background: '#fff7ed', color: '#9a3412', fontSize: '11.5px', fontWeight: 'bold', borderBottom: '1px solid #fed7aa' }}>
                      🔥 Bloco de Aquecimento: exercícios de Mobilidade priorizados no topo
                    </div>
                  )}
                  {exerciciosFiltrados.map((ex) => {
                    const isMob = ex.padrao === 'Mobilidade' || ex.tipo === 'Mobilidade';
                    return (
                      <div
                        key={ex.id}
                        style={{
                          ...styles.dropdownItem,
                          background: isBlocoAquecimento && isMob ? '#fffbeb' : '#fff',
                        }}
                        onMouseDown={() => selecionarExercicio(ex)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isBlocoAquecimento && isMob ? '#fffbeb' : '#fff')
                        }
                      >
                        {isBlocoAquecimento && isMob && (
                          <span
                            style={{
                              background: '#E17900',
                              color: '#fff',
                              fontSize: '10.5px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '999px',
                              marginRight: '6px',
                            }}
                          >
                            MOBILIDADE
                          </span>
                        )}
                        <strong>{ex.nome}</strong>{' '}
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                          — {ex.padrao} {ex.subpadrao ? `(${ex.subpadrao})` : ''} {ex.nivel ? `• N${ex.nivel}` : ''}
                        </span>
                      </div>
                    );
                  })}

                  {exerciciosFiltrados.length === 0 && (
                    <div style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>
                      Nenhum exercício ativo encontrado para &quot;{termoPesquisa.trim()}&quot;.
                    </div>
                  )}

                  {termoPesquisa.trim().length >= 2 && (
                    <div
                      style={{ ...styles.dropdownItem, background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold' }}
                      onMouseDown={abrirCriacaoRapida}
                    >
                      + Criar exercício &quot;{termoPesquisa.trim()}&quot;
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Mini-formulário de Criação Rápida (Proposta) */}
        {criandoExercicioRapido && (
          <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '2px solid #3b82f6', marginBottom: '15px' }}>
            <h4 style={{ marginTop: 0, color: '#1e3a8a' }}>Novo Exercício (Entra como Proposta para revisar)</h4>
            <div style={styles.grid2}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nome *</label>
                <input style={styles.input} value={novoEx.nome} onChange={(e) => setNovoEx({ ...novoEx, nome: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Padrão *</label>
                <select style={styles.input} value={novoEx.padrao} onChange={(e) => setNovoEx({ ...novoEx, padrao: e.target.value })}>
                  {PADROES_OPCOES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nível (1–5)</label>
                <input type="number" min="1" max="5" placeholder="Opcional" style={styles.input} value={novoEx.nivel} onChange={(e) => setNovoEx({ ...novoEx, nivel: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo *</label>
                <select style={styles.input} value={novoEx.tipo} onChange={(e) => setNovoEx({ ...novoEx, tipo: e.target.value })}>
                  {TIPOS_OPCOES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleSalvarExercicioRapido} style={styles.btnSecondary}>
                Salvar e Usar
              </button>
              <button type="button" onClick={() => setCriandoExercicioRapido(false)} style={{ padding: '10px 14px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={styles.grid2}>
          <input
            type="text"
            style={{ ...styles.input, background: '#fff' }}
            placeholder="Carga (opcional, ex: 20)"
            value={carga}
            onChange={(e) => setCarga(e.target.value)}
          />
          <input
            type="text"
            style={{ ...styles.input, background: '#fff' }}
            placeholder="Observação específica (opcional)"
            value={observacaoExercicio}
            onChange={(e) => setObservacaoExercicio(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleAdicionarALista}
          style={isBlocoAquecimento ? styles.btnOrange : styles.btnSecondary}
        >
          {isBlocoAquecimento ? '🔥 Adicionar Exercício ao Aquecimento' : 'Adicionar Exercício ao Treino'}
        </button>
      </div>

      {/* 3. LISTA DO TREINO REORDENÁVEL E TOTALMENTE EDITÁVEL (SEÇÃO 6.2) */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0 }}>
              🛒 Itens no Treino ({listaExerciciosTreino.length}) — edite campos, troque exercícios ou arraste para reordenar:
            </h4>
          </div>
          {temItensAquecimento && (
            <span style={{ background: '#fff7ed', color: '#E17900', border: '1px solid #E17900', padding: '4px 10px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 'bold' }}>
              🔥 Aquecimento{duracaoAquecimentoMin ? `: ${duracaoAquecimentoMin} min` : ' ativo'}
            </span>
          )}
        </div>

        {listaExerciciosTreino.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
            Nenhum exercício ou bloco adicionado ainda. Use o painel acima para adicionar exercícios, aquecimento ou cardio.
          </div>
        ) : (
          listaExerciciosTreino.map((item, idx) => {
            const isCardio = item.tipo === 'cardio';
            const isAquecimento = normalizarBloco(item.bloco) === '0';
            const isTextoLivre = item.tipo === 'texto';
            const isInativo = !isCardio && !isTextoLivre && verificarExercicioInativo(item, todosExercicios);
            const estaTrocando = trocandoItemUnicoId === item.id_unico;

            const corBorda = isAquecimento
              ? '#E17900'
              : isCardio
              ? '#2DAFAB'
              : isInativo
              ? '#ef4444'
              : '#4460B8';

            const corFundo = isAquecimento
              ? '#fff7ed'
              : isCardio
              ? '#f0fdfa'
              : isInativo
              ? '#fef2f2'
              : '#fff';

            return (
              <div
                key={item.id_unico}
                draggable
                onDragStart={() => setDraggedItemIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropReordenarItem(idx)}
                style={{
                  background: corFundo,
                  padding: '14px',
                  borderRadius: '8px',
                  border: `1px solid ${isAquecimento ? '#fed7aa' : isCardio ? '#99f6e4' : isInativo ? '#fecaca' : '#e2e8f0'}`,
                  borderLeft: `6px solid ${corBorda}`,
                  marginBottom: '10px',
                  opacity: draggedItemIdx === idx ? 0.55 : 1,
                  cursor: 'grab',
                }}
              >
                {/* LINHA SUPERIOR DO ITEM: BLOCO, NOME, BOTÕES TROCAR / MOVER / REMOVER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span title="Arraste para reordenar" style={{ cursor: 'grab', color: '#64748b', fontSize: '15px' }}>
                      ⠿
                    </span>

                    <select
                      value={normalizarBloco(item.bloco)}
                      onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'bloco', e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 'bold',
                        fontSize: '12.5px',
                        background: '#ffffff',
                        color: isAquecimento ? '#E17900' : isCardio ? '#0f766e' : '#1e293b',
                      }}
                    >
                      {!isCardio && <option value="0">🔥 Aquecimento</option>}
                      <option value="1">Bloco 1</option>
                      <option value="2">Bloco 2</option>
                      <option value="3">Bloco 3</option>
                      <option value="4">Bloco 4</option>
                    </select>

                    {!isCardio && !isTextoLivre && (
                      <>
                        <strong style={{ fontSize: '15px', color: isAquecimento ? '#9a3412' : '#0f172a' }}>
                          {item.nome}
                        </strong>
                        {item.padrao && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>({item.padrao})</span>
                        )}
                      </>
                    )}

                    {isInativo && (
                      <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                        ⚠️ Exercício Inativo na Biblioteca
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isCardio && !isTextoLivre && (
                      <button
                        type="button"
                        onClick={() => {
                          setTrocandoItemUnicoId(estaTrocando ? null : item.id_unico);
                          setTermoBuscaTrocaItem('');
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #4460B8',
                          background: estaTrocando ? '#4460B8' : '#eff6ff',
                          color: estaTrocando ? '#fff' : '#4460B8',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🔄 {estaTrocando ? 'Fechar Troca' : 'Trocar exercício'}
                      </button>
                    )}

                    <button
                      type="button"
                      title="Subir"
                      disabled={idx === 0}
                      onClick={() => moverItemNaLista(idx, -1)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        opacity: idx === 0 ? 0.4 : 1,
                      }}
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      title="Descer"
                      disabled={idx === listaExerciciosTreino.length - 1}
                      onClick={() => moverItemNaLista(idx, 1)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        cursor: idx === listaExerciciosTreino.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: idx === listaExerciciosTreino.length - 1 ? 0.4 : 1,
                      }}
                    >
                      ⬇️
                    </button>
                    <button
                      type="button"
                      onClick={() => removerDaLista(item.id_unico)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                      title="Remover item do treino"
                    >
                      X
                    </button>
                  </div>
                </div>

                {/* PAINEL INLINE DE TROCA DE EXERCÍCIO (SEÇÃO 6.2) */}
                {estaTrocando && (() => {
                  const termoNorm = normalizarTexto(termoBuscaTrocaItem);
                  const opcoes = biblioteca
                    .filter((ex) => {
                      if (!termoNorm) return isAquecimento ? ex.padrao === 'Mobilidade' : true;
                      return (
                        normalizarTexto(ex.nome).includes(termoNorm) ||
                        normalizarTexto(ex.padrao).includes(termoNorm)
                      );
                    })
                    .slice(0, 12);

                  return (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Digite o nome do novo exercício para substituir..."
                        value={termoBuscaTrocaItem}
                        onChange={(e) => setTermoBuscaTrocaItem(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                        {opcoes.map((ex) => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => trocarExercicioDeItemNaLista(item.id_unico, ex)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '12.5px',
                            }}
                          >
                            <strong>{ex.nome}</strong> <span style={{ color: '#64748b' }}>({ex.padrao})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* CAMPOS EDITÁVEIS INLINE DO ITEM (SÉRIES, REPS, CARGA, INTERVALO, OBS / TEXTO LIVRE) */}
                {isCardio || isTextoLivre ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isCardio ? '2fr 1fr' : '1fr', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Título do bloco"
                        value={item.titulo || ''}
                        onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'titulo', e.target.value)}
                        style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13.5px', fontWeight: 'bold' }}
                      />
                      {isCardio && (
                        <input
                          type="number"
                          min="1"
                          placeholder="Duração (min)"
                          value={item.duracao_min ?? ''}
                          onChange={(e) =>
                            atualizarCampoItemNaLista(
                              item.id_unico,
                              'duracao_min',
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13.5px' }}
                        />
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={item.descricao || ''}
                      onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'descricao', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13.5px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Séries</label>
                        <input
                          type="text"
                          value={item.series || ''}
                          onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'series', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Repetições / Tempo</label>
                        <input
                          type="text"
                          value={item.repeticoes || ''}
                          onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'repeticoes', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Carga prescrita (kg)</label>
                        <input
                          type="text"
                          value={item.carga || ''}
                          onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'carga', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Intervalo</label>
                        <input
                          type="text"
                          value={item.intervalo || ''}
                          onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'intervalo', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Observação do exercício (opcional)..."
                      value={item.observacao || ''}
                      onChange={(e) => atualizarCampoItemNaLista(item.id_unico, 'observacao', e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* BOTÕES SALVAR E CANCELAR NO FIM DA TELA (SEÇÃO 6.3) */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={handleCancelarEdicaoOuVoltar}
            style={styles.btnCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvarTreinoFinal}
            style={styles.btnPrimary}
          >
            {treinoEmEdicaoId ? '💾 Salvar Alterações no Treino' : '💾 Salvar Treino no Mesociclo'}
          </button>
        </div>
      </div>

      {/* MODAL DE HISTÓRICO DE VERSÕES DO TREINO (SEÇÃO 6.3) */}
      {modalHistoricoAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>🕒 Histórico de Versões ({titulo || 'Treino'})</h3>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Fechar
              </button>
            </div>
            {historicoVersoesTreino.map((h, i) => {
              const dt = new Date(h.criado_em);
              const itensSnap = Array.isArray(h.snapshot_itens) ? h.snapshot_itens : [];
              return (
                <div
                  key={h.id || i}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                      Versão anterior a {dt.toLocaleDateString('pt-BR')} às {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — por {h.professor_nome || 'Professor'}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setListaExerciciosTreino(garantirIdsItensPrescricao(itensSnap));
                        setModalHistoricoAberto(false);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #4460B8',
                        background: '#eff6ff',
                        color: '#4460B8',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Carregar esta versão na tela
                    </button>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569' }}>
                    {itensSnap.map((it, idxIt) => (
                      <div key={idxIt}>
                        • [{normalizarBloco(it.bloco) === '0' ? 'Aquecimento' : `Bloco ${it.bloco || 1}`}] {it.nome || it.titulo}: {it.series ? `${it.series}×${it.repeticoes} (${it.carga || '-'} kg)` : it.descricao}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR MESOCICLO PARA... */}
      {modalDuplicarMeso && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>📋 Duplicar Mesociclo para...</h3>
            <form onSubmit={handleConfirmarDuplicarMesociclo}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Aluno de Destino *</label>
                <select
                  style={styles.input}
                  value={alunoDestinoDupId}
                  onChange={(e) => {
                    const destId = e.target.value;
                    setAlunoDestinoDupId(destId);
                    setManterCargasDup(String(destId) === String(alunoSelecionadoId));
                  }}
                  required
                >
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} {String(a.id) === String(alunoSelecionadoId) ? '(Mesmo aluno)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Nome do Novo Mesociclo *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formDupMeso.nome}
                  onChange={(e) => setFormDupMeso({ ...formDupMeso, nome: e.target.value })}
                  required
                />
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Data de Início *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formDupMeso.dataInicio}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, dataInicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Semanas *</label>
                  <input
                    type="number"
                    min="1"
                    style={styles.input}
                    value={formDupMeso.semanas}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, semanas: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Objetivo</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formDupMeso.objetivo}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, objetivo: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 'bold' }}>Frequência Semanal</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    style={styles.input}
                    value={formDupMeso.frequencia}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, frequencia: e.target.value })}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 'bold', color: '#334155', marginBottom: '16px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manterCargasDup}
                  onChange={(e) => setManterCargasDup(e.target.checked)}
                />
                Manter cargas dos exercícios (inclui bloco Aquecimento e duração)
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalDuplicarMeso(false)}
                  style={{ padding: '10px 14px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={duplicandoMeso} style={styles.btnSecondary}>
                  {duplicandoMeso ? 'Duplicando...' : 'Confirmar Duplicação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
