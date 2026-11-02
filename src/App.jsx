import { Routes, Route } from 'react-router-dom'
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
import './components/Sections.css'


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
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agendar" element={<Agendar />} />
        <Route path="/desenvolvedor" element={<Desenvolvedor />} />
        <Route path="/cadastro" element={<CadastroAluno />} />
        <Route path="/alunos" element={<ListaAlunos />} /> {/* <-- Nova rota adicionada aqui */}
      </Routes>
      <Footer />
    </>
  )
}

export default App