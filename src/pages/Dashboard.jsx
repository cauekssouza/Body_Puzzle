import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import './Anamnese.css';

export default function Dashboard() {
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalAnamneses, setTotalAnamneses] = useState(0);

  useEffect(() => {
    async function buscarDados() {
      // Conta os alunos
      const { count: countAlunos } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true });
      if (countAlunos !== null) setTotalAlunos(countAlunos);

      // Conta as anamneses
      const { count: countAnamneses } = await supabase
        .from('anamneses')
        .select('*', { count: 'exact', head: true });
      if (countAnamneses !== null) setTotalAnamneses(countAnamneses);
    }
    buscarDados();
  }, []);

  return (
    <div className="anamnese-container" style={{ textAlign: 'center', marginTop: '80px', maxWidth: '800px' }}>
      <h2 className="anamnese-title">Visão Geral do Sistema</h2>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: '#f4f7f6', padding: '40px', borderRadius: '12px', flex: '1', minWidth: '250px' }}>
          <h1 style={{ fontSize: '54px', color: '#007bff', margin: '0' }}>{totalAlunos}</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>Alunos Cadastrados</p>
        </div>
        <div style={{ background: '#f4f7f6', padding: '40px', borderRadius: '12px', flex: '1', minWidth: '250px' }}>
          <h1 style={{ fontSize: '54px', color: '#28a745', margin: '0' }}>{totalAnamneses}</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>Anamneses Preenchidas</p>
        </div>
      </div>
    </div>
  );
}