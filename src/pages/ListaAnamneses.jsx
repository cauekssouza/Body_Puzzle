import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import './ListaAnamneses.css';

export default function ListaAnamneses() {
  const [anamneses, setAnamneses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregarAnamneses();
  }, []);

  async function carregarAnamneses() {
    const { data, error } = await supabase
      .from('anamneses')
      .select('*, alunos(nome)')
      .order('atualizado_em', { ascending: false });

    if (error) window.alert('Erro ao carregar: ' + error.message);
    else setAnamneses(data || []);
  }

  async function deletarAnamnese(id) {
    if (!window.confirm('Tem certeza que deseja apagar esta anamnese?')) return;
    const { error } = await supabase.from('anamneses').delete().eq('id', id);
    if (error) window.alert('Erro ao apagar: ' + error.message);
    else carregarAnamneses();
  }

  function renderBadgeTriagem(item) {
    if (item.liberacao_medica) {
      const dataLib = item.data_liberacao
        ? ` em ${new Date(`${item.data_liberacao}T00:00:00`).toLocaleDateString('pt-BR')}`
        : '';
      return (
        <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          🟢 Liberado pelo médico{dataLib}
        </span>
      );
    }

    if (item.situacao_triagem === 'vermelho') {
      return (
        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          🔴 Encaminhar ao médico
        </span>
      );
    }

    if (item.situacao_triagem === 'laranja') {
      return (
        <span style={{ background: '#ffedd5', color: '#9a3412', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          🟠 Só com liberação médica
        </span>
      );
    }

    return (
      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        🟢 Liberado
      </span>
    );
  }

  return (
    <div className="lista-anamneses-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>Anamneses Registadas</h2>
        <Link
          to="/anamnese"
          style={{
            background: '#2563eb',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          + Nova Anamnese
        </Link>
      </div>

      <table className="tabela-anamneses">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Data</th>
            <th>Situação da Triagem</th>
            <th>Condições Médicas</th>
            <th>Gatilhos Sensoriais</th>
            <th>Medicamentos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {anamneses.map((item) => {
            const dataExibir = item.atualizado_em || item.criado_em;
            return (
              <tr key={item.id}>
                <td><strong>{item.alunos?.nome || 'Aluno não encontrado'}</strong></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {dataExibir ? new Date(dataExibir).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td>{renderBadgeTriagem(item)}</td>
                <td>{item.condicoes_medicas || '-'}</td>
                <td>{item.gatilhos_sensoriais || '-'}</td>
                <td>{item.medicamentos || '-'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => navigate(`/anamnese?alunoId=${item.aluno_id}`)}
                    style={{
                      background: '#0ea5e9',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '6px',
                      fontWeight: 'bold',
                    }}
                  >
                    Ver / Editar
                  </button>
                  <button className="btn-deletar-anamnese" onClick={() => deletarAnamnese(item.id)}>
                    Apagar
                  </button>
                </td>
              </tr>
            );
          })}
          {anamneses.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                Nenhuma anamnese registada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}