import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import './ListaAnamneses.css';

export default function ListaAnamneses() {
  const [anamneses, setAnamneses] = useState([]);

  useEffect(() => {
    carregarAnamneses();
  }, []);

  async function carregarAnamneses() {
    // O Supabase puxa os dados da anamnese e o nome do aluno correspondente
    const { data, error } = await supabase
      .from('anamneses')
      .select('*, alunos(nome)')
      .order('criado_em', { ascending: false });

    if (error) window.alert('Erro ao carregar: ' + error.message);
    else setAnamneses(data);
  }

  async function deletarAnamnese(id) {
    if (!window.confirm('Tem certeza que deseja apagar esta anamnese?')) return;
    const { error } = await supabase.from('anamneses').delete().eq('id', id);
    if (error) window.alert('Erro ao apagar: ' + error.message);
    else carregarAnamneses();
  }

  return (
    <div className="lista-anamneses-container">
      <h2>Anamneses Registadas</h2>
      <table className="tabela-anamneses">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Condições Médicas</th>
            <th>Gatilhos Sensoriais</th>
            <th>Medicamentos</th>
            <th>Observações</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {anamneses.map((item) => (
            <tr key={item.id}>
              {/* Mostra o nome puxado da tabela relacionada */}
              <td><strong>{item.alunos?.nome || 'Aluno não encontrado'}</strong></td>
              <td>{item.condicoes_medicas}</td>
              <td>{item.gatilhos_sensoriais}</td>
              <td>{item.medicamentos}</td>
              <td>{item.observacoes}</td>
              <td>
                <button className="btn-deletar-anamnese" onClick={() => deletarAnamnese(item.id)}>Apagar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}