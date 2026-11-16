import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import { calcularIdadeNaData, calcularCarta } from '../utils/cartaTrunfo';
import { calcularSituacaoPagamento } from './ListaAlunos';
import { abrirLaudoPDF } from '../utils/gerarLaudoPDF';
import {
  normalizarBloco,
  ordenarItensTreinoPorBloco,
  extrairDuracaoAquecimento,
  copiarMesocicloTransacional,
  importarTreinoParaMesociclo,
  verificarExercicioInativo,
  estaNaLixeiraRecente,
  formatarAuditoriaAula,
} from '../utils/prescricaoUtils';

const NOMES_TESTES_AMIGAVEIS = {
  // Antropometria
  massa: 'Massa Corporal (kg)',
  estatura: 'Estatura (m)',
  imc: 'IMC (kg/m²)',
  pct_gordura: '% Gordura',
  massa_gorda: 'Massa Gorda (kg)',
  massa_magra: 'Massa Magra (kg)',
  rcq: 'RCQ',
  // Mobilidade
  ri_ombro_d: 'RI Ombro D (°)',
  ri_ombro_e: 'RI Ombro E (°)',
  re_ombro_d: 'RE Ombro D (°)',
  re_ombro_e: 'RE Ombro E (°)',
  ri_quadril_d: 'RI Quadril D (°)',
  ri_quadril_e: 'RI Quadril E (°)',
  re_quadril_d: 'RE Quadril D (°)',
  re_quadril_e: 'RE Quadril E (°)',
  isquios_d: 'Isquiotibiais D (°)',
  isquios_e: 'Isquiotibiais E (°)',
  dorsi_d: 'Dorsiflexão D (°)',
  dorsi_e: 'Dorsiflexão E (°)',
  // Potência
  cmj_maior: 'CMJ Maior (cm)',
  cmj_media: 'CMJ Média (cm)',
  sj_maior: 'SJ Maior (cm)',
  sj_media: 'SJ Média (cm)',
  sj_cmj_rel: 'Relação SJ/CMJ (%)',
  rsi_bi: 'RSI Bilateral',
  rsi_d: 'RSI Direito',
  rsi_e: 'RSI Esquerdo',
  salto_horizontal: 'Salto Horizontal (cm)',
  hop_d: 'Hop D (cm)',
  hop_e: 'Hop E (cm)',
  triple_hop_d: 'Triple Hop D (cm)',
  triple_hop_e: 'Triple Hop E (cm)',
  medball: 'Medball 3kg (cm)',
  // Força
  sentar_levantar: 'Sentar e Levantar 30s (reps)',
  hang_hold: 'Hang Hold (s)',
  knee_pushup: 'Knee Push-up 30s (reps)',
  canoa: 'Canoa (s)',
  ponte_glutea: 'Ponte Glútea (s)',
  pushup: 'Push-up Máx (reps)',
  prancha: 'Prancha (s)',
  chinup: 'Chin-up Máx (reps)',
  squat_1rm: 'Squat 1RM Est. (kg)',
  squat_rel: 'Squat Força Relativa',
  deadlift_1rm: 'Deadlift 1RM Est. (kg)',
  deadlift_rel: 'Deadlift Força Relativa',
  supino_1rm: 'Supino 1RM Est. (kg)',
  supino_rel: 'Supino Força Relativa',
  // Resistência
  tc6_distancia: 'TC6 Distância (m)',
  tc6_pct: 'TC6 % Previsto',
  cooper_distancia: 'Cooper 12min (m)',
  vo2: 'VO₂ Estimado (mL/kg/min)',
  pace: 'Pace Corrida (min/km)',
};

function somarMeses(dataStr, meses) {
  if (!dataStr) return '-';
  const d = new Date(`${dataStr}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString('pt-BR');
}

function refParaInputMonth(refStr) {
  if (!refStr) return '';
  if (refStr.includes('-')) return refStr.slice(0, 7);
  const [mes, ano] = refStr.split('/');
  if (!mes || !ano) return '';
  return `${ano}-${mes.padStart(2, '0')}`;
}

function inputMonthParaRef(monthStr) {
  if (!monthStr) return '';
  const [ano, mes] = monthStr.split('-');
  if (!ano || !mes) return monthStr;
  return `${mes}/${ano}`;
}

function extrairAnoMesociclo(meso) {
  if (meso?.data_inicio && String(meso.data_inicio).length >= 4) {
    return String(meso.data_inicio).slice(0, 4);
  }
  if (meso?.created_at && String(meso.created_at).length >= 4) {
    return String(meso.created_at).slice(0, 4);
  }
  return String(new Date().getFullYear());
}

function extrairAnoTreinoAvulso(treino) {
  if (treino?.criado_em && String(treino.criado_em).length >= 4) {
    return String(treino.criado_em).slice(0, 4);
  }
  return String(new Date().getFullYear());
}

function extrairAnoAvaliacao(av) {
  if (av?.data_avaliacao && String(av.data_avaliacao).length >= 4) {
    return String(av.data_avaliacao).slice(0, 4);
  }
  return String(new Date().getFullYear());
}

function formatarDatasMesocicloCurto(meso) {
  const ini = meso?.data_inicio ? new Date(`${meso.data_inicio}T00:00:00`).toLocaleDateString('pt-BR') : '';
  const fim = meso?.data_fim ? new Date(`${meso.data_fim}T00:00:00`).toLocaleDateString('pt-BR') : '';
  if (ini && fim) return `${ini} a ${fim}`;
  if (ini) return `Início ${ini}`;
  return `${meso?.semanas || 4} sem`;
}

export default function PerfilAluno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const anoAtualStr = String(new Date().getFullYear());

  const [aluno, setAluno] = useState(null);
  const [todosAlunos, setTodosAlunos] = useState([]);
  const [todosExercicios, setTodosExercicios] = useState([]);
  const [anamnese, setAnamnese] = useState(null);
  const [todosMesociclos, setTodosMesociclos] = useState([]);
  const [todosTreinos, setTodosTreinos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [abaAtiva, setAbaAtiva] = useState('resumo');

  // Seção 3.1: Filtros combinados no topo da aba Treinos (Ano + Mesociclo)
  const [filtroAnoTreinos, setFiltroAnoTreinos] = useState(anoAtualStr);
  const [filtroMesocicloId, setFiltroMesocicloId] = useState('Todos');

  // Sub-aba por ano em Avaliações
  const [subAbaAvalAno, setSubAbaAvalAno] = useState('');

  // Seção 3.1: Modal de confirmação de Exclusão Suave (Soft Delete) e Modal Lixeira
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const [excluindoItem, setExcluindoItem] = useState(false);
  const [modalLixeiraAberto, setModalLixeiraAberto] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState(null);

  // Modal Duplicar Mesociclo para... (Melhoria 4)
  const [mesoParaDuplicar, setMesoParaDuplicar] = useState(null);
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

  // Modal Importar Treino para um Mesociclo (Melhoria 4)
  const [mesoDestinoImportacao, setMesoDestinoImportacao] = useState(null);
  const [alunoOrigemImpId, setAlunoOrigemImpId] = useState('');
  const [treinosOrigemImp, setTreinosOrigemImp] = useState([]);
  const [treinoOrigemImpId, setTreinoOrigemImpId] = useState('');
  const [manterCargasImp, setManterCargasImp] = useState(true);
  const [importandoTreino, setImportandoTreino] = useState(false);

  // Modal de Seleção de Seções para o Laudo PDF
  const [modalPdfAval, setModalPdfAval] = useState(null);
  const [secoesPdf, setSecoesPdf] = useState({
    forca: true,
    potencia: true,
    mobilidade: true,
    resistencia: true,
    fitness: true,
    movimento: true,
  });

  // Modal de Registrar / Editar Pagamento
  const [modalPagAberto, setModalPagAberto] = useState(false);
  const [editPagId, setEditPagId] = useState(null);
  const [formPag, setFormPag] = useState({
    referencia: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    valor: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    forma: 'Pix',
    observacao: '',
  });

  useEffect(() => {
    carregarTudo();
  }, [id]);

  async function carregarTudo() {
    setCarregando(true);

    const [resAluno, resTodosAlunos, resExercicios, resAnam, resMesos, resTreinos, resAval, resPag] = await Promise.all([
      supabase.from('alunos').select('*').eq('id', id).single(),
      supabase.from('alunos').select('id, nome, user_id').order('nome'),
      supabase.from('exercicios').select('*'),
      supabase.from('anamneses').select('*').eq('aluno_id', id).order('atualizado_em', { ascending: false }).limit(1).single(),
      supabase.from('mesociclos').select('*').eq('aluno_id', id).order('data_inicio', { ascending: false }),
      supabase.from('treinos').select('*, mesociclos(id, nome, status, data_inicio, semanas, data_fim, objetivo, frequencia, copiado_de_mesociclo_id, excluido_em)').eq('aluno_id', id).order('criado_em', { ascending: false }),
      supabase.from('avaliacoes').select('*').eq('aluno_id', id).order('data_avaliacao', { ascending: false }),
      supabase.from('pagamentos').select('*').eq('aluno_id', id).order('data_pagamento', { ascending: false }),
    ]);

    if (resAluno.data) setAluno(resAluno.data);
    setTodosAlunos(resTodosAlunos.data || []);
    setTodosExercicios(resExercicios.data || []);
    setAnamnese(resAnam.data || null);

    const listaMesos = resMesos.data || [];
    const listaTreinos = resTreinos.data || [];
    const listaAval = resAval.data || [];

    setTodosMesociclos(listaMesos);
    setTodosTreinos(listaTreinos);
    setAvaliacoes(listaAval);
    setPagamentos(resPag.data || []);

    // Mesociclos e treinos ativos (excluido_em == null)
    const mesosAtivos = listaMesos.filter((m) => !m.excluido_em);
    const treinosAtivos = listaTreinos.filter((t) => !t.excluido_em && !t.mesociclos?.excluido_em);

    // Anos que possuem mesociclos ou treinos (padrão = ano atual se existir, senão mais recente ou Todos)
    const anosSet = new Set([
      ...mesosAtivos.map(extrairAnoMesociclo),
      ...treinosAtivos.filter((t) => !t.mesociclo_id).map(extrairAnoTreinoAvulso),
    ]);
    const anosDisp = Array.from(anosSet).sort((a, b) => b.localeCompare(a));

    setFiltroAnoTreinos((prev) => {
      if (prev === 'Todos') return 'Todos';
      if (anosDisp.includes(prev)) return prev;
      if (anosDisp.includes(anoAtualStr)) return anoAtualStr;
      return anosDisp[0] || anoAtualStr;
    });

    // Define sub-aba inicial de ano para Avaliações
    const anosAv = Array.from(new Set(listaAval.map(extrairAnoAvaliacao))).sort((a, b) => b.localeCompare(a));
    if (anosAv.length > 0) {
      setSubAbaAvalAno((prev) => (prev && anosAv.includes(prev) ? prev : anosAv[0]));
    }

    setCarregando(false);
  }

  // Filtra apenas registros ativos (excluido_em IS NULL) para exibição normal (Seção 3.1)
  const mesociclos = todosMesociclos.filter((m) => !m.excluido_em);
  const treinos = todosTreinos.filter((t) => !t.excluido_em && !t.mesociclos?.excluido_em);

  // Itens na Lixeira (excluídos nos últimos 30 dias - Seção 3.1)
  const mesociclosNaLixeira = todosMesociclos.filter((m) => estaNaLixeiraRecente(m.excluido_em));
  const treinosNaLixeira = todosTreinos.filter((t) => estaNaLixeiraRecente(t.excluido_em));
  const totalItensLixeira = mesociclosNaLixeira.length + treinosNaLixeira.length;

  // Carrega treinos quando muda o aluno de origem no modal de Importar Treino (ignorando excluídos)
  useEffect(() => {
    async function buscarTreinosDoAlunoOrigem() {
      if (!alunoOrigemImpId) {
        setTreinosOrigemImp([]);
        setTreinoOrigemImpId('');
        return;
      }
      setManterCargasImp(String(alunoOrigemImpId) === String(id));
      const { data } = await supabase
        .from('treinos')
        .select('*, mesociclos(nome, data_inicio, excluido_em)')
        .eq('aluno_id', alunoOrigemImpId)
        .order('criado_em', { ascending: false });

      const ativos = (data || []).filter((t) => !t.excluido_em && !t.mesociclos?.excluido_em);
      setTreinosOrigemImp(ativos);
      setTreinoOrigemImpId(ativos?.[0]?.id || '');
    }
    if (mesoDestinoImportacao) {
      buscarTreinosDoAlunoOrigem();
    }
  }, [alunoOrigemImpId, mesoDestinoImportacao, id]);

  // --- SOFT DELETE (SEÇÃO 3.1) ---
  function solicitarExclusaoTreino(treino, mesoObj = null) {
    const nomeMeso = mesoObj?.nome || treino.mesociclos?.nome || null;
    const msgConfirmacao = nomeMeso
      ? `Excluir o ${treino.titulo || 'Treino'} do ${nomeMeso} (${aluno?.nome || 'Aluno'})?`
      : `Excluir o ${treino.titulo || 'Treino'} (${aluno?.nome || 'Aluno'})?`;

    setItemParaExcluir({
      tipo: 'treino',
      id: treino.id,
      titulo: treino.titulo || 'Treino',
      mensagem: msgConfirmacao,
    });
  }

  function solicitarExclusaoMesociclo(meso) {
    const treinosDentro = treinos.filter((t) => String(t.mesociclo_id) === String(meso.id));
    const qtd = treinosDentro.length;
    const msgConfirmacao = `Excluir o ${meso.nome} e os ${qtd} treino${qtd === 1 ? '' : 's'} dentro dele?`;

    setItemParaExcluir({
      tipo: 'mesociclo',
      id: meso.id,
      titulo: meso.nome,
      treinosIds: treinosDentro.map((t) => t.id),
      mensagem: msgConfirmacao,
    });
  }

  async function confirmarExclusaoSuave() {
    if (!itemParaExcluir) return;
    setExcluindoItem(true);
    const agoraIso = new Date().toISOString();

    try {
      if (itemParaExcluir.tipo === 'treino') {
        const { error } = await supabase
          .from('treinos')
          .update({ excluido_em: agoraIso })
          .eq('id', itemParaExcluir.id);

        if (error) throw new Error(error.message);
      } else if (itemParaExcluir.tipo === 'mesociclo') {
        const { error: errMeso } = await supabase
          .from('mesociclos')
          .update({ excluido_em: agoraIso })
          .eq('id', itemParaExcluir.id);

        if (errMeso) throw new Error(errMeso.message);

        if (itemParaExcluir.treinosIds?.length > 0) {
          const { error: errTreinos } = await supabase
            .from('treinos')
            .update({ excluido_em: agoraIso })
            .in('id', itemParaExcluir.treinosIds);
          if (errTreinos) throw new Error(errTreinos.message);
        }

        if (String(filtroMesocicloId) === String(itemParaExcluir.id)) {
          setFiltroMesocicloId('Todos');
        }
      }

      setItemParaExcluir(null);
      await carregarTudo();
    } catch (err) {
      window.alert(
        'Erro ao mover para a Lixeira (verifique se executou o script SQL no Supabase): ' + err.message
      );
    } finally {
      setExcluindoItem(false);
    }
  }

  async function handleRestaurarDaLixeira(tipo, registro) {
    setRestaurandoId(`${tipo}-${registro.id}`);
    try {
      if (tipo === 'mesociclo') {
        const { error: errMeso } = await supabase
          .from('mesociclos')
          .update({ excluido_em: null })
          .eq('id', registro.id);
        if (errMeso) throw new Error(errMeso.message);

        // Restaura também os treinos que pertencem a este mesociclo
        await supabase
          .from('treinos')
          .update({ excluido_em: null })
          .eq('mesociclo_id', registro.id);
      } else {
        const { error: errTreino } = await supabase
          .from('treinos')
          .update({ excluido_em: null })
          .eq('id', registro.id);
        if (errTreino) throw new Error(errTreino.message);

        // Se o treino pertencia a um mesociclo que também estava na lixeira, restaura o mesociclo pai
        if (registro.mesociclo_id) {
          await supabase
            .from('mesociclos')
            .update({ excluido_em: null })
            .eq('id', registro.mesociclo_id);
        }
      }

      await carregarTudo();
    } catch (err) {
      window.alert('Erro ao restaurar item: ' + err.message);
    } finally {
      setRestaurandoId(null);
    }
  }

  // --- AÇÕES DE PAGAMENTO ---
  function abrirModalNovoPagamento() {
    setEditPagId(null);
    setFormPag({
      referencia: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      valor: aluno?.valor_mensal ?? '',
      data_pagamento: new Date().toISOString().split('T')[0],
      forma: 'Pix',
      observacao: '',
    });
    setModalPagAberto(true);
  }

  function abrirModalEditarPagamento(pag) {
    setEditPagId(pag.id);
    setFormPag({
      referencia: refParaInputMonth(pag.referencia),
      valor: pag.valor,
      data_pagamento: pag.data_pagamento,
      forma: pag.forma,
      observacao: pag.observacao || '',
    });
    setModalPagAberto(true);
  }

  async function salvarPagamento(e) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();

    const payload = {
      aluno_id: id,
      referencia: inputMonthParaRef(formPag.referencia),
      valor: Number(formPag.valor),
      data_pagamento: formPag.data_pagamento,
      forma: formPag.forma,
      observacao: formPag.observacao || null,
      registrado_por: session?.user?.id || null,
    };

    let error;
    if (editPagId) {
      const res = await supabase.from('pagamentos').update(payload).eq('id', editPagId);
      error = res.error;
    } else {
      const res = await supabase.from('pagamentos').insert([payload]);
      error = res.error;
    }

    if (error) {
      window.alert('Erro ao salvar pagamento: ' + error.message);
    } else {
      setModalPagAberto(false);
      carregarTudo();
    }
  }

  // --- DUPLICAR TREINO ---
  async function duplicarTreino(treino) {
    try {
      const { novoTreino, exerciciosInativos } = await importarTreinoParaMesociclo({
        treinoOrigem: { ...treino, titulo: `${treino.titulo || 'Treino'} (Cópia)` },
        alunoDestino: aluno,
        mesocicloDestinoId: treino.mesociclo_id,
        manterCargas: true,
        todosExercicios,
      });

      let msg = `Treino "${novoTreino.titulo}" duplicado!`;
      if (exerciciosInativos.length > 0) {
        msg += `\n\n⚠️ ATENÇÃO: Exercício(s) inativo(s) na Biblioteca:\n• ${exerciciosInativos.join('\n• ')}`;
      }
      window.alert(msg);
      carregarTudo();
    } catch (err) {
      window.alert(err.message);
    }
  }

  // --- ABRIR MODAL DUPLICAR MESOCICLO PARA... ---
  function abrirModalDuplicarMeso(meso) {
    setMesoParaDuplicar(meso);
    setAlunoDestinoDupId(id);
    setManterCargasDup(true);
    setFormDupMeso({
      nome: `${meso.nome} (Cópia)`,
      dataInicio: new Date().toISOString().split('T')[0],
      semanas: String(meso.semanas || 4),
      objetivo: meso.objetivo || '',
      frequencia: meso.frequencia ? String(meso.frequencia) : '',
    });
  }

  async function confirmarDuplicarMesociclo(e) {
    e.preventDefault();
    if (!mesoParaDuplicar || !alunoDestinoDupId) return;
    setDuplicandoMeso(true);
    try {
      const alunoDestObj = todosAlunos.find((a) => String(a.id) === String(alunoDestinoDupId)) || aluno;
      const { treinosCriados, exerciciosInativos } = await copiarMesocicloTransacional({
        mesocicloOrigemId: mesoParaDuplicar.id,
        alunoDestino: alunoDestObj,
        dadosNovoMeso: formDupMeso,
        manterCargas: manterCargasDup,
        todosExercicios,
      });

      setMesoParaDuplicar(null);
      let msg = `Mesociclo duplicado com sucesso para ${alunoDestObj.nome} (${treinosCriados.length} treino(s) copiado(s))!`;
      if (exerciciosInativos.length > 0) {
        msg += `\n\n⚠️ ATENÇÃO: Exercício(s) INATIVO(S) na Biblioteca detectados na cópia:\n• ${exerciciosInativos.join('\n• ')}`;
      }
      window.alert(msg);
      carregarTudo();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDuplicandoMeso(false);
    }
  }

  // --- ABRIR MODAL IMPORTAR TREINO PARA MESOCICLO ---
  function abrirModalImportarTreino(meso) {
    setMesoDestinoImportacao(meso);
    setAlunoOrigemImpId(id);
    setManterCargasImp(true);
  }

  async function confirmarImportarTreino(e) {
    e.preventDefault();
    if (!mesoDestinoImportacao || !treinoOrigemImpId) return;
    const treinoOrig = treinosOrigemImp.find((t) => String(t.id) === String(treinoOrigemImpId));
    if (!treinoOrig) return window.alert('Selecione um treino para importar.');

    setImportandoTreino(true);
    try {
      const { novoTreino, exerciciosInativos } = await importarTreinoParaMesociclo({
        treinoOrigem: treinoOrig,
        alunoDestino: aluno,
        mesocicloDestinoId: mesoDestinoImportacao.id,
        manterCargas: manterCargasImp,
        todosExercicios,
      });

      setMesoDestinoImportacao(null);
      let msg = `Treino "${novoTreino.titulo}" importado para o mesociclo "${mesoDestinoImportacao.nome}"!`;
      if (exerciciosInativos.length > 0) {
        msg += `\n\n⚠️ ATENÇÃO: Exercício(s) INATIVO(S) na Biblioteca detectados:\n• ${exerciciosInativos.join('\n• ')}`;
      }
      window.alert(msg);
      carregarTudo();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setImportandoTreino(false);
    }
  }

  // --- HELPER PARA EXTRAIR CARTA DE UMA AVALIAÇÃO ---
  function obterCartaAvaliacao(av) {
    if (!av) return null;
    if (av.notas_carta?.atributos) return av.notas_carta;
    return calcularCarta({
      ...av,
      ...(av.mobilidade || {}),
      ...(av.potencia || {}),
      ...(av.forca || {}),
      ...(av.resistencia || {}),
    });
  }

  // --- HELPER PARA MONTAR TABELA DE EVOLUÇÃO ---
  function montarTabelaEvolucao(listaAval = avaliacoes) {
    if (listaAval.length === 0) return { datas: [], linhas: [] };
    const avaliacoesCronologicas = [...listaAval].reverse();

    const extrairMapaValores = (av) => {
      return {
        massa: av.massa,
        estatura: av.estatura,
        imc: av.antropometria?.imc,
        pct_gordura: av.perc_gordura,
        massa_gorda: av.antropometria?.massa_gorda,
        massa_magra: av.antropometria?.massa_magra,
        rcq: av.antropometria?.rcq,
        ...(av.mobilidade || {}),
        ...(av.potencia || {}),
        ...(av.forca || {}),
        ...(av.resistencia || {}),
      };
    };

    const mapas = avaliacoesCronologicas.map(extrairMapaValores);
    const linhas = [];

    Object.entries(NOMES_TESTES_AMIGAVEIS).forEach(([chave, nomeAmigavel]) => {
      const valoresPorData = mapas.map((m) => m[chave] ?? null);
      if (valoresPorData.some((v) => v !== null && v !== undefined && v !== '')) {
        linhas.push({ chave, nomeAmigavel, valores: valoresPorData });
      }
    });

    return { datas: avaliacoesCronologicas.map((a) => a.data_avaliacao), linhas };
  }

  // Renderiza os itens de um treino (com Aquecimento em laranja #E17900 antes do Bloco 1 #4460B8 e Cardio #2DAFAB)
  function renderConteudoTreino(t) {
    const itensBrutos = Array.isArray(t.itens_estruturados) ? t.itens_estruturados : [];
    const itens = ordenarItensTreinoPorBloco(itensBrutos);
    const durAq = extrairDuracaoAquecimento(t);

    if (itens.length === 0) {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13.5px', color: '#334155', margin: 0 }}>
          {t.exercicios}
        </pre>
      );
    }

    const temAquecimento = itens.some((i) => normalizarBloco(i.bloco) === '0');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {temAquecimento && durAq && (
          <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#E17900', background: '#fff7ed', border: '1px solid #fed7aa', padding: '5px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
            🔥 Bloco de Aquecimento • Duração total: {durAq} min
          </div>
        )}
        {itens.map((item, i) => {
          const isAquecimento = normalizarBloco(item.bloco) === '0';

          if (item.tipo === 'cardio') {
            return (
              <div
                key={item.id_unico || i}
                style={{
                  background: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderLeft: '6px solid #2DAFAB',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ background: '#2DAFAB', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                    🫀 CARDIO
                  </span>
                  <strong style={{ color: '#0f766e', fontSize: '14px' }}>
                    [Bloco {item.bloco || '1'}] {item.titulo || 'Bloco Cardiorrespiratório'}
                  </strong>
                  {item.duracao_min && (
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', background: '#ccfbf1', padding: '2px 7px', borderRadius: '6px' }}>
                      ⏱️ {item.duracao_min} min
                    </span>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#134e4a', lineHeight: '1.5' }}>
                  {item.descricao}
                </div>
              </div>
            );
          }

          if (item.tipo === 'texto') {
            return (
              <div
                key={item.id_unico || i}
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderLeft: '6px solid #E17900',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ background: '#E17900', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                    🔥 AQUECIMENTO
                  </span>
                  <strong style={{ color: '#9a3412', fontSize: '14px' }}>
                    {item.titulo || 'Aquecimento (Texto Livre)'}
                  </strong>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#7c2d12', lineHeight: '1.5' }}>
                  {item.descricao}
                </div>
              </div>
            );
          }

          const inativo = verificarExercicioInativo(item, todosExercicios);
          return (
            <div
              key={item.id_unico || i}
              style={{
                background: isAquecimento ? '#fff7ed' : inativo ? '#fef2f2' : '#ffffff',
                border: isAquecimento ? '1px solid #fed7aa' : inativo ? '1px solid #fecaca' : '1px solid #e2e8f0',
                borderLeft: isAquecimento ? '6px solid #E17900' : inativo ? '5px solid #ef4444' : '4px solid #4460B8',
                borderRadius: '6px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {isAquecimento && (
                  <span style={{ background: '#E17900', color: '#fff', fontSize: '10.5px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '999px' }}>
                    🔥 AQUECIMENTO
                  </span>
                )}
                <strong style={{ fontSize: '14px', color: isAquecimento ? '#9a3412' : '#0f172a' }}>
                  [{isAquecimento ? 'Aquecimento' : `Bloco ${item.bloco || '1'}`}] • {item.nome} ({item.equipamento || 'Livre'})
                </strong>
                {inativo && (
                  <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                    ⚠️ Exercício Inativo na Biblioteca
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>
                {item.series}x{item.repeticoes} | Carga: {item.carga && item.carga !== '-' ? `${item.carga}kg` : '-'} | Intervalo: {item.intervalo || '-'}
              </div>
              {item.pontos_atencao && (
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                  💡 Dica: {item.pontos_atencao}
                </div>
              )}
              {item.observacao && (
                <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                  📝 Obs: {item.observacao}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderCardTreino(t, mesoContexto = null) {
    const auditoriaTexto = formatarAuditoriaAula(t);

    return (
      <div
        key={t.id}
        style={{
          background: '#fff',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div>
            <strong style={{ fontSize: '15.5px', color: '#0f172a' }}>{t.titulo || 'Treino'}</strong>
            {t.criado_em && (
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                Criado em {new Date(t.criado_em).toLocaleDateString('pt-BR')}
              </span>
            )}
            {auditoriaTexto && (
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    color: '#9a3412',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    display: 'inline-block',
                  }}
                >
                  ✏️ {auditoriaTexto}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/exposicao?alunoId=${id}&treinoId=${t.id}`)}
              style={{
                padding: '5px 11px',
                fontSize: '12.5px',
                cursor: 'pointer',
                borderRadius: '6px',
                border: 'none',
                background: '#4460B8',
                color: '#fff',
                fontWeight: 'bold',
              }}
              title="Abrir na tela de Exposição (iPad)"
            >
              📺 Expor treino
            </button>
            {t.mesociclo_id && (
              <button
                type="button"
                onClick={() => duplicarTreino(t)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontWeight: 'bold',
                }}
              >
                Duplicar Treino
              </button>
            )}
            <button
              type="button"
              onClick={() => solicitarExclusaoTreino(t, mesoContexto)}
              style={{
                padding: '5px 10px',
                fontSize: '12.5px',
                cursor: 'pointer',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#991b1b',
                fontWeight: 'bold',
              }}
              title="Mover treino para a Lixeira"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>
        {renderConteudoTreino(t)}
      </div>
    );
  }

  function renderBlocoMesociclo(meso, isDestaqueTopo = false) {
    const treinosDoMeso = treinos.filter((t) => String(t.mesociclo_id) === String(meso.id));
    const mesoOrigem = meso.copiado_de_mesociclo_id
      ? todosMesociclos.find((m) => String(m.id) === String(meso.copiado_de_mesociclo_id))
      : null;

    return (
      <div
        key={`${isDestaqueTopo ? 'ativo-topo-' : ''}${meso.id}`}
        style={{
          background: isDestaqueTopo ? '#f0fdfa' : '#f8fafc',
          border: isDestaqueTopo ? '2px solid #2DAFAB' : '1px solid #e2e8f0',
          borderLeft: isDestaqueTopo ? '6px solid #2DAFAB' : '5px solid #4460B8',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isDestaqueTopo && (
                <span style={{ background: '#2DAFAB', color: '#fff', fontSize: '11.5px', fontWeight: 'bold', padding: '3px 9px', borderRadius: '999px' }}>
                  📌 MESOCICLO ATIVO (FIXO NO TOPO)
                </span>
              )}
              {!isDestaqueTopo && meso.status === 'Ativo' && (
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                  ATIVO
                </span>
              )}
              <strong style={{ fontSize: '17px', color: '#0f172a' }}>{meso.nome}</strong>
            </div>

            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              <strong>Início:</strong>{' '}
              {meso.data_inicio ? new Date(`${meso.data_inicio}T00:00:00`).toLocaleDateString('pt-BR') : '-'} |{' '}
              <strong>Duração:</strong> {meso.semanas || '-'} semanas
              {meso.data_fim ? ` (até ${new Date(`${meso.data_fim}T00:00:00`).toLocaleDateString('pt-BR')})` : ''}
              {meso.objetivo ? ` | 🎯 Foco: ${meso.objetivo}` : ''}
              {meso.frequencia ? ` | 🔄 Freq: ${meso.frequencia}x/sem` : ''}
            </div>

            {meso.copiado_de_mesociclo_id && (
              <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '3px' }}>
                🔗 Copiado de: {mesoOrigem ? mesoOrigem.nome : `Mesociclo #${String(meso.copiado_de_mesociclo_id).slice(0, 8)}`}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/prescrever-treino?alunoId=${id}&mesocicloId=${meso.id}`)}
              style={{ background: '#4460B8', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Adicionar Treino
            </button>
            <button
              type="button"
              onClick={() => abrirModalImportarTreino(meso)}
              style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📥 Importar Treino
            </button>
            <button
              type="button"
              onClick={() => abrirModalDuplicarMeso(meso)}
              style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', padding: '7px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📋 Duplicar Mesociclo para...
            </button>
            <button
              type="button"
              onClick={() => solicitarExclusaoMesociclo(meso)}
              style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '7px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}
              title="Mover mesociclo e seus treinos para a Lixeira"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>

        {treinosDoMeso.length > 0 ? (
          treinosDoMeso.map((t) => renderCardTreino(t, meso))
        ) : (
          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
            Nenhum treino cadastrado neste mesociclo ainda.
          </p>
        )}
      </div>
    );
  }

  if (carregando) return <div style={{ textAlign: 'center', padding: '50px' }}>Carregando ficha do aluno...</div>;
  if (!aluno) return <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>Aluno não encontrado.</div>;

  const hojeStr = new Date().toISOString().split('T')[0];
  const idadeAtual = calcularIdadeNaData(anamnese?.data_nascimento, hojeStr);
  const situacaoPag = calcularSituacaoPagamento(aluno, pagamentos);

  const ultimaAval = avaliacoes[0] || null;
  const ultimaCarta = obterCartaAvaliacao(ultimaAval);
  const treinoAtivo = treinos[0] || null;

  // Seção 3.1: Anos dinâmicos de Treinos/Mesociclos (exibir apenas anos que possuem treinos/mesociclos; padrão = ano atual)
  const mesocicloAtivoFixo = mesociclos.find((m) => m.status === 'Ativo') || mesociclos[0] || null;
  const treinosAvulsos = treinos.filter((t) => !t.mesociclo_id);

  const anosTreinosDisponiveis = Array.from(
    new Set([
      ...mesociclos.map(extrairAnoMesociclo),
      ...treinosAvulsos.map(extrairAnoTreinoAvulso),
    ])
  ).sort((a, b) => b.localeCompare(a));

  const anoSelecionadoEfetivo =
    filtroAnoTreinos === 'Todos'
      ? 'Todos'
      : anosTreinosDisponiveis.includes(filtroAnoTreinos)
      ? filtroAnoTreinos
      : anosTreinosDisponiveis.includes(anoAtualStr)
      ? anoAtualStr
      : anosTreinosDisponiveis[0] || 'Todos';

  // Mesociclos disponíveis para o filtro de mesociclo (respeitando o ano selecionado)
  const mesociclosDoAnoFiltro = (
    anoSelecionadoEfetivo === 'Todos'
      ? mesociclos
      : mesociclos.filter((m) => extrairAnoMesociclo(m) === anoSelecionadoEfetivo)
  ).sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || ''));

  const mesocicloFiltroEfetivo =
    filtroMesocicloId !== 'Todos' && mesociclosDoAnoFiltro.some((m) => String(m.id) === String(filtroMesocicloId))
      ? filtroMesocicloId
      : 'Todos';

  const mesociclosExibidos =
    mesocicloFiltroEfetivo === 'Todos'
      ? mesociclosDoAnoFiltro
      : mesociclosDoAnoFiltro.filter((m) => String(m.id) === String(mesocicloFiltroEfetivo));

  const treinosAvulsosExibidos =
    mesocicloFiltroEfetivo !== 'Todos'
      ? []
      : anoSelecionadoEfetivo === 'Todos'
      ? treinosAvulsos
      : treinosAvulsos.filter((t) => extrairAnoTreinoAvulso(t) === anoSelecionadoEfetivo);

  // Anos dinâmicos de Avaliações
  const anosAvaliacoesDisponiveis = Array.from(new Set(avaliacoes.map(extrairAnoAvaliacao))).sort((a, b) =>
    b.localeCompare(a)
  );
  const anoAvalEfetivo =
    subAbaAvalAno && anosAvaliacoesDisponiveis.includes(subAbaAvalAno)
      ? subAbaAvalAno
      : anosAvaliacoesDisponiveis[0] || '';

  const avaliacoesDoAnoSelecionado = avaliacoes
    .filter((av) => extrairAnoAvaliacao(av) === anoAvalEfetivo)
    .sort((a, b) => (b.data_avaliacao || '').localeCompare(a.data_avaliacao || ''));

  const st = {
    container: { maxWidth: '1100px', margin: '30px auto', padding: '26px', background: '#fff', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.07)' },
    headerFixo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    avatar: { width: '64px', height: '64px', borderRadius: '50%', background: '#4460B8', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '26px', fontWeight: 'bold' },
    btnAtalho: (cor) => ({ background: cor, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }),
    tabBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '22px' },
    tabBtn: (ativa) => ({ padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', background: ativa ? '#4460B8' : '#f1f5f9', color: ativa ? '#fff' : '#334155' }),
    subTabBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px', padding: '8px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' },
    subTabBtn: (ativa) => ({ padding: '7px 16px', borderRadius: '6px', border: ativa ? 'none' : '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', background: ativa ? '#2DAFAB' : '#ffffff', color: ativa ? '#fff' : '#334155' }),
    card: { background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' },
    th: { textAlign: 'left', padding: '10px', background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0' },
    inputModal: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', marginBottom: '10px' },
  };

  const abas = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'anamnese', label: 'Anamnese' },
    { id: 'treinos', label: 'Treinos' },
    { id: 'avaliacoes', label: 'Avaliações' },
    { id: 'carta', label: 'Carta Trunfo' },
    { id: 'pagamentos', label: 'Pagamentos' },
  ];

  function renderBadgeTriagemAluno() {
    if (!anamnese) return null;
    if (anamnese.liberacao_medica) {
      const dt = anamnese.data_liberacao
        ? ` em ${new Date(`${anamnese.data_liberacao}T00:00:00`).toLocaleDateString('pt-BR')}`
        : '';
      return (
        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
          🟢 Liberado pelo médico{dt}
        </span>
      );
    }
    if (anamnese.situacao_triagem === 'vermelho') {
      return (
        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
          🔴 Encaminhar ao médico
        </span>
      );
    }
    if (anamnese.situacao_triagem === 'laranja') {
      return (
        <span style={{ background: '#ffedd5', color: '#9a3412', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
          🟠 Só com liberação médica
        </span>
      );
    }
    return (
      <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }}>
        🟢 Liberado
      </span>
    );
  }

  return (
    <div style={st.container}>
      {/* CABEÇALHO FIXO */}
      <div style={st.headerFixo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={st.avatar}>{aluno.nome.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>{aluno.nome}</h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: aluno.ativo === false ? '#fee2e2' : '#dcfce7',
                  color: aluno.ativo === false ? '#991b1b' : '#166534',
                }}
              >
                {aluno.ativo === false ? 'Inativo' : 'Ativo'}
              </span>
              {renderBadgeTriagemAluno()}
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginTop: '5px' }}>
              <strong>Idade:</strong> {idadeAtual !== null ? `${idadeAtual} anos` : '-'} |{' '}
              <strong>Sexo:</strong> {anamnese?.sexo === 'M' ? 'Masculino' : anamnese?.sexo === 'F' ? 'Feminino' : '-'} |{' '}
              <strong>Telefone:</strong> {aluno.telefone || '-'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={st.btnAtalho('#0f172a')} onClick={() => navigate(`/exposicao?alunoId=${id}`)}>
            📺 Expor treino
          </button>
          <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/avaliacao?alunoId=${id}`)}>
            + Nova avaliação
          </button>
          <button style={st.btnAtalho('#2DAFAB')} onClick={() => navigate(`/prescrever-treino?alunoId=${id}`)}>
            + Novo treino
          </button>
          <button style={st.btnAtalho('#E17900')} onClick={abrirModalNovoPagamento}>
            + Registrar pagamento
          </button>
        </div>
      </div>

      {/* BARRA DE ABAS */}
      <div style={st.tabBar}>
        {abas.map((a) => (
          <button key={a.id} style={st.tabBtn(abaAtiva === a.id)} onClick={() => setAbaAtiva(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* ABA 1: RESUMO                                                       */}
      {/* =================================================================== */}
      {abaAtiva === 'resumo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#4460B8' }}>🏆 Última Carta Trunfo</h4>
            {ultimaCarta ? (
              <div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#4460B8', marginBottom: '8px' }}>
                  Overall: {ultimaCarta.overall ?? '-'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.7' }}>
                  <div>Força: <strong>{ultimaCarta.atributos.forca ?? '-'}</strong></div>
                  <div>Mobilidade: <strong>{ultimaCarta.atributos.mobilidade ?? '-'}</strong></div>
                  <div>Potência: <strong>{ultimaCarta.atributos.potencia ?? '-'}</strong></div>
                  <div>Fitness: <strong>{ultimaCarta.atributos.fitness ?? '-'}</strong></div>
                  <div>Resistência: <strong>{ultimaCarta.atributos.resistencia ?? '-'}</strong></div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Nenhuma avaliação registrada.</p>
            )}
          </div>

          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#2DAFAB' }}>📅 Avaliações e Retorno</h4>
            <p>
              <strong>Última avaliação:</strong>{' '}
              {ultimaAval ? new Date(`${ultimaAval.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
            </p>
            <p>
              <strong>Próxima sugerida (+3 meses):</strong>{' '}
              {ultimaAval ? somarMeses(ultimaAval.data_avaliacao, 3) : '-'}
            </p>
            <hr style={{ borderColor: '#e2e8f0' }} />
            <h4 style={{ color: '#0f172a' }}>💰 Situação Financeira</h4>
            <span
              style={{
                background: situacaoPag.corBg,
                color: situacaoPag.corTexto,
                padding: '5px 12px',
                borderRadius: '999px',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {situacaoPag.status}
            </span>
          </div>

          <div style={st.card}>
            <h4 style={{ marginTop: 0, color: '#0f172a' }}>🏋️ Treino / Mesociclo Ativo</h4>
            {treinoAtivo ? (
              <div>
                <strong>{treinoAtivo.titulo || 'Treino Atual'}</strong>
                {treinoAtivo.mesociclos?.nome && (
                  <div style={{ fontSize: '13px', color: '#0369a1', margin: '5px 0' }}>
                    Mesociclo: {treinoAtivo.mesociclos.nome}
                  </div>
                )}
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: '#334155', maxHeight: '160px', overflowY: 'auto' }}>
                  {treinoAtivo.exercicios}
                </pre>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Nenhum treino prescrito.</p>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: ANAMNESE                                                     */}
      {/* =================================================================== */}
      {abaAtiva === 'anamnese' && (
        <div style={st.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Ficha de Anamnese</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/anamnese?alunoId=${id}`)}>
              {anamnese ? 'Editar Anamnese' : '+ Preencher Anamnese'}
            </button>
          </div>

          {anamnese ? (
            <div style={{ lineHeight: '1.7', fontSize: '14.5px' }}>
              <p><strong>Última atualização:</strong> {new Date(anamnese.atualizado_em || anamnese.criado_em).toLocaleDateString('pt-BR')}</p>
              <p><strong>Situação da Triagem:</strong> {renderBadgeTriagemAluno()}</p>
              {anamnese.anexo_liberacao && (
                <p>
                  <strong>Anexo da Liberação Médica:</strong>{' '}
                  <a href={anamnese.anexo_liberacao} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                    Abrir documento anexado ↗
                  </a>
                </p>
              )}
              <p><strong>Condições Médicas:</strong> {anamnese.condicoes_medicas || '-'}</p>
              <p><strong>Gatilhos Sensoriais / Cuidados:</strong> {anamnese.gatilhos_sensoriais || '-'}</p>
              <p><strong>Medicamentos:</strong> {anamnese.medicamentos || '-'}</p>
              <p><strong>Objetivos e Observações:</strong> {anamnese.observacoes || '-'}</p>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Este aluno ainda não possui anamnese cadastrada.</p>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 3: TREINOS (FILTROS COMBINADOS ANO + MESOCICLO E LIXEIRA 3.1)   */}
      {/* =================================================================== */}
      {abaAtiva === 'treinos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            <h3 style={{ margin: 0 }}>Mesociclos e Histórico de Treinos</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setModalLixeiraAberto(true)}
                style={{
                  background: totalItensLixeira > 0 ? '#fff7ed' : '#f1f5f9',
                  color: totalItensLixeira > 0 ? '#9a3412' : '#475569',
                  border: totalItensLixeira > 0 ? '1px solid #fdba74' : '1px solid #cbd5e1',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🗑️ Lixeira (30 dias) {totalItensLixeira > 0 ? `(${totalItensLixeira})` : '(0)'}
              </button>
              <button style={st.btnAtalho('#2DAFAB')} onClick={() => navigate(`/prescrever-treino?alunoId=${id}`)}>
                + Novo Treino / Mesociclo
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS COMBINADOS NO TOPO DA ABA TREINOS (SEÇÃO 3.1) */}
          {(anosTreinosDisponiveis.length > 0 || treinosAvulsos.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                  📅 Filtro Ano (padrão = ano atual)
                </label>
                <select
                  value={anoSelecionadoEfetivo}
                  onChange={(e) => {
                    setFiltroAnoTreinos(e.target.value);
                    setFiltroMesocicloId('Todos');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#0f172a',
                  }}
                >
                  <option value="Todos">Todos os Anos</option>
                  {anosTreinosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano} {ano === anoAtualStr ? '(Ano atual)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                  📂 Filtro Mesociclo ({anoSelecionadoEfetivo === 'Todos' ? 'Todos os anos' : anoSelecionadoEfetivo})
                </label>
                <select
                  value={mesocicloFiltroEfetivo}
                  onChange={(e) => setFiltroMesocicloId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#0f172a',
                  }}
                >
                  <option value="Todos">Todos ({mesociclosDoAnoFiltro.length})</option>
                  {mesociclosDoAnoFiltro.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} — {formatarDatasMesocicloCurto(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 1. MESOCICLO ATIVO FIXO NO TOPO (quando filtroMesocicloId === 'Todos') */}
          {mesocicloAtivoFixo && mesocicloFiltroEfetivo === 'Todos' && renderBlocoMesociclo(mesocicloAtivoFixo, true)}

          {/* 2. LISTA DE MESOCICLOS FILTRADOS POR ANO + MESOCICLO */}
          {mesociclosExibidos.length > 0 && (
            <div>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#334155' }}>
                📂 {mesocicloFiltroEfetivo === 'Todos'
                  ? `Mesociclos (${anoSelecionadoEfetivo === 'Todos' ? 'Todos os anos' : anoSelecionadoEfetivo})`
                  : 'Mesociclo Selecionado'}
              </h4>
              {mesociclosExibidos.map((meso) => renderBlocoMesociclo(meso, false))}
            </div>
          )}

          {/* 3. TREINOS AVULSOS (SEM MESOCICLO) */}
          {treinosAvulsosExibidos.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '12px', color: '#475569' }}>
                📁 Treinos avulsos (sem mesociclo)
              </h4>
              {treinosAvulsosExibidos.map((t) => renderCardTreino(t, null))}
            </div>
          )}

          {mesociclos.length === 0 && treinos.length === 0 && (
            <p style={{ color: '#64748b' }}>Nenhum mesociclo ou treino ativo registrado para este aluno.</p>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 4: AVALIAÇÕES DIVIDIDAS POR ANO E TABELA DE EVOLUÇÃO            */}
      {/* =================================================================== */}
      {abaAtiva === 'avaliacoes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Avaliações Realizadas</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate(`/avaliacao?alunoId=${id}`)}>
              + Nova Avaliação
            </button>
          </div>

          {anosAvaliacoesDisponiveis.length > 0 && (
            <div style={st.subTabBar}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', alignSelf: 'center', marginRight: '6px' }}>
                📅 Ano da Avaliação:
              </span>
              {anosAvaliacoesDisponiveis.map((ano) => (
                <button
                  key={ano}
                  type="button"
                  style={st.subTabBtn(anoAvalEfetivo === ano)}
                  onClick={() => setSubAbaAvalAno(ano)}
                >
                  {ano}
                </button>
              ))}
            </div>
          )}

          <table style={{ ...st.table, marginBottom: '30px' }}>
            <thead>
              <tr>
                <th style={st.th}>Data</th>
                <th style={st.th}>Avaliador</th>
                <th style={st.th}>Overall Carta</th>
                <th style={st.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoesDoAnoSelecionado.map((av) => {
                const carta = obterCartaAvaliacao(av);
                const idxGlobal = avaliacoes.findIndex((item) => item.id === av.id);
                return (
                  <tr key={av.id}>
                    <td style={st.td}>{new Date(`${av.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td style={st.td}>{av.avaliador || '-'}</td>
                    <td style={st.td}><strong>{carta?.overall ?? '-'}</strong></td>
                    <td style={{ ...st.td, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setAbaAtiva('carta')}
                        style={{ background: '#4460B8', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px', fontWeight: 'bold' }}
                      >
                        Ver Carta
                      </button>
                      <button
                        onClick={() => setModalPdfAval({ av, index: idxGlobal })}
                        style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        📄 Baixar avaliação (PDF)
                      </button>
                    </td>
                  </tr>
                );
              })}
              {avaliacoesDoAnoSelecionado.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                    Nenhuma avaliação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {avaliacoesDoAnoSelecionado.length > 0 && (() => {
            const evolucao = montarTabelaEvolucao(avaliacoesDoAnoSelecionado);
            return (
              <div>
                <h3>📈 Tabela de Evolução ({anoAvalEfetivo})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={st.table}>
                    <thead>
                      <tr>
                        <th style={st.th}>Teste / Medida</th>
                        {evolucao.datas.map((dt, idx) => (
                          <th key={idx} style={st.th}>
                            {new Date(`${dt}T00:00:00`).toLocaleDateString('pt-BR')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evolucao.linhas.map((linha) => (
                        <tr key={linha.chave}>
                          <td style={st.td}><strong>{linha.nomeAmigavel}</strong></td>
                          {linha.valores.map((val, idx) => (
                            <td key={idx} style={st.td}>{val !== null && val !== '' ? val : '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 5: CARTA TRUNFO (LADO A LADO COM VARIAÇÃO)                      */}
      {/* =================================================================== */}
      {abaAtiva === 'carta' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>🏆 Evolução da Carta Trunfo</h3>
            <button style={st.btnAtalho('#4460B8')} onClick={() => navigate('/carta-trunfo')}>
              Baixar Imagem PNG
            </button>
          </div>

          {avaliacoes.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma avaliação disponível para exibir Cartas.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {avaliacoes.map((av, idx) => {
                const atual = obterCartaAvaliacao(av);
                const anterior = avaliacoes[idx + 1] ? obterCartaAvaliacao(avaliacoes[idx + 1]) : null;

                const renderVariacao = (valAtual, valAnt) => {
                  if (valAtual === null || valAtual === undefined || valAnt === null || valAnt === undefined) return null;
                  const diff = valAtual - valAnt;
                  if (diff === 0) return <span style={{ color: '#64748b', fontSize: '12px' }}> (=)</span>;
                  return (
                    <span style={{ color: diff > 0 ? '#16a34a' : '#EB002E', fontWeight: 'bold', fontSize: '12px' }}>
                      {' '}({diff > 0 ? `+${diff}` : diff})
                    </span>
                  );
                };

                return (
                  <div key={av.id} style={{ ...st.card, borderTop: idx === 0 ? '4px solid #4460B8' : '4px solid #94a3b8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{new Date(`${av.data_avaliacao}T00:00:00`).toLocaleDateString('pt-BR')}</strong>
                      {idx === 0 && <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ATUAL</span>}
                    </div>

                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#4460B8', marginBottom: '12px' }}>
                      Overall: {atual.overall ?? '-'} {renderVariacao(atual.overall, anterior?.overall)}
                    </div>

                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                      <div>Força: <strong>{atual.atributos.forca ?? '-'}</strong>{renderVariacao(atual.atributos.forca, anterior?.atributos?.forca)}</div>
                      <div>Mobilidade: <strong>{atual.atributos.mobilidade ?? '-'}</strong>{renderVariacao(atual.atributos.mobilidade, anterior?.atributos?.mobilidade)}</div>
                      <div>Potência: <strong>{atual.atributos.potencia ?? '-'}</strong>{renderVariacao(atual.atributos.potencia, anterior?.atributos?.potencia)}</div>
                      <div>Fitness: <strong>{atual.atributos.fitness ?? '-'}</strong>{renderVariacao(atual.atributos.fitness, anterior?.atributos?.fitness)}</div>
                      <div>Resistência: <strong>{atual.atributos.resistencia ?? '-'}</strong>{renderVariacao(atual.atributos.resistencia, anterior?.atributos?.resistencia)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 6: PAGAMENTOS                                                   */}
      {/* =================================================================== */}
      {abaAtiva === 'pagamentos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0 }}>💰 Controle de Pagamentos</h3>
              <small style={{ color: '#64748b' }}>
                Plano atual: {aluno.valor_mensal ? `R$ ${Number(aluno.valor_mensal).toFixed(2)} • Vencimento todo dia ${aluno.dia_vencimento || '-'}` : 'Não configurado (edite na lista de Alunos)'}
              </small>
            </div>
            <button style={st.btnAtalho('#E17900')} onClick={abrirModalNovoPagamento}>
              + Registrar Pagamento
            </button>
          </div>

          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Referência (Mês/Ano)</th>
                <th style={st.th}>Data Pagamento</th>
                <th style={st.th}>Valor</th>
                <th style={st.th}>Forma</th>
                <th style={st.th}>Observação</th>
                <th style={st.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td style={st.td}><strong>{p.referencia}</strong></td>
                  <td style={st.td}>{new Date(`${p.data_pagamento}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                  <td style={st.td}>R$ {Number(p.valor).toFixed(2)}</td>
                  <td style={st.td}>{p.forma}</td>
                  <td style={st.td}>{p.observacao || '-'}</td>
                  <td style={st.td}>
                    <button onClick={() => abrirModalEditarPagamento(p)} style={{ padding: '4px 10px', cursor: 'pointer' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {pagamentos.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '18px', color: '#64748b' }}>
                    Nenhum pagamento registrado para este aluno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EXPLÍCITA DE EXCLUSÃO SUAVE (SEÇÃO 3.1) */}
      {itemParaExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '460px', width: '100%', padding: '24px', borderTop: '5px solid #ef4444' }}>
            <h3 style={{ marginTop: 0, color: '#991b1b' }}>🗑️ Confirmar Exclusão</h3>
            <p style={{ fontSize: '15px', color: '#0f172a', fontWeight: 'bold', lineHeight: '1.5' }}>
              {itemParaExcluir.mensagem}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
              O item não será apagado definitivamente agora: ele ficará disponível na <strong>Lixeira por 30 dias</strong> caso precise restaurá-lo.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                disabled={excluindoItem}
                onClick={() => setItemParaExcluir(null)}
                style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindoItem}
                onClick={confirmarExclusaoSuave}
                style={{ padding: '9px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {excluindoItem ? 'Excluindo...' : 'Sim, mover para a Lixeira'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIXEIRA (ITENS EXCLUÍDOS NOS ÚLTIMOS 30 DIAS - SEÇÃO 3.1) */}
      {modalLixeiraAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '680px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🗑️ Lixeira de Treinos e Mesociclos ({aluno.nome})</h3>
                <small style={{ color: '#64748b' }}>Exibindo itens excluídos nos últimos 30 dias</small>
              </div>
              <button
                type="button"
                onClick={() => setModalLixeiraAberto(false)}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Fechar
              </button>
            </div>

            {totalItensLixeira === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>
                A lixeira está vazia (nenhum treino ou mesociclo excluído nos últimos 30 dias).
              </p>
            ) : (
              <div>
                {mesociclosNaLixeira.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#4460B8' }}>
                      📂 Mesociclos Excluídos ({mesociclosNaLixeira.length})
                    </h4>
                    {mesociclosNaLixeira.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{m.nome}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Excluído em {new Date(m.excluido_em).toLocaleString('pt-BR')} • {formatarDatasMesocicloCurto(m)}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={restaurandoId === `mesociclo-${m.id}`}
                          onClick={() => handleRestaurarDaLixeira('mesociclo', m)}
                          style={{
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {restaurandoId === `mesociclo-${m.id}` ? 'Restaurando...' : '♻️ Restaurar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {treinosNaLixeira.length > 0 && (
                  <div>
                    <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#0f766e' }}>
                      🏋️ Treinos Excluídos ({treinosNaLixeira.length})
                    </h4>
                    {treinosNaLixeira.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{t.titulo || 'Treino'}</strong>
                          <span style={{ fontSize: '12.5px', color: '#475569', marginLeft: '8px' }}>
                            ({t.mesociclos?.nome || 'Treino avulso'})
                          </span>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Excluído em {new Date(t.excluido_em).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={restaurandoId === `treino-${t.id}`}
                          onClick={() => handleRestaurarDaLixeira('treino', t)}
                          style={{
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {restaurandoId === `treino-${t.id}` ? 'Restaurando...' : '♻️ Restaurar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR MESOCICLO PARA... */}
      {mesoParaDuplicar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>📋 Duplicar Mesociclo para...</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
              Origem: <strong>{mesoParaDuplicar.nome}</strong>
            </p>
            <form onSubmit={confirmarDuplicarMesociclo}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Aluno de Destino *</label>
              <select
                style={st.inputModal}
                value={alunoDestinoDupId}
                onChange={(e) => {
                  const destId = e.target.value;
                  setAlunoDestinoDupId(destId);
                  setManterCargasDup(String(destId) === String(id));
                }}
                required
              >
                {todosAlunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} {String(a.id) === String(id) ? '(Mesmo aluno)' : ''}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Nome do Novo Mesociclo *</label>
              <input
                type="text"
                style={st.inputModal}
                value={formDupMeso.nome}
                onChange={(e) => setFormDupMeso({ ...formDupMeso, nome: e.target.value })}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Data de Início *</label>
                  <input
                    type="date"
                    style={st.inputModal}
                    value={formDupMeso.dataInicio}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, dataInicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Semanas *</label>
                  <input
                    type="number"
                    min="1"
                    style={st.inputModal}
                    value={formDupMeso.semanas}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, semanas: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Objetivo</label>
                  <input
                    type="text"
                    style={st.inputModal}
                    value={formDupMeso.objetivo}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, objetivo: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Frequência</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    style={st.inputModal}
                    value={formDupMeso.frequencia}
                    onChange={(e) => setFormDupMeso({ ...formDupMeso, frequencia: e.target.value })}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', margin: '8px 0 16px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manterCargasDup}
                  onChange={(e) => setManterCargasDup(e.target.checked)}
                />
                Manter cargas dos exercícios ({String(alunoDestinoDupId) === String(id) ? 'padrão para mesmo aluno' : 'desmarcado por padrão para outro aluno'})
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setMesoParaDuplicar(null)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={duplicandoMeso}
                  style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {duplicandoMeso ? 'Duplicando...' : 'Duplicar Mesociclo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR TREINO PARA MESOCICLO */}
      {mesoDestinoImportacao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#0f766e' }}>📥 Importar Treino</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
              Destino: <strong>{mesoDestinoImportacao.nome}</strong>
            </p>
            <form onSubmit={confirmarImportarTreino}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Aluno de Origem *</label>
              <select
                style={st.inputModal}
                value={alunoOrigemImpId}
                onChange={(e) => setAlunoOrigemImpId(e.target.value)}
                required
              >
                {todosAlunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} {String(a.id) === String(id) ? '(Mesmo aluno)' : ''}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', marginBottom: '4px' }}>Treino a Importar *</label>
              <select
                style={st.inputModal}
                value={treinoOrigemImpId}
                onChange={(e) => setTreinoOrigemImpId(e.target.value)}
                required
              >
                <option value="">Selecione um treino...</option>
                {treinosOrigemImp.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo || 'Treino'} ({t.mesociclos?.nome || 'Treino avulso'})
                  </option>
                ))}
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', margin: '8px 0 16px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manterCargasImp}
                  onChange={(e) => setManterCargasImp(e.target.checked)}
                />
                Trazer cargas dos exercícios
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setMesoDestinoImportacao(null)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importandoTreino || !treinoOrigemImpId}
                  style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {importandoTreino ? 'Importando...' : 'Importar Treino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE SEÇÕES PARA O LAUDO PDF */}
      {modalPdfAval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '440px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>Gerar Laudo de Avaliação (PDF)</h3>
            <p style={{ fontSize: '13.5px', color: '#475569' }}>
              Desmarque as seções que deseja ocultar neste laudo (ex.: composição corporal):
            </p>

            {[
              { key: 'forca', label: 'Força' },
              { key: 'potencia', label: 'Potência' },
              { key: 'mobilidade', label: 'Mobilidade' },
              { key: 'resistencia', label: 'Resistência' },
              { key: 'fitness', label: 'Composição Corporal (Fitness)' },
              { key: 'movimento', label: 'Avaliação de Movimento' },
            ].map((sec) => (
              <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={secoesPdf[sec.key]}
                  onChange={(e) => setSecoesPdf({ ...secoesPdf, [sec.key]: e.target.checked })}
                />
                {sec.label}
              </label>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" onClick={() => setModalPdfAval(null)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { av, index } = modalPdfAval;
                  const avAnterior = avaliacoes[index + 1] || null;
                  abrirLaudoPDF({
                    aluno,
                    avaliacao: av,
                    avaliacaoAnterior: avAnterior,
                    carta: obterCartaAvaliacao(av),
                    secoesVisiveis: secoesPdf,
                  });
                  setModalPdfAval(null);
                }}
                style={{ background: '#4460B8', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRAR / EDITAR PAGAMENTO */}
      {modalPagAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '450px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>
              {editPagId ? 'Editar Pagamento' : 'Registrar Pagamento'}
            </h3>
            <form onSubmit={salvarPagamento}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Referência (Mês/Ano) *</label>
                <input
                  type="month"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.referencia}
                  onChange={(e) => setFormPag({ ...formPag, referencia: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.valor}
                  onChange={(e) => setFormPag({ ...formPag, valor: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Data do Pagamento *</label>
                <input
                  type="date"
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.data_pagamento}
                  onChange={(e) => setFormPag({ ...formPag, data_pagamento: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Forma de Pagamento *</label>
                <select
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.forma}
                  onChange={(e) => setFormPag({ ...formPag, forma: e.target.value })}
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Observação</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  value={formPag.observacao}
                  onChange={(e) => setFormPag({ ...formPag, observacao: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalPagAberto(false)} style={{ padding: '9px 14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ background: '#2DAFAB', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Salvar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
