import Hero from "../components/Hero"
import Diagnostico from "../components/Diagnostico"
import Origem from "../components/Origem"
import ComoFunciona from "../components/ComoFunciona"
import Metodologia from "../components/Metodologia"
import Capacidades from "../components/Capacidades"
import QuemSomos from "../components/QuemSomos"
import Contato from "../components/Contato"

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

export default Home