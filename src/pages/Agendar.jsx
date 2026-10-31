import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/superbase"
import { contato } from "../data/contato"
import "./Agendar.css"

// Segunda a sexta, sessões de 60 min começando das 8h às 19h (última termina às 20h)
const HORARIOS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// Data no formato AAAA-MM-DD, no fuso do computador
function paraTexto(data) {
  const a = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, "0")
  const d = String(data.getDate()).padStart(2, "0")
  return `${a}-${m}-${d}`
}

function dataPorExtenso(texto) {
  const [a, m, d] = texto.split("-").map(Number)
  const data = new Date(a, m - 1, d)
  return data.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
}

// Deixa o número no formato (41) 99999-9999 enquanto a pessoa digita
function formatarTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11) // só números, no máximo 11
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function Agendar() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Abre no mês do próximo dia útil (ex.: em 31/10, sábado, já abre em novembro)
  const proximoDiaUtil = new Date(hoje)
  while (proximoDiaUtil.getDay() === 0 || proximoDiaUtil.getDay() === 6) {
    proximoDiaUtil.setDate(proximoDiaUtil.getDate() + 1)
  }

  const [mes, setMes] = useState(
    new Date(proximoDiaUtil.getFullYear(), proximoDiaUtil.getMonth(), 1)
  )
  const [diaEscolhido, setDiaEscolhido] = useState(null)
  const [horaEscolhida, setHoraEscolhida] = useState(null)
  const [ocupados, setOcupados] = useState({}) // { "2026-11-03": ["08:00", ...] }
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [status, setStatus] = useState("parado") // parado | enviando | ok | erro
  const [mensagem, setMensagem] = useState("")

  // Dias que aparecem no calendário do mês atual
  const dias = useMemo(() => {
    const lista = []
    const primeiroDiaSemana = mes.getDay()
    for (let i = 0; i < primeiroDiaSemana; i++) lista.push(null)
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    for (let d = 1; d <= totalDias; d++) lista.push(new Date(mes.getFullYear(), mes.getMonth(), d))
    return lista
  }, [mes])

  // Busca no banco os horários já marcados no mês
  async function carregarOcupados() {
    const inicio = paraTexto(mes)
    const fim = paraTexto(new Date(mes.getFullYear(), mes.getMonth() + 1, 0))
    const { data, error } = await supabase.rpc("horarios_ocupados", { inicio, fim })
    if (error) {
      console.error(error)
      return
    }
    const mapa = {}
    data.forEach((linha) => {
      const hora = linha.hora.slice(0, 5)
      if (!mapa[linha.data]) mapa[linha.data] = []
      mapa[linha.data].push(hora)
    })
    setOcupados(mapa)
  }

  useEffect(() => {
    carregarOcupados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes])

  function diaDisponivel(data) {
    const fimDeSemana = data.getDay() === 0 || data.getDay() === 6
    return data >= hoje && !fimDeSemana
  }

  function horaPassou(hora) {
    if (diaEscolhido !== paraTexto(hoje)) return false
    const agora = new Date()
    return Number(hora.slice(0, 2)) <= agora.getHours()
  }

  function mudarMes(delta) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1))
  }

  async function enviar(evento) {
    evento.preventDefault()

    // Exige DDD + número (pelo menos 10 dígitos)
    const digitos = telefone.replace(/\D/g, "")
    if (digitos.length < 10) {
      setStatus("erro")
      setMensagem("Confira o WhatsApp: digite o DDD e o número, como (41) 99999-9999.")
      return
    }

    setStatus("enviando")
    setMensagem("")

    const { error } = await supabase.from("agendamentos").insert({
      nome: nome.trim(),
      telefone: telefone.trim(),
      data: diaEscolhido,
      hora: horaEscolhida,
    })

    if (error) {
      setStatus("erro")
      // 23505 = alguém marcou esse mesmo horário antes
      setMensagem(error.code === "23505"
        ? "Esse horário acabou de ser marcado por outra pessoa. Escolha outro."
        : "Não foi possível salvar o agendamento. Tente de novo em instantes.")
      setHoraEscolhida(null)
      carregarOcupados()
      return
    }

    setStatus("ok")
    carregarOcupados()
  }

  function novoAgendamento() {
    setStatus("parado")
    setDiaEscolhido(null)
    setHoraEscolhida(null)
    setNome("")
    setTelefone("")
  }

  const voltarDesabilitado = mes <= new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const ocupadosNoDia = (diaEscolhido && ocupados[diaEscolhido]) || []

  // Tela de confirmação, depois que o agendamento foi salvo
  if (status === "ok") {
    const textoWhats =
      `Olá! Acabei de agendar uma sessão na Body Puzzle.\n` +
      `Nome: ${nome}\n` +
      `WhatsApp: ${telefone}\n` +
      `Dia: ${dataPorExtenso(diaEscolhido)}\n` +
      `Horário: ${horaEscolhida}`
    const linkWhats = `${contato.whatsappUrl}?text=${encodeURIComponent(textoWhats)}`

    return (
      <main className="band agendar">
        <div className="wrap confirmado">
          <span className="eyebrow">Agendamento confirmado</span>
          <h2>Até lá, {nome.split(" ")[0]}!</h2>
          <p className="lede">
            Sua sessão está marcada para <strong>{dataPorExtenso(diaEscolhido)}</strong>, às{" "}
            <strong>{horaEscolhida}</strong>. Para agilizar, avise a gente no WhatsApp:
          </p>
          <div className="cta-row">
            <a className="btn primary" href={linkWhats} target="_blank" rel="noopener noreferrer">
              Avisar no WhatsApp
            </a>
            <button className="btn ghost" type="button" onClick={novoAgendamento}>
              Marcar outro horário
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="band agendar">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Agendamento</span>
          <h2>Marque sua sessão</h2>
          <p className="lede">
            Escolha o dia e o horário. As sessões duram 60 minutos e acontecem de segunda a
            sexta, das 8h às 20h.
          </p>
        </div>

        <div className="agendar-grid">
          {/* Calendário */}
          <div className="calendario">
            <div className="cal-topo">
              <button type="button" className="cal-nav" onClick={() => mudarMes(-1)}
                disabled={voltarDesabilitado} aria-label="Mês anterior">‹</button>
              <strong>{MESES[mes.getMonth()]} {mes.getFullYear()}</strong>
              <button type="button" className="cal-nav" onClick={() => mudarMes(1)}
                aria-label="Próximo mês">›</button>
            </div>

            <div className="cal-semana">
              {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
            </div>

            <div className="cal-dias">
              {dias.map((data, i) => {
                if (!data) return <span key={`vazio-${i}`} />
                const texto = paraTexto(data)
                const livre = diaDisponivel(data)
                const lotado = (ocupados[texto] || []).length >= HORARIOS.length
                const classes = ["cal-dia"]
                if (texto === diaEscolhido) classes.push("escolhido")
                if (texto === paraTexto(hoje)) classes.push("hoje")
                return (
                  <button
                    key={texto}
                    type="button"
                    className={classes.join(" ")}
                    disabled={!livre || lotado}
                    onClick={() => { setDiaEscolhido(texto); setHoraEscolhida(null) }}
                  >
                    {data.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Horários e formulário */}
          <div className="painel">
            {!diaEscolhido ? (
              <p className="painel-vazio">Escolha um dia no calendário para ver os horários livres.</p>
            ) : (
              <>
                <h3 className="painel-dia">{dataPorExtenso(diaEscolhido)}</h3>
                <div className="horarios">
                  {HORARIOS.map((hora) => {
                    const indisponivel = ocupadosNoDia.includes(hora) || horaPassou(hora)
                    return (
                      <button
                        key={hora}
                        type="button"
                        className={hora === horaEscolhida ? "hora escolhida" : "hora"}
                        disabled={indisponivel}
                        onClick={() => setHoraEscolhida(hora)}
                      >
                        {hora}
                      </button>
                    )
                  })}
                </div>

                {horaEscolhida && (
                  <form className="form-agendar" onSubmit={enviar}>
                    <label htmlFor="nome">Nome do aluno ou responsável</label>
                    <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />

                    <label htmlFor="telefone">WhatsApp</label>
                    <input id="telefone" type="tel" inputMode="numeric" required
                      placeholder="(41) 99999-9999" value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))} />

                    <button className="btn primary" type="submit" disabled={status === "enviando"}>
                      {status === "enviando" ? "Salvando..." : `Confirmar às ${horaEscolhida}`}
                    </button>
                  </form>
                )}

                {status === "erro" && <p className="aviso-erro">{mensagem}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Agendar