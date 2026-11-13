import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';
import { calcularSituacaoPagamento } from './ListaAlunos';
import './Anamnese.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalAnamneses, setTotalAnamneses] = useState(0);
  const [pagamentosAtrasados, setPagamentosAtrasados] = useState(0);

  useEffect(() => {
    async function buscarDados() {
      // 1. Busca alunos ativos para contar total e verificar pagamentos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('id, ativo, valor_mensal, dia_vencimento');

      const alunosAtivos = (alunosData || []).filter((a) => a.ativo !== false);
      setTotalAlunos(alunosAtivos.length);

      // 2. Conta as anamneses
      const { count: countAnamneses } = await supabase
        .from('anamneses')
        .select('*', { count: 'exact', head: true });
      if (countAnamneses !== null) setTotalAnamneses(countAnamneses);

      // 3. Busca pagamentos e calcula quantos alunos ativos estão atrasados no mês
      const { data: pagsData } = await supabase.from('pagamentos').select('aluno_id, referencia');
      const atrasados = alunosAtivos.filter((aluno) => {
        const pagsAluno = (pagsData || []).filter((p) => p.aluno_id === aluno.id);
        return calcularSituacaoPagamento(aluno, pagsAluno).status === 'Atrasado';
      }).length;

      setPagamentosAtrasados(atrasados);
    }
    buscarDados();
  }, []);

  return (
    <div className="anamnese-container" style={{ textAlign: 'center', marginTop: '80px', maxWidth: '950px' }}>
      <h2 className="anamnese-title">Visão Geral do Sistema</h2>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
        <div
          onClick={() => navigate('/alunos')}
          style={{ background: '#f4f7f6', padding: '40px', borderRadius: '12px', flex: '1', minWidth: '240px', cursor: 'pointer' }}
        >
          <h1 style={{ fontSize: '54px', color: '#4460B8', margin: '0' }}>{totalAlunos}</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>Alunos Ativos</p>
        </div>

        <div
          onClick={() => navigate('/anamneses-lista')}
          style={{ background: '#f4f7f6', padding: '40px', borderRadius: '12px', flex: '1', minWidth: '240px', cursor: 'pointer' }}
        >
          <h1 style={{ fontSize: '54px', color: '#2DAFAB', margin: '0' }}>{totalAnamneses}</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>Anamneses Preenchidas</p>
        </div>

        <div
          onClick={() => navigate('/alunos')}
          style={{
            background: pagamentosAtrasados > 0 ? '#fef2f2' : '#f4f7f6',
            border: pagamentosAtrasados > 0 ? '1px solid #fecaca' : 'none',
            padding: '40px',
            borderRadius: '12px',
            flex: '1',
            minWidth: '240px',
            cursor: 'pointer',
          }}
        >
          <h1 style={{ fontSize: '54px', color: pagamentosAtrasados > 0 ? '#EB002E' : '#64748b', margin: '0' }}>
            {pagamentosAtrasados}
          </h1>
          <p style={{ fontSize: '18px', color: pagamentosAtrasados > 0 ? '#991b1b' : '#666', marginTop: '10px', fontWeight: 'bold' }}>
            Pagamentos Atrasados
          </p>
        </div>
      </div>
    </div>
  );
}