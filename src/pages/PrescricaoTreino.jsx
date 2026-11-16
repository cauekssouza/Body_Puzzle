import { useState, useEffect } from 'react';
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
} from '../utils/prescricaoUtils';

export default function PrescricaoTreino() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState(searchParams.get('alunoId') || '');

  // Estados para Mesociclos
  const [mesociclos, setMesociclos] = useState([]);
  const [mesocicloSelecionadoId, setMesocicloSelecionadoId] = useState(searchParams.get('mesocicloId') || '');
  const [criandoMesociclo, setCriandoMesociclo] = useState(false);
  const [salvandoMeso, setSalvandoMeso] = useState(false);
  const [novoMeso, setNovoMeso] = useState({
    nome: '',
    dataInicio: new Date().toISOString().split('T')[0],
    semanas: '4',
    objetivo: '',
    frequencia: '',
  });

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

  useEffect(() => {
    const idUrl = searchParams.get('alunoId');
    const mesoUrl = searchParams.get('mesocicloId');
    if (idUrl) setAlunoSelecionadoId(idUrl);
    if (mesoUrl) setMesocicloSelecionadoId(mesoUrl);
  }, [searchParams]);

  useEffect(() => {
    async function carregarDados() {
      setCarregandoBib(true);
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

        const { data, error } = await supabase
          .from('mesociclos')
          .insert([
            {
              aluno_id: alunoSelecionadoId,
              nome: novoMeso.nome,
              data_inicio: novoMeso.dataInicio,
              semanas: semanasNum,
              data_fim: dataFimFormatada,
              objetivo: novoMeso.objetivo,
              frequencia: parseInt(novoMeso.frequencia, 10) || null,
              status: 'Ativo',
            },
          ])
          .select()
          .single();

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
        });
      }
    } catch (err) {
      window.alert('Erro ao criar mesociclo: ' + err.message);
    } finally {
      setSalvandoMeso(false);
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
        // Quando está no bloco Aquecimento e focou na busca vazia, mostra Mobilidade primeiro
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

  function moverItemNaLista(index, direcao) {
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= listaExerciciosTreino.length) return;
    const copia = [...listaExerciciosTreino];
    const [removido] = copia.splice(index, 1);
    copia.splice(novoIndex, 0, removido);
    setListaExerciciosTreino(ordenarItensTreinoPorBloco(copia));
  }

  function removerDaLista(idParaRemover) {
    setListaExerciciosTreino(listaExerciciosTreino.filter((ex) => ex.id_unico !== idParaRemover));
  }

  async function handleSalvarTreinoFinal(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');
    if (!mesocicloSelecionadoId) return window.alert('Selecione ou crie um Mesociclo primeiro!');
    if (listaExerciciosTreino.length === 0) return window.alert('Adicione pelo menos um exercício ou bloco ao treino!');

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

    const payloadInsert = {
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id || null,
      mesociclo_id: mesocicloSelecionadoId,
      titulo: titulo.trim() || 'Treino',
      exercicios: textoTreino,
      itens_estruturados: itensOrdenados,
      duracao_aquecimento_min: durAqNum,
      observacoes_sensoriais: 'Criado pela Biblioteca Body Puzzle',
    };

    let { data: treinoSalvo, error } = await supabase
      .from('treinos')
      .insert([payloadInsert])
      .select()
      .single();

    if (error && error.message?.includes('duracao_aquecimento_min')) {
      const { duracao_aquecimento_min: _omit, ...payloadSemDur } = payloadInsert;
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
    if (searchParams.get('alunoId')) {
      navigate(`/alunos/${alunoSelecionadoId}`);
    }
  }

  const temItensAquecimento = listaExerciciosTreino.some((i) => normalizarBloco(i.bloco) === '0');

  const styles = {
    container: { maxWidth: '820px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' },
    title: { textAlign: 'center', color: '#1e293b', fontSize: '24px', fontWeight: '800', marginBottom: '25px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', color: '#334155', boxSizing: 'border-box', backgroundColor: '#f8fafc', marginBottom: '12px', outline: 'none' },
    sectionBox: { background: '#f1f5f9', padding: '22px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid4: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' },
    btnPrimary: { width: '100%', padding: '15px', background: '#4460B8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
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
      <h2 style={styles.title}>Prescrever Treino</h2>

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
        <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#334155' }}>
          Aluno
        </label>
        <select
          style={styles.input}
          value={alunoSelecionadoId}
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

      {/* 3. LISTA DO TREINO REORDENÁVEL (AQUECIMENTO #E17900 ANTES DO BLOCO 1 #4460B8 E CARDIO #2DAFAB) */}
      {listaExerciciosTreino.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>🛒 Itens no Treino (Aquecimento sempre antes dos Blocos 1, 2, 3...):</h4>
            {temItensAquecimento && (
              <span style={{ background: '#fff7ed', color: '#E17900', border: '1px solid #E17900', padding: '4px 10px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 'bold' }}>
                🔥 Aquecimento{duracaoAquecimentoMin ? `: ${duracaoAquecimentoMin} min` : ' ativo'}
              </span>
            )}
          </div>

          {listaExerciciosTreino.map((item, idx) => {
            const isCardio = item.tipo === 'cardio';
            const isAquecimento = normalizarBloco(item.bloco) === '0';
            const isTextoLivre = item.tipo === 'texto';
            const isInativo = !isCardio && !isTextoLivre && verificarExercicioInativo(item, todosExercicios);

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
                style={{
                  background: corFundo,
                  padding: '15px',
                  borderRadius: '8px',
                  border: `1px solid ${isAquecimento ? '#fed7aa' : isCardio ? '#99f6e4' : isInativo ? '#fecaca' : '#e2e8f0'}`,
                  borderLeft: `6px solid ${corBorda}`,
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  {isCardio ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ background: '#2DAFAB', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                          🫀 CARDIORRESPIRATÓRIO
                        </span>
                        <strong style={{ color: '#0f766e', fontSize: '15px' }}>
                          [Bloco {item.bloco || '1'}] {item.titulo || 'Bloco Cardiorrespiratório'}
                        </strong>
                        {item.duracao_min && (
                          <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: '6px' }}>
                            ⏱️ {item.duracao_min} min
                          </span>
                        )}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#134e4a', lineHeight: '1.5' }}>
                        {item.descricao}
                      </div>
                    </>
                  ) : isTextoLivre ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ background: '#E17900', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                          🔥 AQUECIMENTO (TEXTO LIVRE)
                        </span>
                        <strong style={{ color: '#9a3412', fontSize: '15px' }}>
                          {item.titulo || 'Aquecimento'}
                        </strong>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#7c2d12', lineHeight: '1.5' }}>
                        {item.descricao}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isAquecimento && (
                          <span style={{ background: '#E17900', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                            🔥 AQUECIMENTO
                          </span>
                        )}
                        <strong style={{ color: isAquecimento ? '#9a3412' : '#0f172a' }}>
                          [{isAquecimento ? 'Aquecimento' : `Bloco ${item.bloco}`}] {item.nome}
                        </strong>
                        {isInativo && (
                          <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                            ⚠️ Exercício Inativo na Biblioteca
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                        {item.series}x{item.repeticoes} • Carga: {item.carga && item.carga !== '-' ? `${item.carga}kg` : '-'} • Intervalo: {item.intervalo || '-'}
                      </div>
                      {item.observacao && (
                        <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
                          📝 Obs: {item.observacao}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    X
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: '25px' }}>
            <button type="button" onClick={handleSalvarTreinoFinal} style={styles.btnPrimary}>
              Salvar Treino no Mesociclo
            </button>
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
