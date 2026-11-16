import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import {
  EXERCICIOS_CALISTENIA_45,
  EXERCICIOS_MOBILIDADE_23,
  converterNivelCalistenia,
} from '../data/exerciciosExpansao';

export const PADROES_OPCOES = [
  'MMII - Dominante de joelho',
  'MMII - Dominante de quadril',
  'MMSS - Empurrada horizontal',
  'MMSS - Empurrada vertical',
  'MMSS - Puxada horizontal',
  'MMSS - Puxada vertical',
  'Core',
  'Potência - Saltos',
  'Calistenia',
  'Mobilidade',
];

export const SUBPADROES_POR_PADRAO = {
  'MMII - Dominante de joelho': ['Bilateral', 'Unilateral'],
  'MMII - Dominante de quadril': ['Bilateral', 'Unilateral'],
  'MMSS - Empurrada horizontal': ['Bilateral', 'Unilateral'],
  'MMSS - Empurrada vertical': ['Bilateral', 'Unilateral'],
  'MMSS - Puxada horizontal': ['Bilateral', 'Unilateral'],
  'MMSS - Puxada vertical': ['Bilateral', 'Unilateral'],
  Core: ['Anti-extensão', 'Cadeia posterior', 'Anti-rotação', 'Anti-flexão lateral', 'Rotacionais'],
  'Potência - Saltos': [
    'Geral',
    'Vertical - saltos únicos',
    'Horizontal - saltos únicos',
    'Vertical - contínuos',
    'Horizontal - contínuos',
    'Mix - contínuos',
    'Drop jumps',
  ],
  Calistenia: [
    'Empurrada',
    'Puxada',
    'Core / Estáticos',
    'Membros Inferiores',
    'Dinâmicos / Skills',
    'Geral',
  ],
  Mobilidade: [
    'Tornozelo',
    'Joelho',
    'Quadril',
    'Coluna Torácica',
    'Ombro',
    'Punho',
    'Cadeia Posterior / Isquiotibiais',
    'Global / Geral',
  ],
};

export const TIPOS_OPCOES = ['Força', 'Pliometria', 'Balístico', 'Isometria', 'Mobilidade'];

export const STATUS_OPCOES = ['Metodologia', 'Proposta (revisar)', 'Inativo'];

export const EQUIPAMENTOS_OPCOES = [
  'KB',
  'Halteres',
  'Barra',
  'Barra hexagonal',
  'Barra fixa',
  'Barra vertical/espaldar',
  'Landmine',
  'Rack',
  'Banco',
  'Step',
  'Caixote',
  'Argolas',
  'Elástico',
  'Medball',
  'Barreiras',
  'Bola suíça',
  'Cano de PVC',
  'Colchonete',
  'Anilha/colete',
  'Corda',
  'Cadeira',
  'Apoio (parede/banco)',
  'Encoder/app',
  'Peso corporal',
  'Carga externa (opcional)',
];

export const ABAS_RAPIDAS_BIBLIOTECA = [
  { id: 'Todos', label: 'Todos' },
  { id: 'MMII', label: 'MMII' },
  { id: 'MMSS', label: 'MMSS' },
  { id: 'Core', label: 'Core' },
  { id: 'Potência', label: 'Potência' },
  { id: 'Calistenia', label: 'Calistenia' },
  { id: 'Mobilidade', label: 'Mobilidade' },
];

const formInicial = {
  nome: '',
  padrao: PADROES_OPCOES[0],
  subpadrao: '',
  nivel: '',
  ordem: '',
  tipo: 'Força',
  equipamentos: [],
  equipamento_original: '',
  adaptacoes: '',
  pontos_atencao: '',
  criterios_progressao: '',
  observacoes: '',
  status: 'Metodologia',
  midia_url: '',
};

const normalizarTraco = (str) => (str ? String(str).replace(/[–—]/g, '-').trim() : '');

// Parser simples de CSV respeitando aspas
function parseCSV(texto) {
  const linhas = [];
  let linhaAtual = [];
  let campoAtual = '';
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const prox = texto[i + 1];

    if (char === '"') {
      if (dentroAspas && prox === '"') {
        campoAtual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === ',' && !dentroAspas) {
      linhaAtual.push(campoAtual.trim());
      campoAtual = '';
    } else if ((char === '\n' || (char === '\r' && prox === '\n')) && !dentroAspas) {
      if (char === '\r') i++;
      linhaAtual.push(campoAtual.trim());
      if (linhaAtual.some((c) => c !== '')) linhas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = '';
    } else {
      campoAtual += char;
    }
  }
  if (campoAtual || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim());
    if (linhaAtual.some((c) => c !== '')) linhas.push(linhaAtual);
  }
  return linhas;
}

function deduplicarPorNomeEPadrao(lista) {
  const mapa = new Map();
  for (const item of lista) {
    const chave = `${String(item.nome || '').toLowerCase().trim()}||${String(item.padrao || '').toLowerCase().trim()}`;
    mapa.set(chave, item);
  }
  return Array.from(mapa.values());
}

export default function Biblioteca() {
  const [exercicios, setExercicios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);

  // Aba de navegação rápida (Seção 6)
  const [abaAtiva, setAbaAtiva] = useState('Todos');

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroPadrao, setFiltroPadrao] = useState('');
  const [filtroSubpadrao, setFiltroSubpadrao] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEquip, setFiltroEquip] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Modal de Edição / Criação / Visualização
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formInicial);
  const [detalheExercicio, setDetalheExercicio] = useState(null);

  useEffect(() => {
    carregarExercicios();
  }, []);

  async function carregarExercicios() {
    setCarregando(true);
    const { data, error } = await supabase.from('exercicios').select('*');
    if (error) {
      window.alert('Erro ao carregar biblioteca: ' + error.message);
    } else {
      const normalizados = (data || []).map((ex) => ({
        ...ex,
        padrao: normalizarTraco(ex.padrao),
        subpadrao: ex.subpadrao ? normalizarTraco(ex.subpadrao) : null,
      }));
      // Ordenação padrão: padrão -> subpadrão -> nível -> ordem -> nome (Seção 6 Passo 3)
      const ordenados = normalizados.sort((a, b) => {
        const cmpPadrao = (a.padrao || '').localeCompare(b.padrao || '');
        if (cmpPadrao !== 0) return cmpPadrao;

        const cmpSub = (a.subpadrao || '').localeCompare(b.subpadrao || '');
        if (cmpSub !== 0) return cmpSub;

        const nivA = a.nivel ?? 999;
        const nivB = b.nivel ?? 999;
        if (nivA !== nivB) return nivA - nivB;

        const ordA = a.ordem ?? 999;
        const ordB = b.ordem ?? 999;
        if (ordA !== ordB) return ordA - ordB;

        return (a.nome || '').localeCompare(b.nome || '');
      });
      setExercicios(ordenados);
    }
    setCarregando(false);
  }

  // Importação do biblioteca-exercicios.csv (Seção 6)
  // Suporta os 168 exercícios originais + 45 de Calistenia (Tuck=1, One-leg=2, Straddle=3, Full=4, status Metodologia)
  // + 23 de Mobilidade (tipo Mobilidade, status Proposta (revisar), subpadrão por região do corpo)
  async function handleImportarCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);

    try {
      const texto = await file.text();
      const linhas = parseCSV(texto);
      if (linhas.length < 2) throw new Error('Arquivo CSV vazio ou inválido.');

      const headers = linhas[0].map((h) => h.replace(/^\uFEFF/, '').trim().toLowerCase());
      const registrosBrutos = [];

      for (let i = 1; i < linhas.length; i++) {
        const vals = linhas[i];
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] !== undefined ? vals[idx] : '';
        });

        const nomeLimpo = (obj.nome || '').trim();
        const padraoLimpo = normalizarTraco(obj.padrao || '');
        if (!nomeLimpo || !padraoLimpo) continue;

        const isCalistenia = padraoLimpo.toLowerCase() === 'calistenia';
        const isMobilidade = padraoLimpo.toLowerCase() === 'mobilidade';

        const equips = obj.equipamentos
          ? obj.equipamentos
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const nivelConvertido = isCalistenia
          ? converterNivelCalistenia(obj.nivel, nomeLimpo)
          : obj.nivel !== '' && !Number.isNaN(Number(obj.nivel))
          ? Number(obj.nivel)
          : converterNivelCalistenia(obj.nivel, nomeLimpo);

        const tipoFinal = obj.tipo
          ? obj.tipo.trim()
          : isMobilidade
          ? 'Mobilidade'
          : 'Força';

        const statusFinal = obj.status
          ? obj.status.trim()
          : isMobilidade
          ? 'Proposta (revisar)'
          : 'Metodologia';

        registrosBrutos.push({
          nome: nomeLimpo,
          padrao: isCalistenia ? 'Calistenia' : isMobilidade ? 'Mobilidade' : padraoLimpo,
          subpadrao: obj.subpadrao ? normalizarTraco(obj.subpadrao) : null,
          nivel: nivelConvertido,
          ordem: obj.ordem !== '' && !Number.isNaN(Number(obj.ordem)) ? Number(obj.ordem) : null,
          tipo: tipoFinal,
          equipamentos: equips,
          equipamento_original: obj.equipamento_original || null,
          adaptacoes: obj.adaptacoes || null,
          pontos_atencao: obj.pontos_atencao || null,
          criterios_progressao: obj.criterios_progressao || null,
          observacoes: obj.observacoes || null,
          status: statusFinal,
          midia_url: obj.midia_url || null,
        });
      }

      const registros = deduplicarPorNomeEPadrao(registrosBrutos);

      const { error } = await supabase
        .from('exercicios')
        .upsert(registros, { onConflict: 'nome,padrao' });

      if (error) throw error;

      window.alert(`Importação concluída! ${registros.length} exercícios processados via upsert (nome + padrão).`);
      carregarExercicios();
    } catch (err) {
      window.alert('Erro na importação do CSV: ' + err.message);
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  }

  // Sincroniza diretamente os 45 exercícios de Calistenia e 23 de Mobilidade (Seção 6)
  async function handleSincronizarExpansao() {
    setImportando(true);
    try {
      const lote = deduplicarPorNomeEPadrao([
        ...EXERCICIOS_CALISTENIA_45,
        ...EXERCICIOS_MOBILIDADE_23,
      ]);

      const { error } = await supabase
        .from('exercicios')
        .upsert(lote, { onConflict: 'nome,padrao' });

      if (error) throw error;

      window.alert(
        `Expansão sincronizada com sucesso!\n• 45 exercícios de Calistenia (Metodologia, níveis Tuck=1, One-leg=2, Straddle=3, Full=4)\n• 23 exercícios de Mobilidade (Proposta (revisar), por região do corpo)`
      );
      carregarExercicios();
    } catch (err) {
      window.alert('Erro ao sincronizar Calistenia e Mobilidade: ' + err.message);
    } finally {
      setImportando(false);
    }
  }

  function selecionarAbaRapida(abaId) {
    setAbaAtiva(abaId);
    setFiltroSubpadrao('');
    if (abaId === 'Todos') {
      setFiltroPadrao('');
    } else if (abaId === 'Core' || abaId === 'Calistenia' || abaId === 'Mobilidade') {
      setFiltroPadrao(abaId);
    } else if (abaId === 'Potência') {
      setFiltroPadrao('Potência - Saltos');
    } else {
      // MMII ou MMSS possuem múltiplos padrões específicos
      setFiltroPadrao('');
    }
  }

  function abrirNovo() {
    setEditandoId(null);
    const padraoInicial =
      abaAtiva === 'Calistenia'
        ? 'Calistenia'
        : abaAtiva === 'Mobilidade'
        ? 'Mobilidade'
        : abaAtiva === 'Core'
        ? 'Core'
        : abaAtiva === 'Potência'
        ? 'Potência - Saltos'
        : PADROES_OPCOES[0];

    setForm({
      ...formInicial,
      padrao: padraoInicial,
      tipo: padraoInicial === 'Mobilidade' ? 'Mobilidade' : 'Força',
      status: padraoInicial === 'Mobilidade' ? 'Proposta (revisar)' : 'Metodologia',
    });
    setModalAberto(true);
  }

  function abrirEditar(ex) {
    setEditandoId(ex.id);
    setForm({
      nome: ex.nome || '',
      padrao: ex.padrao || PADROES_OPCOES[0],
      subpadrao: ex.subpadrao || '',
      nivel: ex.nivel ?? '',
      ordem: ex.ordem ?? '',
      tipo: ex.tipo || 'Força',
      equipamentos: ex.equipamentos || [],
      equipamento_original: ex.equipamento_original || '',
      adaptacoes: ex.adaptacoes || '',
      pontos_atencao: ex.pontos_atencao || '',
      criterios_progressao: ex.criterios_progressao || '',
      observacoes: ex.observacoes || '',
      status: ex.status || 'Metodologia',
      midia_url: ex.midia_url || '',
    });
    setModalAberto(true);
  }

  function abrirDuplicar(ex) {
    setEditandoId(null);
    setForm({
      nome: `${ex.nome} (Cópia)`,
      padrao: ex.padrao || PADROES_OPCOES[0],
      subpadrao: ex.subpadrao || '',
      nivel: ex.nivel ?? '',
      ordem: ex.ordem ?? '',
      tipo: ex.tipo || 'Força',
      equipamentos: ex.equipamentos || [],
      equipamento_original: ex.equipamento_original || '',
      adaptacoes: ex.adaptacoes || '',
      pontos_atencao: ex.pontos_atencao || '',
      criterios_progressao: ex.criterios_progressao || '',
      observacoes: ex.observacoes || '',
      status: ex.status || 'Metodologia',
      midia_url: ex.midia_url || '',
    });
    setModalAberto(true);
  }

  async function inativarExercicio(ex) {
    const novoStatus = ex.status === 'Inativo' ? 'Metodologia' : 'Inativo';
    const msg =
      novoStatus === 'Inativo'
        ? `Deseja inativar "${ex.nome}"? Ele deixará de aparecer na prescrição, mas manterá o histórico.`
        : `Deseja reativar "${ex.nome}"?`;

    if (!window.confirm(msg)) return;

    const { error } = await supabase.from('exercicios').update({ status: novoStatus }).eq('id', ex.id);
    if (error) window.alert('Erro: ' + error.message);
    else carregarExercicios();
  }

  async function salvarExercicio(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.padrao) return window.alert('Nome e Padrão são obrigatórios.');

    const payload = {
      nome: form.nome.trim(),
      padrao: form.padrao,
      subpadrao: form.subpadrao || null,
      nivel: form.nivel !== '' ? Number(form.nivel) : null,
      ordem: form.ordem !== '' ? Number(form.ordem) : null,
      tipo: form.tipo,
      equipamentos: form.equipamentos,
      equipamento_original: form.equipamento_original || null,
      adaptacoes: form.adaptacoes || null,
      pontos_atencao: form.pontos_atencao || null,
      criterios_progressao: form.criterios_progressao || null,
      observacoes: form.observacoes || null,
      status: form.status,
      midia_url: form.midia_url || null,
    };

    let error;
    if (editandoId) {
      const res = await supabase.from('exercicios').update(payload).eq('id', editandoId);
      error = res.error;
    } else {
      const res = await supabase.from('exercicios').insert([payload]);
      error = res.error;
    }

    if (error) {
      window.alert('Erro ao salvar exercício: ' + error.message);
    } else {
      setModalAberto(false);
      carregarExercicios();
    }
  }

  const toggleEquip = (eq) => {
    setForm((prev) => ({
      ...prev,
      equipamentos: prev.equipamentos.includes(eq)
        ? prev.equipamentos.filter((i) => i !== eq)
        : [...prev.equipamentos, eq],
    }));
  };

  function correspondeAba(ex, aba) {
    const p = ex.padrao || '';
    if (aba === 'Todos') return true;
    if (aba === 'MMII') return p.startsWith('MMII');
    if (aba === 'MMSS') return p.startsWith('MMSS');
    if (aba === 'Core') return p === 'Core';
    if (aba === 'Potência') return p.startsWith('Potência');
    if (aba === 'Calistenia') return p === 'Calistenia';
    if (aba === 'Mobilidade') return p === 'Mobilidade';
    return true;
  }

  // Aplicação combinada da aba ativa + filtros
  const exerciciosFiltrados = exercicios.filter((ex) => {
    if (!correspondeAba(ex, abaAtiva)) return false;
    if (busca && !ex.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroPadrao && ex.padrao !== filtroPadrao) return false;
    if (filtroSubpadrao && ex.subpadrao !== filtroSubpadrao) return false;
    if (filtroNivel) {
      if (filtroNivel === 'sem' && ex.nivel !== null) return false;
      if (filtroNivel !== 'sem' && String(ex.nivel) !== filtroNivel) return false;
    }
    if (filtroTipo && ex.tipo !== filtroTipo) return false;
    if (filtroEquip && !(ex.equipamentos || []).includes(filtroEquip)) return false;
    if (filtroStatus && ex.status !== filtroStatus) return false;
    return true;
  });

  // Subpadrões disponíveis para o filtro atual (considerando o filtroPadrao ou a aba rápida selecionada)
  const subpadroesDisponiveisFiltro = (() => {
    if (filtroPadrao && SUBPADROES_POR_PADRAO[filtroPadrao]) {
      return SUBPADROES_POR_PADRAO[filtroPadrao];
    }
    if (abaAtiva === 'Calistenia') return SUBPADROES_POR_PADRAO.Calistenia || [];
    if (abaAtiva === 'Mobilidade') return SUBPADROES_POR_PADRAO.Mobilidade || [];
    if (abaAtiva === 'Core') return SUBPADROES_POR_PADRAO.Core || [];
    if (abaAtiva === 'Potência') return SUBPADROES_POR_PADRAO['Potência - Saltos'] || [];
    if (abaAtiva === 'MMII' || abaAtiva === 'MMSS') {
      return ['Bilateral', 'Unilateral'];
    }
    // Se estiver em Todos sem padrão selecionado, reúne todos os subpadrões únicos existentes
    const unicos = new Set();
    Object.values(SUBPADROES_POR_PADRAO).forEach((arr) => arr.forEach((s) => unicos.add(s)));
    return Array.from(unicos);
  })();

  const subpadroesDisponiveisForm = SUBPADROES_POR_PADRAO[form.padrao] || [];

  const st = {
    container: { maxWidth: '1150px', margin: '30px auto', padding: '26px', background: '#fff', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.07)' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' },
    tabsBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' },
    tabBtn: (ativa) => ({
      padding: '9px 16px',
      borderRadius: '8px',
      border: ativa ? 'none' : '1px solid #cbd5e1',
      background: ativa ? '#4460B8' : '#f8fafc',
      color: ativa ? '#fff' : '#334155',
      fontWeight: 'bold',
      fontSize: '13.5px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }),
    filtrosBox: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    input: { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' },
    btnPrim: { background: '#4460B8', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
    btnSec: { background: '#2DAFAB', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'inline-block' },
    btnOrange: { background: '#E17900', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13.5px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' },
    th: { textAlign: 'left', padding: '11px', background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' },
    td: { padding: '10px 11px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { background: '#fff', borderRadius: '12px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '25px' },
  };

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <div>
          <h2 style={{ margin: 0, color: '#4460B8' }}>📚 Biblioteca de Exercícios — Body Puzzle</h2>
          <small style={{ color: '#64748b' }}>
            Exibindo {exerciciosFiltrados.length} de {exercicios.length} exercícios (ordenados por progressão)
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={st.btnOrange}
            onClick={handleSincronizarExpansao}
            disabled={importando}
            title="Insere/atualiza os 45 exercícios de Calistenia e os 23 de Mobilidade sem duplicar"
          >
            {importando ? 'Sincronizando...' : '🤸 Sincronizar Calistenia (45) + Mobilidade (23)'}
          </button>
          <label style={st.btnSec}>
            {importando ? 'Importando CSV...' : '📥 Importar CSV'}
            <input type="file" accept=".csv" onChange={handleImportarCSV} disabled={importando} style={{ display: 'none' }} />
          </label>
          <button style={st.btnPrim} onClick={abrirNovo}>
            + Novo Exercício
          </button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO RÁPIDA (SEÇÃO 6) */}
      <div style={st.tabsBar}>
        {ABAS_RAPIDAS_BIBLIOTECA.map((aba) => {
          const qtdAba = exercicios.filter((ex) => correspondeAba(ex, aba.id)).length;
          const isAtiva = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              style={st.tabBtn(isAtiva)}
              onClick={() => selecionarAbaRapida(aba.id)}
            >
              <span>{aba.label}</span>
              <span
                style={{
                  fontSize: '11.5px',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  background: isAtiva ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                  color: isAtiva ? '#fff' : '#475569',
                }}
              >
                {qtdAba}
              </span>
            </button>
          );
        })}
      </div>

      {/* BARRA DE BUSCA E FILTROS COMBINADOS */}
      <div style={st.filtrosBox}>
        <input
          type="text"
          placeholder="🔍 Buscar por nome..."
          style={st.input}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          style={st.input}
          value={filtroPadrao}
          onChange={(e) => {
            const val = e.target.value;
            setFiltroPadrao(val);
            setFiltroSubpadrao('');
            if (!val) {
              setAbaAtiva('Todos');
            } else if (val.startsWith('MMII')) {
              setAbaAtiva('MMII');
            } else if (val.startsWith('MMSS')) {
              setAbaAtiva('MMSS');
            } else if (val === 'Core') {
              setAbaAtiva('Core');
            } else if (val.startsWith('Potência')) {
              setAbaAtiva('Potência');
            } else if (val === 'Calistenia') {
              setAbaAtiva('Calistenia');
            } else if (val === 'Mobilidade') {
              setAbaAtiva('Mobilidade');
            }
          }}
        >
          <option value="">Todos os Padrões</option>
          {PADROES_OPCOES.filter((p) => correspondeAba({ padrao: p }, abaAtiva)).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          style={st.input}
          value={filtroSubpadrao}
          onChange={(e) => setFiltroSubpadrao(e.target.value)}
          disabled={subpadroesDisponiveisFiltro.length === 0}
        >
          <option value="">Todos os Subpadrões</option>
          {subpadroesDisponiveisFiltro.map((sp) => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>

        <select style={st.input} value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
          <option value="">Todos os Níveis</option>
          <option value="1">Nível 1 {abaAtiva === 'Calistenia' ? '(Tuck)' : ''}</option>
          <option value="2">Nível 2 {abaAtiva === 'Calistenia' ? '(One-leg)' : ''}</option>
          <option value="3">Nível 3 {abaAtiva === 'Calistenia' ? '(Straddle)' : ''}</option>
          <option value="4">Nível 4 {abaAtiva === 'Calistenia' ? '(Full)' : ''}</option>
          <option value="5">Nível 5</option>
          <option value="sem">A definir</option>
        </select>

        <select style={st.input} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os Tipos</option>
          {TIPOS_OPCOES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select style={st.input} value={filtroEquip} onChange={(e) => setFiltroEquip(e.target.value)}>
          <option value="">Equipamento</option>
          {EQUIPAMENTOS_OPCOES.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>

        <select style={st.input} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* TABELA DE EXERCÍCIOS */}
      {carregando ? (
        <p style={{ textAlign: 'center', padding: '30px' }}>Carregando biblioteca...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Exercício</th>
                <th style={st.th}>Padrão / Subpadrão</th>
                <th style={st.th}>Nível</th>
                <th style={st.th}>Tipo</th>
                <th style={st.th}>Equipamentos</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {exerciciosFiltrados.map((ex) => (
                <tr key={ex.id} style={{ opacity: ex.status === 'Inativo' ? 0.55 : 1 }}>
                  <td style={st.td}>
                    <button
                      type="button"
                      onClick={() => setDetalheExercicio(ex)}
                      style={{ background: 'none', border: 'none', color: '#4460B8', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '14px' }}
                    >
                      {ex.nome}
                    </button>
                  </td>
                  <td style={st.td}>
                    <div>{ex.padrao}</div>
                    {ex.subpadrao && <small style={{ color: '#64748b' }}>{ex.subpadrao}</small>}
                  </td>
                  <td style={st.td}>
                    {ex.nivel
                      ? ex.padrao === 'Calistenia'
                        ? `N${ex.nivel} (${
                            ex.nivel === 1
                              ? 'Tuck'
                              : ex.nivel === 2
                              ? 'One-leg'
                              : ex.nivel === 3
                              ? 'Straddle'
                              : ex.nivel === 4
                              ? 'Full'
                              : `N${ex.nivel}`
                          })`
                        : `N${ex.nivel}`
                      : 'A definir'}
                  </td>
                  <td style={st.td}>{ex.tipo}</td>
                  <td style={st.td}>{(ex.equipamentos || []).join(', ') || '-'}</td>
                  <td style={st.td}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        background:
                          ex.status === 'Metodologia'
                            ? '#dcfce7'
                            : ex.status === 'Proposta (revisar)'
                            ? '#ffedd5'
                            : '#f1f5f9',
                        color:
                          ex.status === 'Metodologia'
                            ? '#166534'
                            : ex.status === 'Proposta (revisar)'
                            ? '#9a3412'
                            : '#475569',
                      }}
                    >
                      {ex.status}
                    </span>
                  </td>
                  <td style={{ ...st.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirEditar(ex)} style={{ marginRight: '5px', padding: '4px 8px', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => abrirDuplicar(ex)} style={{ marginRight: '5px', padding: '4px 8px', cursor: 'pointer' }}>
                      Duplicar
                    </button>
                    <button
                      onClick={() => inativarExercicio(ex)}
                      style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        background: ex.status === 'Inativo' ? '#22c55e' : '#fee2e2',
                        color: ex.status === 'Inativo' ? '#fff' : '#991b1b',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                    >
                      {ex.status === 'Inativo' ? 'Reativar' : 'Inativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALHES DO EXERCÍCIO */}
      {detalheExercicio && (
        <div style={st.modalOverlay} onClick={() => setDetalheExercicio(null)}>
          <div style={st.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#4460B8' }}>{detalheExercicio.nome}</h3>
              <button onClick={() => setDetalheExercicio(null)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Fechar</button>
            </div>
            <p><strong>Padrão:</strong> {detalheExercicio.padrao} {detalheExercicio.subpadrao ? `(${detalheExercicio.subpadrao})` : ''}</p>
            <p><strong>Nível:</strong> {detalheExercicio.nivel ? `Nível ${detalheExercicio.nivel}` : 'A definir'} | <strong>Ordem:</strong> {detalheExercicio.ordem ?? '-'} | <strong>Tipo:</strong> {detalheExercicio.tipo}</p>
            <p><strong>Equipamentos:</strong> {(detalheExercicio.equipamentos || []).join(', ') || '-'}</p>
            {detalheExercicio.pontos_atencao && <p><strong>Pontos de Atenção:</strong> {detalheExercicio.pontos_atencao}</p>}
            {detalheExercicio.adaptacoes && <p><strong>Adaptações:</strong> {detalheExercicio.adaptacoes}</p>}
            {detalheExercicio.criterios_progressao && <p><strong>Critérios de Progressão:</strong> {detalheExercicio.criterios_progressao}</p>}
            {detalheExercicio.observacoes && <p><strong>Observações:</strong> {detalheExercicio.observacoes}</p>}
            {detalheExercicio.midia_url && (
              <div style={{ marginTop: '15px' }}>
                <strong>Mídia / Vídeo:</strong>{' '}
                <a href={detalheExercicio.midia_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  Abrir link de demonstração ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR EXERCÍCIO */}
      {modalAberto && (
        <div style={st.modalOverlay}>
          <div style={st.modalContent}>
            <h3 style={{ marginTop: 0, color: '#4460B8' }}>
              {editandoId ? 'Editar Exercício' : 'Novo Exercício na Biblioteca'}
            </h3>
            <form onSubmit={salvarExercicio}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nome *</label>
                  <input required style={st.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Padrão *</label>
                  <select
                    style={st.input}
                    value={form.padrao}
                    onChange={(e) => {
                      const novoPadrao = e.target.value;
                      setForm({
                        ...form,
                        padrao: novoPadrao,
                        subpadrao: '',
                        tipo: novoPadrao === 'Mobilidade' ? 'Mobilidade' : form.tipo,
                      });
                    }}
                  >
                    {PADROES_OPCOES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Subpadrão</label>
                  <select
                    style={st.input}
                    value={form.subpadrao}
                    onChange={(e) => setForm({ ...form, subpadrao: e.target.value })}
                    disabled={subpadroesDisponiveisForm.length === 0}
                  >
                    <option value="">Nenhum</option>
                    {subpadroesDisponiveisForm.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Tipo *</label>
                  <select style={st.input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS_OPCOES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nível (1 a 5 — Calistenia: 1=Tuck, 2=One-leg, 3=Straddle, 4=Full)</label>
                  <input type="number" min="1" max="5" placeholder="Vazio = a definir" style={st.input} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Ordem na Progressão</label>
                  <input type="number" style={st.input} value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Status *</label>
                  <select style={st.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPCOES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Link de Mídia (Vídeo/Imagem)</label>
                  <input type="text" placeholder="https://..." style={st.input} value={form.midia_url} onChange={(e) => setForm({ ...form, midia_url: e.target.value })} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Equipamentos:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '110px', overflowY: 'auto', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  {EQUIPAMENTOS_OPCOES.map((eq) => (
                    <label key={eq} style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="checkbox" checked={form.equipamentos.includes(eq)} onChange={() => toggleEquip(eq)} />
                      {eq}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Pontos de Atenção</label>
                <textarea rows={2} style={st.input} value={form.pontos_atencao} onChange={(e) => setForm({ ...form, pontos_atencao: e.target.value })} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Adaptações</label>
                <textarea rows={2} style={st.input} value={form.adaptacoes} onChange={(e) => setForm({ ...form, adaptacoes: e.target.value })} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Critérios de Progressão</label>
                <textarea rows={2} style={st.input} value={form.criterios_progressao} onChange={(e) => setForm({ ...form, criterios_progressao: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px 16px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={st.btnPrim}>
                  Salvar Exercício
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
