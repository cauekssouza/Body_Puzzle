import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/superbase';

export default function RotaAdmin({ children }) {
  const [autorizado, setAutorizado] = useState(null); // null = a verificar, true = admin, false = negado

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAutorizado(false);
        return;
      }

      // Lista oficial de administradores globais
      const emailsAdmin = [
        'cauekssouza@gmail.com',
        'bodypuzzle.treinamento@gmail.com',
        'edususs@yahoo.com.br',
        'andre.goncalves03@hotmail.com'
      ];

      if (emailsAdmin.includes(user.email)) {
        setAutorizado(true);
        return;
      }

      // Se não estiver na lista de e-mails, verifica o papel na tabela perfis
      const { data } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data && data.role === 'admin') {
        setAutorizado(true);
      } else {
        setAutorizado(false);
      }
    }
    verificar();
  }, []);

  if (autorizado === null) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>A verificar permissões...</div>;
  }

  if (!autorizado) {
    window.alert('Acesso negado. Área restrita a administradores.');
    return <Navigate to="/agendar" replace />;
  }

  return children;
}