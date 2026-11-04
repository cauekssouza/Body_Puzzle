import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';

export default function MeuTreino() {
  const [treino, setTreino] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarTreinoDoAluno() {
      // 1. Identifica o aluno que está logado atualmente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCarregando(false);
        return;
      }

      // 2. Vai à tabela 'treinos' buscar o treino correspondente ao user_id
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('user_id', user.id)
        .order('criado_em', { ascending: false }) // Pega no treino mais recente
        .limit(1)
        .single();

      if (data) {
        setTreino(data);
      }
      setCarregando(false);
    }

    buscarTreinoDoAluno();
  }, []);

  if (carregando) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>A carregar a tua rotina...</div>;
  }

  return (
    <div style={{ maxWidth: '750px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#0056b3', marginBottom: '20px', textAlign: 'center' }}>🌟 A Minha Rotina Visual</h2>
      
      {treino ? (
        <div style={{ background: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {/* Título do Treino (ex: TREINO A) */}
          <h3 style={{ marginTop: 0, color: '#333', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
            {treino.titulo}
          </h3>
          
          {/* Bloco de Exercícios */}
          <div style={{ background: '#fff', padding: '18px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #28a745' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🏋️ Exercícios do Dia:</h4>
            <p style={{ whiteSpace: 'pre-line', margin: 0, color: '#495057', lineHeight: '1.6', fontSize: '15px' }}>
              {treino.exercicios}
            </p>
          </div>

          {/* Cuidados Sensoriais (se existirem) */}
          {treino.observacoes_sensoriais && (
            <div style={{ background: '#fff3cd', padding: '18px', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>💡 Cuidados Sensoriais e Ambiente:</h4>
              <p style={{ whiteSpace: 'pre-line', margin: 0, color: '#856404', lineHeight: '1.6', fontSize: '15px' }}>
                {treino.observacoes_sensoriais}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px dashed #ccc' }}>
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>Ainda não tens nenhuma rotina de treino publicada pela equipa. Volta em breve!</p>
        </div>
      )}
    </div>
  );
}