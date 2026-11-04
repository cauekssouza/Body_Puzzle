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
import './components/Sections.css'
import Dashboard from './pages/Dashboard'

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
        <Route path="/" element={<Home />} />
        <Route path="/desenvolvedor" element={<Desenvolvedor />} />
        
        {/* Rotas Públicas */}
        <Route path="/cadastro" element={<CadastroAluno />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro-equipe" element={<CadastroEquipe />} /> {/* <-- Rota adicionada */}
        
        {/* Rotas Protegidas (Exigem Login) */}
        <Route path="/agendar" element={sessao ? <Agendar /> : <Navigate to="/login" />} />
        <Route path="/alunos" element={sessao ? <ListaAlunos /> : <Navigate to="/login" />} />
        <Route path="/anamnese" element={sessao ? <Anamnese /> : <Navigate to="/login" />} />
        <Route path="/anamneses-lista" element={sessao ? <ListaAnamneses /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={sessao ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App