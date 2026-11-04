import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import './Anamnese.css';

export default function Dashboard() {
  const [totalAlunos, setTotalAlunos] = useState(0);

  useEffect(() => {
    async function contarAlunos() {
      // Faz uma requisição otimizada apenas para contar as linhas
      const { count, error } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setTotalAlunos(count);
      }
    }
    contarAlunos();
  }, []);

  return (
    <div className="anamnese-container" style={{ textAlign: 'center', marginTop: '80px' }}>
      <h2 className="anamnese-title">Visão Geral do Sistema</h2>
      <div style={{ background: '#f4f7f6', padding: '50px', borderRadius: '12px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '64px', color: '#007bff', margin: '0' }}>{totalAlunos}</h1>
        <p style={{ fontSize: '18px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>
          Alunos Cadastrados
        </p>
      </div>
    </div>
  );
}