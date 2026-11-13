import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import { calcularIdadeNaData } from '../utils/cartaTrunfo';

const OBJETIVOS_OPCOES = [
  'Qualidade de vida',
  'Força/Hipertrofia',
  'Flexibilidade',
  'Performance esportiva',
  'Emagrecimento',
  'Outro',
];

const FATORES_RISCO = [
  { key: 'historico_familiar', label: 'Histórico familiar de doenças?', ajuda: 'Infarto do miocárdio, revascularização coronariana ou morte súbita antes dos 55 anos.' },
  { key: 'fumo', label: 'Fumo de cigarro?', ajuda: 'Fumante ou parou há menos de 6 meses.' },
  { key: 'sedentario', label: 'Estilo de vida sedentário?', ajuda: 'Não faz pelo menos 30 min de atividade moderada, 3 dias por semana, há 3 meses.' },
  { key: 'imc_cintura_risco', label: 'IMC acima de 30 ou cintura elevada?', ajuda: 'Cintura acima de 102 cm (homens) ou 88 cm (mulheres).' },
  { key: 'hipertensao', label: 'Possui hipertensão arterial?', ajuda: '140/90 mmHg ou mais em duas ocasiões, ou uso de remédio para pressão.' },
  { key: 'dislipidemia', label: 'Possui dislipidemia?', ajuda: 'LDL acima de 130 mg/dL, HDL abaixo de 40, colesterol total ≥ 200 ou uso de remédio.' },
  { key: 'pre_diabetes', label: 'Pré-diabetes?', ajuda: 'Glicose em jejum entre 100 e 125 mg/dL.' },
];

const SINAIS_SINTOMAS = [
  'Dor ou desconforto no tórax?',
  'Dor ou desconforto no pescoço?',
  'Falta de ar em repouso ou com esforço leve?',
  'Tontura ou síncope (desmaio)?',
  'Ortopneia (falta de ar deitado)?',
  'Dispneia paroxística noturna (acorda com falta de ar)?',
  'Edema (inchaço) no tornozelo?',
  'Palpitações ou taquicardia?',
  'Claudicação intermitente (dor ou queimação na panturrilha ao caminhar)?',
  'Sopro cardíaco conhecido?',
  'Fadiga incomum ou falta de ar nas atividades habituais?',
];

const DOENCAS_CONHECIDAS = [
  { key: 'cardiovascular', label: 'Doença cardiovascular?' },
  { key: 'pulmonar', label: 'Doença pulmonar? (asma, doença crônica)' },
  { key: 'metabolica', label: 'Doença metabólica? (diabetes, tireoide, doença renal ou hepática)' },
];

const estadoInicialForm = {
  // 9.1 Questionário prévio
  data_nascimento: '',
  sexo: '',
  transtorno_sim: false,
  transtorno_qual: '',
  nivel_suporte: '',
  ocupacao: '',
  telefone: '',
  email: '',
  endereco: '',
  acompanhante_sim: false,
  acompanhante_relacao: '',
  acompanhante_telefone: '',
  acompanhante_email: '',
  acompanhante_endereco: '',
  objetivos: [],
  objetivo_outro: '',
  frequencia_treino: '',

  // 9.2 Triagem pré-participação
  fatores_risco: {},
  sinais_sintomas: {},
  doencas: {},

  // 9.3 Liberação médica
  liberacao_medica: false,
  data_liberacao: '',
  anexo_liberacao: '',

  // 9.4 Alterações ortopédicas
  cirurgia_sim: false,
  cirurgia_qual: '',
  lesao_ossea_sim: false,
  lesao_ossea_qual: '',
  lesao_muscular_sim: false,
  lesao_muscular_qual: '',

  // 9.5 Emoções e sensações
  medicamento_sim: false,
  medicamento_texto: '',
  sensibilidade_sim: false,
  sensibilidade_qual: '',
  sobrecarga_sim: false,
  sobrecarga_texto: '',
  evitar_sim: false,
  evitar_qual: '',

  // 9.6 Rotina e atividades
  atividades_praticadas: '',
  rotina_diaria: '',
  objetivos_texto: '',
  hobbies: '',
  tratamento_sim: false,
  tratamento_texto: '',
};

export default function Anamnese() {
  const [searchParams] = useSearchParams();
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState(searchParams.get('alunoId') || '');
  const [anamneseId, setAnamneseId] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [form, setForm] = useState(estadoInicialForm);
  const [salvando, setSalvando] = useState(false);

  // Sincronizar caso o parâmetro na URL mude
  useEffect(() => {
    const idDaUrl = searchParams.get('alunoId');
    if (idDaUrl) {
      setAlunoId(idDaUrl);
    }
  }, [searchParams]);

  // Carregar lista de alunos
  useEffect(() => {
    async function carregarAlunos() {
      const { data } = await supabase.from('alunos').select('id, nome, telefone').order('nome');
      if (data) setAlunos(data);
    }
    carregarAlunos();
  }, []);

  // Ao escolher o aluno, verificar se já existe anamnese (1 por aluno, editável)
  useEffect(() => {
    async function buscarAnamneseAluno() {
      if (!alunoId) {
        setAnamneseId(null);
        setAtualizadoEm(null);
        setForm(estadoInicialForm);
        return;
      }

      const alunoObj = alunos.find((a) => a.id === alunoId);

      const { data } = await supabase
        .from('anamneses')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAnamneseId(data.id);
        setAtualizadoEm(data.atualizado_em || data.criado_em);
        setForm({
          ...estadoInicialForm,
          ...(data.dados_completos || {}),
          data_nascimento: data.data_nascimento || data.dados_completos?.data_nascimento || '',
          sexo: data.sexo || data.dados_completos?.sexo || '',
          liberacao_medica: data.liberacao_medica || false,
          data_liberacao: data.data_liberacao || '',
          anexo_liberacao: data.anexo_liberacao || '',
        });
      } else {
        setAnamneseId(null);
        setAtualizadoEm(null);
        setForm({
          ...estadoInicialForm,
          telefone: alunoObj?.telefone || '',
        });
      }
    }
    buscarAnamneseAluno();
  }, [alunoId, alunos]);

  // --- Cálculo automático do Alerta de Triagem (Seção 9.3) ---
  function calcularTriagem() {
    const temSintoma = Object.values(form.sinais_sintomas).some(Boolean);
    const temDoenca = Object.values(form.doencas).some((d) => d?.sim);

    const hoje = new Date().toISOString().split('T')[0];
    const idadeAtual = calcularIdadeNaData(form.data_nascimento, hoje);
    const riscoIdade =
      idadeAtual !== null &&
      ((form.sexo === 'M' && idadeAtual >= 45) || (form.sexo === 'F' && idadeAtual >= 55));

    const qtdFatores =
      Object.values(form.fatores_risco).filter((f) => f?.sim).length + (riscoIdade ? 1 : 0);

    if (temSintoma || temDoenca) {
      return {
        nivel: 'vermelho',
        texto: 'Encaminhar ao médico (presença de sinais/sintomas ou doença conhecida)',
        corBg: '#fee2e2',
        corTexto: '#991b1b',
        corBorda: '#ef4444',
      };
    }
    if (qtdFatores >= 2) {
      return {
        nivel: 'laranja',
        texto: `Atividade intensa só com liberação médica (${qtdFatores} fatores de risco identificados)`,
        corBg: '#ffedd5',
        corTexto: '#9a3412',
        corBorda: '#f97316',
      };
    }
    return {
      nivel: 'verde',
      texto: 'Liberado para atividade física',
      corBg: '#dcfce7',
      corTexto: '#166534',
      corBorda: '#22c55e',
    };
  }

  const triagem = calcularTriagem();

  // --- Handlers auxiliares ---
  const toggleObjetivo = (obj) => {
    setForm((prev) => ({
      ...prev,
      objetivos: prev.objetivos.includes(obj)
        ? prev.objetivos.filter((o) => o !== obj)
        : [...prev.objetivos, obj],
    }));
  };

  async function salvarAnamnese(e) {
    e.preventDefault();
    if (!alunoId) return window.alert('Selecione um aluno primeiro.');
    if (!form.data_nascimento || !form.sexo) {
      return window.alert('Data de nascimento e Sexo são obrigatórios para os cálculos de avaliação.');
    }

    setSalvando(true);

    const condicoesResumo = [
      form.transtorno_sim ? `Transtorno/Síndrome: ${form.transtorno_qual}` : null,
      ...DOENCAS_CONHECIDAS.filter((d) => form.doencas[d.key]?.sim).map(
        (d) => `${d.label.replace('?', '')}: ${form.doencas[d.key]?.qual || 'Sim'}`
      ),
    ]
      .filter(Boolean)
      .join(' | ');

    const gatilhosResumo = [
      form.sensibilidade_sim ? `Sensibilidade: ${form.sensibilidade_qual}` : null,
      form.evitar_sim ? `Evitar: ${form.evitar_qual}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const payload = {
      aluno_id: alunoId,
      data_nascimento: form.data_nascimento,
      sexo: form.sexo,
      dados_completos: form,
      situacao_triagem: triagem.nivel,
      liberacao_medica: form.liberacao_medica,
      data_liberacao: form.data_liberacao || null,
      anexo_liberacao: form.anexo_liberacao || null,
      condicoes_medicas: condicoesResumo || 'Nenhuma informada',
      gatilhos_sensoriais: gatilhosResumo || 'Nenhum informado',
      medicamentos: form.medicamento_sim ? form.medicamento_texto : 'Nenhum',
      observacoes: form.objetivos_texto || '',
      atualizado_em: new Date().toISOString(),
    };

    let error;
    if (anamneseId) {
      const res = await supabase.from('anamneses').update(payload).eq('id', anamneseId);
      error = res.error;
    } else {
      const res = await supabase.from('anamneses').insert([payload]).select().single();
      error = res.error;
      if (res.data) setAnamneseId(res.data.id);
    }

    setSalvando(false);
    if (error) {
      window.alert('Erro ao salvar anamnese: ' + error.message);
    } else {
      setAtualizadoEm(new Date().toISOString());
      window.alert('Anamnese salva com sucesso!');
    }
  }

  // --- Estilos ---
  const st = {
    container: { maxWidth: '900px', margin: '30px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.07)' },
    sec: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '22px', background: '#f8fafc' },
    secTitle: { marginTop: 0, color: '#1e293b', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '16px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', marginBottom: '12px' },
    label: { display: 'block', fontWeight: 'bold', fontSize: '13.5px', color: '#334155', marginBottom: '5px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
    simNaoBox: { background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' },
    btnSalvar: { width: '100%', padding: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  };

  return (
    <div style={st.container}>
      <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '10px' }}>📋 Anamnese Completa — Body Puzzle</h2>

      {/* Seleção do Aluno */}
      <div style={{ marginBottom: '20px' }}>
        <label style={st.label}>Selecione o Aluno:</label>
        <select style={st.input} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
          <option value="">-- Escolha um aluno --</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
        {atualizadoEm && (
          <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>
            Última atualização: {new Date(atualizadoEm).toLocaleDateString('pt-BR')}
          </small>
        )}
      </div>

      {alunoId && (
        <form onSubmit={salvarAnamnese}>
          {/* 9.3 ALERTA AUTOMÁTICO DA TRIAGEM */}
          <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: form.liberacao_medica ? '#dcfce7' : triagem.corBg, borderLeft: `6px solid ${form.liberacao_medica ? '#22c55e' : triagem.corBorda}`, color: form.liberacao_medica ? '#166534' : triagem.corTexto }}>
            <strong>Situação da Triagem: </strong>
            {form.liberacao_medica && form.data_liberacao
              ? `Liberado pelo médico em ${new Date(`${form.data_liberacao}T00:00:00`).toLocaleDateString('pt-BR')}`
              : triagem.texto}
          </div>

          {/* BLOCO 1: 9.1 QUESTIONÁRIO PRÉVIO */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>1. Dados Prévios do Aluno</h3>
            <div style={st.grid2}>
              <div>
                <label style={st.label}>Data de Nascimento *</label>
                <input type="date" required style={st.input} value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </div>
              <div>
                <label style={st.label}>Sexo Biológico * (Ref. Cálculos)</label>
                <select required style={st.input} value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div>
                <label style={st.label}>Ocupação</label>
                <input type="text" style={st.input} value={form.ocupacao} onChange={(e) => setForm({ ...form, ocupacao: e.target.value })} />
              </div>
              <div>
                <label style={st.label}>Frequência de treino pretendida</label>
                <input type="text" placeholder="Ex: 2x por semana" style={st.input} value={form.frequencia_treino} onChange={(e) => setForm({ ...form, frequencia_treino: e.target.value })} />
              </div>
              <div>
                <label style={st.label}>Telefone</label>
                <input type="text" style={st.input} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div>
                <label style={st.label}>E-mail</label>
                <input type="email" style={st.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={st.label}>Endereço</label>
              <input type="text" style={st.input} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>

            {/* Neurodesenvolvimento */}
            <div style={st.simNaoBox}>
              <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.transtorno_sim} onChange={(e) => setForm({ ...form, transtorno_sim: e.target.checked })} />
                Algum transtorno ou síndrome do neurodesenvolvimento?
              </label>
              {form.transtorno_sim && (
                <div style={{ ...st.grid2, marginTop: '10px' }}>
                  <input type="text" placeholder="Qual?" style={st.input} value={form.transtorno_qual} onChange={(e) => setForm({ ...form, transtorno_qual: e.target.value })} />
                  <input type="text" placeholder="Possui algum grau ou nível de suporte? Qual?" style={st.input} value={form.nivel_suporte} onChange={(e) => setForm({ ...form, nivel_suporte: e.target.value })} />
                </div>
              )}
            </div>

            {/* Acompanhante */}
            <div style={st.simNaoBox}>
              <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.acompanhante_sim} onChange={(e) => setForm({ ...form, acompanhante_sim: e.target.checked })} />
                Terá algum acompanhante?
              </label>
              {form.acompanhante_sim && (
                <div style={{ ...st.grid2, marginTop: '10px' }}>
                  <input type="text" placeholder="Qual a relação com o aluno?" style={st.input} value={form.acompanhante_relacao} onChange={(e) => setForm({ ...form, acompanhante_relacao: e.target.value })} />
                  <input type="text" placeholder="Telefone do acompanhante" style={st.input} value={form.acompanhante_telefone} onChange={(e) => setForm({ ...form, acompanhante_telefone: e.target.value })} />
                  <input type="email" placeholder="E-mail do acompanhante" style={st.input} value={form.acompanhante_email} onChange={(e) => setForm({ ...form, acompanhante_email: e.target.value })} />
                  <input type="text" placeholder="Endereço do acompanhante" style={st.input} value={form.acompanhante_endereco} onChange={(e) => setForm({ ...form, acompanhante_endereco: e.target.value })} />
                </div>
              )}
            </div>

            {/* Objetivos */}
            <label style={st.label}>Objetivos do Aluno:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '5px' }}>
              {OBJETIVOS_OPCOES.map((obj) => (
                <label key={obj} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input type="checkbox" checked={form.objetivos.includes(obj)} onChange={() => toggleObjetivo(obj)} />
                  {obj}
                </label>
              ))}
            </div>
            {form.objetivos.includes('Outro') && (
              <input type="text" placeholder="Especifique outro objetivo..." style={{ ...st.input, marginTop: '8px' }} value={form.objetivo_outro} onChange={(e) => setForm({ ...form, objetivo_outro: e.target.value })} />
            )}
          </div>

          {/* BLOCO 2: 9.2A FATORES DE RISCO */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>2. Triagem — A) Fatores de Risco</h3>
            {FATORES_RISCO.map((fr) => {
              const ativo = form.fatores_risco[fr.key]?.sim || false;
              return (
                <div key={fr.key} style={st.simNaoBox}>
                  <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fatores_risco: {
                            ...form.fatores_risco,
                            [fr.key]: { ...form.fatores_risco[fr.key], sim: e.target.checked },
                          },
                        })
                      }
                    />
                    {fr.label}
                  </label>
                  <small style={{ color: '#64748b', display: 'block', marginLeft: '24px' }}>{fr.ajuda}</small>
                  {ativo && (
                    <input
                      type="text"
                      placeholder="Detalhe..."
                      style={{ ...st.input, marginTop: '8px' }}
                      value={form.fatores_risco[fr.key]?.detalhe || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fatores_risco: {
                            ...form.fatores_risco,
                            [fr.key]: { sim: true, detalhe: e.target.value },
                          },
                        })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* BLOCO 3: 9.2B SINAIS E SINTOMAS */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>3. Triagem — B) Sinais e Sintomas</h3>
            {SINAIS_SINTOMAS.map((sintoma, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={!!form.sinais_sintomas[idx]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sinais_sintomas: { ...form.sinais_sintomas, [idx]: e.target.checked },
                    })
                  }
                />
                {sintoma}
              </label>
            ))}
          </div>

          {/* BLOCO 4: 9.2C DOENÇAS CONHECIDAS E 9.3 LIBERAÇÃO MÉDICA */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>4. Triagem — C) Doenças Conhecidas e Liberação</h3>
            {DOENCAS_CONHECIDAS.map((d) => {
              const ativo = form.doencas[d.key]?.sim || false;
              return (
                <div key={d.key} style={st.simNaoBox}>
                  <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          doencas: { ...form.doencas, [d.key]: { ...form.doencas[d.key], sim: e.target.checked } },
                        })
                      }
                    />
                    {d.label}
                  </label>
                  {ativo && (
                    <input
                      type="text"
                      placeholder="Qual?"
                      style={{ ...st.input, marginTop: '8px' }}
                      value={form.doencas[d.key]?.qual || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          doencas: { ...form.doencas, [d.key]: { sim: true, qual: e.target.value } },
                        })
                      }
                    />
                  )}
                </div>
              );
            })}

            <div style={{ ...st.simNaoBox, background: '#f0fdf4', borderColor: '#bbf7d0', marginTop: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                <input type="checkbox" checked={form.liberacao_medica} onChange={(e) => setForm({ ...form, liberacao_medica: e.target.checked })} />
                Liberação médica recebida?
              </label>
              {form.liberacao_medica && (
                <div style={{ ...st.grid2, marginTop: '10px' }}>
                  <div>
                    <label style={st.label}>Data da liberação</label>
                    <input type="date" style={st.input} value={form.data_liberacao} onChange={(e) => setForm({ ...form, data_liberacao: e.target.value })} />
                  </div>
                  <div>
                    <label style={st.label}>Link do anexo (PDF ou foto)</label>
                    <input type="text" placeholder="URL do documento..." style={st.input} value={form.anexo_liberacao} onChange={(e) => setForm({ ...form, anexo_liberacao: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BLOCO 5: 9.4 ALTERAÇÕES ORTOPÉDICAS */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>5. Alterações Ortopédicas</h3>
            {[
              { simKey: 'cirurgia_sim', txtKey: 'cirurgia_qual', label: 'Passou por alguma cirurgia?' },
              { simKey: 'lesao_ossea_sim', txtKey: 'lesao_ossea_qual', label: 'Tem ou já teve alguma lesão óssea, ligamentar ou tendínea?' },
              { simKey: 'lesao_muscular_sim', txtKey: 'lesao_muscular_qual', label: 'Tem ou já teve alguma lesão muscular?' },
            ].map((item) => (
              <div key={item.simKey} style={st.simNaoBox}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={form[item.simKey]} onChange={(e) => setForm({ ...form, [item.simKey]: e.target.checked })} />
                  {item.label}
                </label>
                {form[item.simKey] && (
                  <input type="text" placeholder="Qual?" style={{ ...st.input, marginTop: '8px' }} value={form[item.txtKey]} onChange={(e) => setForm({ ...form, [item.txtKey]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {/* BLOCO 6: 9.5 EMOÇÕES E SENSAÇÕES */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>6. Emoções, Medicamentos e Sensações</h3>
            {[
              { simKey: 'medicamento_sim', txtKey: 'medicamento_texto', label: 'Faz uso de medicamento?', ph: 'Qual o objetivo e o efeito?' },
              { simKey: 'sensibilidade_sim', txtKey: 'sensibilidade_qual', label: 'Alguma sensibilidade sensorial (som, luz, toque, ambiente)?', ph: 'Qual?' },
              { simKey: 'sobrecarga_sim', txtKey: 'sobrecarga_texto', label: 'Já passou por episódios de sobrecarga emocional ou sensorial?', ph: 'Descreva...' },
              { simKey: 'evitar_sim', txtKey: 'evitar_qual', label: 'Algum estímulo ou comportamento que devemos evitar por segurança?', ph: 'Qual?' },
            ].map((item) => (
              <div key={item.simKey} style={st.simNaoBox}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={form[item.simKey]} onChange={(e) => setForm({ ...form, [item.simKey]: e.target.checked })} />
                  {item.label}
                </label>
                {form[item.simKey] && (
                  <input type="text" placeholder={item.ph} style={{ ...st.input, marginTop: '8px' }} value={form[item.txtKey]} onChange={(e) => setForm({ ...form, [item.txtKey]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {/* BLOCO 7: 9.6 ROTINA E ATIVIDADES */}
          <div style={st.sec}>
            <h3 style={st.secTitle}>7. Rotina e Atividades</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={st.label}>Quais atividades físicas ou esportes pratica e/ou já praticou?</label>
              <textarea rows={2} style={st.input} value={form.atividades_praticadas} onChange={(e) => setForm({ ...form, atividades_praticadas: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={st.label}>Qual é a sua rotina? (Trabalho, estudo...)</label>
              <textarea rows={2} style={st.input} value={form.rotina_diaria} onChange={(e) => setForm({ ...form, rotina_diaria: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={st.label}>Quais são os seus objetivos com o treino?</label>
              <textarea rows={2} style={st.input} value={form.objetivos_texto} onChange={(e) => setForm({ ...form, objetivos_texto: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={st.label}>Quais são seus hobbies e áreas de interesse?</label>
              <textarea rows={2} style={st.input} value={form.hobbies} onChange={(e) => setForm({ ...form, hobbies: e.target.value })} />
            </div>
            <div style={st.simNaoBox}>
              <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.tratamento_sim} onChange={(e) => setForm({ ...form, tratamento_sim: e.target.checked })} />
                Está fazendo algum tipo de tratamento?
              </label>
              {form.tratamento_sim && (
                <input type="text" placeholder="Qual o tratamento e o contato do profissional?" style={{ ...st.input, marginTop: '8px' }} value={form.tratamento_texto} onChange={(e) => setForm({ ...form, tratamento_texto: e.target.value })} />
              )}
            </div>
          </div>

          <button type="submit" disabled={salvando} style={st.btnSalvar}>
            {salvando ? 'Salvando Anamnese...' : '💾 Salvar Anamnese Completa'}
          </button>
        </form>
      )}
    </div>
  );
}