import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';
import './Anamnese.css';

export default function MeuTreino() {
  const [treinos, setTreinos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarMeuTreino() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('user_id', user.id);

      if (data) setTreinos(data);
      setCarregando(false);
    }
    carregarMeuTreino();
  }, []);

  if (carregando) return <div className="anamnese-container"><p>A carregar o seu treino...</p></div>;

  return (
    <div className="anamnese-container" style={{ maxWidth: '800px', textAlign: 'left' }}>
      <h2 className="anamnese-title" style={{ textAlign: 'center' }}>O Meu Plano de Treino</h2>
      
      {treinos.length === 0 ? (
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <p>Ainda não existe nenhuma ficha de treino prescrita para si. Fale com o seu treinador!</p>
        </div>
      ) : (
        treinos.map((treino) => (
          <div key={treino.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#007bff', marginTop: 0 }}>🏋️‍♂️ {treino.titulo}</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Exercícios:</h4>
              <p style={{ whiteSpace: 'pre-line', background: '#f8f9fa', padding: '12px', borderRadius: '6px', margin: 0 }}>
                {treino.exercicios}
              </p>
            </div>

            {treino.observacoes_sensoriais && (
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#e67e22' }}>🎧 Cuidados Sensoriais e Adaptações:</h4>
                <p style={{ whiteSpace: 'pre-line', background: '#fef9e7', padding: '12px', borderRadius: '6px', margin: 0, borderLeft: '4px solid #f1c40f' }}>
                  {treino.observacoes_sensoriais}
                </p>
              </div>
            )}
            
            <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '15px', textAlign: 'right' }}>
              Prescrito em: {new Date(treino.criado_em).toLocaleDateString('pt-BR')}
            </span>
          </div>
        ))
      )}
    </div>
  );
}