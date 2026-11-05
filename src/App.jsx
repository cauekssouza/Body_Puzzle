import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/superbase'
import Header from './components/Header'
import Hero from './components/Hero'
import Diagnostico from './components/Diagnostico'
import Origem from './components/Origem'
import ComoFunciona from './components/ComoFunciona'
import Metodologia from './components/Metodologia'
import Capacidades from './components/Capacidades'
import QuemSomos from './components/QuemSomos'
import Contato from './components/Contato'
import Footer from './components/Footer'
import Agendar from './pages/Agendar'
import Desenvolvedor from './pages/Desenvolvedor'
import CadastroAluno from './pages/CadastroAluno'
import ListaAlunos from './pages/ListaAlunos' 
import Anamnese from './pages/Anamnese'
import ListaAnamneses from './pages/ListaAnamneses'
import Login from './pages/Login'
import CadastroEquipe from './pages/CadastroEquipe' 
import Dashboard from './pages/Dashboard'
import PrescricaoTreino from './pages/PrescricaoTreino'
import MeuTreino from './pages/MeuTreino'
import RotaAdmin from './components/RotaAdmin'
import './components/Sections.css'

// NOVOS IMPORTS DA METODOLOGIA
import AvaliacaoFisica from './pages/AvaliacaoFisica'
import GeradorCartaTrunfo from './pages/GeradorCartaTrunfo'

function Home() {
  return (
    <main>
      <Hero />
      <Diagnostico />
      <Origem />
      <ComoFunciona />
      <Metodologia />
      <Capacidades />
      <QuemSomos />
      <Contato />
    </main>
  )
}

function App() {
  const [sessao, setSessao] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
    })
  }, [])

  return (
    <>
      <Header sessao={sessao} />
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/desenvolvedor" element={<Desenvolvedor />} />
        <Route path="/cadastro" element={<CadastroAluno />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro-equipe" element={<CadastroEquipe />} />
        
        {/* Rotas Protegidas Exclusivas para Administradores (Protegidas pelo RotaAdmin) */}
        <Route path="/dashboard" element={<RotaAdmin><Dashboard /></RotaAdmin>} />
        <Route path="/prescrever-treino" element={<RotaAdmin><PrescricaoTreino /></RotaAdmin>} />
        <Route path="/alunos" element={<RotaAdmin><ListaAlunos /></RotaAdmin>} />
        <Route path="/anamneses-lista" element={<RotaAdmin><ListaAnamneses /></RotaAdmin>} />
        <Route path="/anamnese" element={<RotaAdmin><Anamnese /></RotaAdmin>} />
        
        {/* NOVAS ROTAS DE ADMINISTRAÇÃO (Fases 3 e 4) */}
        <Route path="/avaliacao" element={<RotaAdmin><AvaliacaoFisica /></RotaAdmin>} />
        <Route path="/carta-trunfo" element={<RotaAdmin><GeradorCartaTrunfo /></RotaAdmin>} />
        
        {/* Rotas Protegidas para Alunos Comuns */}
        <Route path="/agendar" element={sessao ? <Agendar /> : <Navigate to="/login" />} />
        <Route path="/meu-treino" element={sessao ? <MeuTreino /> : <Navigate to="/login" />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App