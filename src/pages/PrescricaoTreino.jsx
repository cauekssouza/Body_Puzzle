import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase'; 
import './Anamnese.css';

export default function PrescricaoTreino() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('');
  const [anamneseAluno, setAnamneseAluno] = useState(null);
  
  // Dados do Treino
  const [titulo, setTitulo] = useState('');
  
  // Novo estado para a Biblioteca de Exercícios
  const [biblioteca, setBiblioteca] = useState([]);
  const [exercicioSelecionadoId, setExercicioSelecionadoId] = useState('');
  const [detalhesExercicio, setDetalhesExercicio] = useState(null);
  
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [carga, setCarga] = useState('');
  
  // Lista temporária de exercícios que estão a ser adicionados ao treino atual
  const [listaExerciciosTreino, setListaExerciciosTreino] = useState([]);

  // 1. Carregar Alunos e Biblioteca de Exercícios ao abrir a página
  useEffect(() => {
    async function carregarDados() {
      // Carrega alunos
      const { data: dadosAlunos } = await supabase.from('alunos').select('id, nome, user_id').order('nome');
      if (dadosAlunos) setAlunos(dadosAlunos);

      // Carrega exercícios do Excel
      const { data: dadosExercicios } = await supabase.from('exercicios').select('*').order('padrao');
      if (dadosExercicios) setBiblioteca(dadosExercicios);
    }
    carregarDados();
  }, []);

  // 2. Carregar Anamnese quando seleciona o aluno (Código Original Mantido)
  useEffect(() => {
    async function carregarAnamnese() {
      if (!alunoSelecionadoId) {
        setAnamneseAluno(null);
        return;
      }
      const { data } = await supabase
        .from('anamneses')
        .select('*')
        .eq('aluno_id', alunoSelecionadoId)
        .single();
      
      setAnamneseAluno(data || null);
    }
    carregarAnamnese();
  }, [alunoSelecionadoId]);

  // 3. Atualizar painel de dicas quando o professor seleciona um exercício no dropdown
  function handleSelecaoExercicio(e) {
    const id = e.target.value;
    setExercicioSelecionadoId(id);
    
    const exercicioCompleto = biblioteca.find(ex => ex.id === id);
    setDetalhesExercicio(exercicioCompleto || null);
  }

  // 4. Adicionar exercício temporariamente à lista que vai aparecer no ecrã
  function handleAdicionarALista(e) {
    e.preventDefault();
    if (!exercicioSelecionadoId || !series || !repeticoes) {
      return window.alert("Preencha o exercício, séries e repetições.");
    }

    const novoExercicio = {
      id_unico: Date.now(), // Apenas para gerir a lista no frontend
      nome: detalhesExercicio.nome,
      padrao: detalhesExercicio.padrao,
      equipamento: detalhesExercicio.equipamento,
      series,
      repeticoes,
      carga,
      pontos_atencao: detalhesExercicio.pontos_atencao
    };

    setListaExerciciosTreino([...listaExerciciosTreino, novoExercicio]);
    
    // Limpar campos para o próximo exercício
    setExercicioSelecionadoId('');
    setDetalhesExercicio(null);
    setSeries('');
    setRepeticoes('');
    setCarga('');
  }

  // 5. Salvar o treino completo na Base de Dados
  async function handleSalvarTreinoFinal(e) {
    e.preventDefault();
    if (!alunoSelecionadoId) return window.alert('Selecione um aluno!');
    if (listaExerciciosTreino.length === 0) return window.alert('Adicione pelo menos um exercício ao treino!');

    const alunoObj = alunos.find(a => a.id === alunoSelecionadoId);

    // Formata a lista para guardar na coluna "exercicios" como texto (para não quebrar a tua tabela de treinos atual)
    const textoTreino = listaExerciciosTreino.map(ex => 
      `${ex.nome} (${ex.equipamento}) - ${ex.series}x${ex.repeticoes} | Carga: ${ex.carga || 'Livre'} | Dica: ${ex.pontos_atencao}`
    ).join('\n\n');

    const { error } = await supabase.from('treinos').insert([{
      aluno_id: alunoSelecionadoId,
      user_id: alunoObj?.user_id,
      titulo,
      exercicios: textoTreino, // Guarda o texto formatado bonito
      observacoes_sensoriais: 'Criado pela Biblioteca Body Puzzle' // Ou podes adicionar um input extra
    }]);

    if (error) {
      window.alert('Erro ao salvar treino: ' + error.message);
    } else {
      window.alert('Treino prescrito com sucesso!');
      setTitulo('');
      setAlunoSelecionadoId('');
      setListaExerciciosTreino([]); // Limpa a lista
    }
  }

  return (
    <div className="anamnese-container" style={{ maxWidth: '800px' }}>
      <h2 className="anamnese-title">Prescrever Treino Personalizado</h2>
      
      {/* 1. SELEÇÃO DO ALUNO */}
      <div className="anamnese-form" style={{ marginBottom: '20px' }}>
        <select 
          className="anamnese-input" 
          value={alunoSelecionadoId} 
          onChange={(e) => setAlunoSelecionadoId(e.target.value)} 
          required
        >
          <option value="">Selecione o Aluno...</option>
          {alunos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
          ))}
        </select>

        {anamneseAluno && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #007bff', textAlign: 'left', fontSize: '14px', marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>📋 Resumo da Anamnese:</h4>
            <p style={{ margin: '4px 0' }}><strong>Condições:</strong> {anamneseAluno.condicoes_medicas || 'Não informado'}</p>
            <p style={{ margin: '4px 0' }}><strong>Gatilhos Sensoriais:</strong> {anamneseAluno.gatilhos_sensoriais || 'Nenhum'}</p>
            <p style={{ margin: '4px 0' }}><strong>Medicamentos:</strong> {anamneseAluno.medicamentos || 'Nenhum'}</p>
          </div>
        )}

        <input 
          type="text" 
          className="anamnese-input" 
          placeholder="Título do Treino (Ex: Treino A - Força e Estabilidade)" 
          value={titulo} 
          onChange={(e) => setTitulo(e.target.value)} 
          style={{ marginTop: '10px' }}
          required 
        />
      </div>

      <hr style={{ margin: '20px 0', border: '1px solid #ddd' }} />

      {/* 2. ADICIONAR EXERCÍCIOS DA BIBLIOTECA */}
      <form onSubmit={handleAdicionarALista} style={{ background: '#f1f3f5', padding: '15px', borderRadius: '8px' }}>
        <h4 style={{ marginTop: 0 }}>➕ Adicionar Exercício:</h4>
        
        <select 
          className="anamnese-input"
          value={exercicioSelecionadoId} 
          onChange={handleSelecaoExercicio}
          required
        >
          <option value="">Selecione um exercício da biblioteca...</option>
          {biblioteca.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.padrao} — {ex.nome} ({ex.equipamento})
            </option>
          ))}
        </select>

        {detalhesExercicio && (
          <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '10px', border: '1px solid #dee2e6' }}>
            <strong>💡 Metodologia Body Puzzle:</strong> {detalhesExercicio.pontos_atencao || 'Nenhum registo'}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input type="number" className="anamnese-input" placeholder="Séries" value={series} onChange={e => setSeries(e.target.value)} required />
          <input type="number" className="anamnese-input" placeholder="Repetições" value={repeticoes} onChange={e => setRepeticoes(e.target.value)} required />
          <input type="number" className="anamnese-input" placeholder="Carga (kg)" value={carga} onChange={e => setCarga(e.target.value)} />
        </div>

        <button type="submit" className="anamnese-btn" style={{ background: '#6c757d', marginTop: '10px' }}>
          + Inserir na Lista
        </button>
      </form>

      {/* 3. LISTA DE EXERCÍCIOS ADICIONADOS E BOTÃO FINAL */}
      {listaExerciciosTreino.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <h4>Lista do Treino Atual:</h4>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {listaExerciciosTreino.map((ex, index) => (
              <li key={ex.id_unico} style={{ background: '#e9ecef', padding: '10px', margin: '5px 0', borderRadius: '4px', fontSize: '14px' }}>
                <strong>{index + 1}. {ex.nome}</strong> | {ex.series}x{ex.repeticoes} | Carga: {ex.carga || 'N/A'}kg
              </li>
            ))}
          </ul>
          
          <button onClick={handleSalvarTreinoFinal} className="anamnese-btn" style={{ width: '100%', marginTop: '15px' }}>
            Salvar e Enviar Treino Final
          </button>
        </div>
      )}
    </div>
  );
}