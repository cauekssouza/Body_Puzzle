import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import './ListaAlunos.css';

export function calcularSituacaoPagamento(aluno, pagamentosAluno) {
  if (!aluno.valor_mensal || !aluno.dia_vencimento) {
    return { status: 'Sem plano', corBg: '#f1f5f9', corTexto: '#475569' };
  }

  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
  const anoAtual = hoje.getFullYear();
  const refAtual = `${mesAtual}/${anoAtual}`;

  const jaPagou = (pagamentosAluno || []).some((p) => p.referencia === refAtual);
  if (jaPagou) {
    return { status: 'Pago', corBg: '#dcfce7', corTexto: '#166534' };
  }

  if (hoje.getDate() <= Number(aluno.dia_vencimento)) {
    return { status: 'Pendente', corBg: '#fef9c3', corTexto: '#854d0e' };
  }

  return { status: 'Atrasado', corBg: '#fee2e2', corTexto: '#991b1b' };
}

export default function ListaAlunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editValorMensal, setEditValorMensal] = useState('');
  const [editDiaVenc, setEditDiaVenc] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: dadosAlunos, error } = await supabase
      .from('alunos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      window.alert('Erro ao carregar alunos: ' + error.message);
      return;
    }
    setAlunos(dadosAlunos || []);

    const { data: dadosPags } = await supabase.from('pagamentos').select('*');
    setPagamentos(dadosPags || []);
  }

  // Seção 7.1: Apagar vira Arquivar (aluno inativo) para não perder o histórico
  async function alternarArquivoAluno(aluno) {
    const vaiArquivar = aluno.ativo !== false;
    const msg = vaiArquivar
      ? `Deseja arquivar (inativar) o aluno "${aluno.nome}"? O histórico de avaliações e treinos será mantido.`
      : `Deseja reativar o aluno "${aluno.nome}"?`;

    if (!window.confirm(msg)) return;

    const { error } = await supabase
      .from('alunos')
      .update({ ativo: !vaiArquivar })
      .eq('id', aluno.id);

    if (error) {
      window.alert('Erro ao atualizar status: ' + error.message);
    } else {
      carregarDados();
    }
  }

  function iniciarEdicao(aluno) {
    setEditandoId(aluno.id);
    setEditNome(aluno.nome || '');
    setEditTelefone(aluno.telefone || '');
    setEditValorMensal(aluno.valor_mensal ?? '');
    setEditDiaVenc(aluno.dia_vencimento ?? '');
  }

  async function salvarEdicao(id) {
    const { error } = await supabase
      .from('alunos')
      .update({
        nome: editNome,
        telefone: editTelefone,
        valor_mensal: editValorMensal !== '' ? Number(editValorMensal) : null,
        dia_vencimento: editDiaVenc !== '' ? Number(editDiaVenc) : null,
      })
      .eq('id', id);

    if (error) {
      window.alert('Erro ao atualizar: ' + error.message);
    } else {
      setEditandoId(null);
      carregarDados();
    }
  }

  const alunosFiltrados = alunos.filter((a) =>
    mostrarArquivados ? a.ativo === false : a.ativo !== false
  );

  return (
    <div className="lista-container" style={{ maxWidth: '1050px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>
          {mostrarArquivados ? 'Alunos Arquivados (Inativos)' : 'Alunos Ativos'}
        </h2>
        <button
          onClick={() => setMostrarArquivados(!mostrarArquivados)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#334155',
          }}
        >
          {mostrarArquivados ? 'Ver Alunos Ativos' : 'Ver Arquivados'}
        </button>
      </div>

      <table className="lista-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Mensalidade / Venc.</th>
            <th>Situação do Mês</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {alunosFiltrados.map((aluno) => {
            const pagsDoAluno = pagamentos.filter((p) => p.aluno_id === aluno.id);
            const situacao = calcularSituacaoPagamento(aluno, pagsDoAluno);

            return (
              <tr key={aluno.id}>
                {editandoId === aluno.id ? (
                  <>
                    <td>
                      <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                    </td>
                    <td>
                      <input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="R$"
                          style={{ width: '80px' }}
                          value={editValorMensal}
                          onChange={(e) => setEditValorMensal(e.target.value)}
                        />
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Dia"
                          style={{ width: '55px' }}
                          value={editDiaVenc}
                          onChange={(e) => setEditDiaVenc(e.target.value)}
                        />
                      </div>
                    </td>
                    <td>-</td>
                    <td>
                      <button className="btn-salvar" onClick={() => salvarEdicao(aluno.id)}>
                        Salvar
                      </button>
                      <button className="btn-cancelar" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <Link
                        to={`/alunos/${aluno.id}`}
                        style={{ color: '#4460B8', fontWeight: 'bold', textDecoration: 'none', fontSize: '15px' }}
                      >
                        {aluno.nome}
                      </Link>
                    </td>
                    <td>{aluno.telefone || '-'}</td>
                    <td>
                      {aluno.valor_mensal
                        ? `R$ ${Number(aluno.valor_mensal).toFixed(2)} (Dia ${aluno.dia_vencimento || '-'})`
                        : '-'}
                    </td>
                    <td>
                      <span
                        style={{
                          background: situacao.corBg,
                          color: situacao.corTexto,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {situacao.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => navigate(`/alunos/${aluno.id}`)}
                        style={{
                          background: '#4460B8',
                          color: '#fff',
                          marginRight: '6px',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        Abrir
                      </button>
                      <button className="btn-editar" onClick={() => iniciarEdicao(aluno)}>
                        Editar
                      </button>
                      <button
                        onClick={() => alternarArquivoAluno(aluno)}
                        style={{
                          background: aluno.ativo === false ? '#22c55e' : '#64748b',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginLeft: '5px',
                        }}
                      >
                        {aluno.ativo === false ? 'Reativar' : 'Arquivar'}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          {alunosFiltrados.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                Nenhum aluno encontrado nesta lista.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}