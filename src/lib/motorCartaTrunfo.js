export function calcularNotasCarta(avaliacao) {
  if (!avaliacao) return null;

  const notas = {
    forca: null,
    mobilidade: null,
    potencia: null,
    fitness: null,
    resistencia: null,
    overall: 0
  };

  // 1. FITNESS (Composição Corporal)
  if (avaliacao.perc_gordura > 0) {
    // Referências: Homem 8%, Mulher 16%
    const ref = (avaliacao.sexo === 'Feminino' || avaliacao.sexo === 'Feminina') ? 16 : 8;
    const percG = avaliacao.perc_gordura;
    
    // Fórmula: arred(max(0; min(99; (ref + 40 - %G) / 40 * 99)))
    let notaFitness = Math.round(Math.max(0, Math.min(99, ((ref + 40 - percG) / 40) * 99)));
    notas.fitness = notaFitness;
  }

  // 2. RESISTÊNCIA
  if (avaliacao.resistencia) {
    const { tc6, cooper, vo2 } = avaliacao.resistencia;
    // Prioriza o Cooper se existir, senão usa o TC6
    if (cooper && parseFloat(vo2) > 0) {
      // Ref provisória: Homem 55.2, Mulher 44.7 (abaixo de 30 anos)
      const ref = (avaliacao.sexo === 'Feminino') ? 44.7 : 55.2;
      notas.resistencia = Math.min(99, Math.round(70 + (parseFloat(vo2) / ref) * 20));
    } 
    else if (tc6 && parseFloat(tc6) > 0) {
      // Usa a distância prevista (que já calculamos na avaliação e podemos recalcular aqui ou passar como parâmetro)
      // Para simplificar o exemplo, assumimos uma previsão média se não vier calculada
      const dist = parseFloat(tc6);
      const prev = 600; // Isto deve vir do cálculo exato gravado na DB
      notas.resistencia = Math.round(Math.min(70, (dist / prev) * 60));
    }
  }

  // 3. POTÊNCIA (Exemplo prático com o Salto CMJ e Medball)
  const testesPotencia = [];
  if (avaliacao.potencia) {
    const p = avaliacao.potencia;
    if (p.cmj) testesPotencia.push(Math.min(99, (parseFloat(p.cmj) / 38) * 70)); // ref CMJ 38cm
    if (p.sj) testesPotencia.push(Math.min(99, (parseFloat(p.sj) / 34) * 70)); // ref SJ 34cm
    if (p.medball) testesPotencia.push(Math.min(99, (parseFloat(p.medball) / 400) * 70)); // ref Medball 400cm
    
    if (testesPotencia.length > 0) {
      const mediaPotencia = testesPotencia.reduce((a, b) => a + b, 0) / testesPotencia.length;
      notas.potencia = Math.round(mediaPotencia);
    }
  }

  // 4. CÁLCULO DO OVERALL (Média dos atributos avaliados)
  const atributosValidos = [notas.forca, notas.mobilidade, notas.potencia, notas.fitness, notas.resistencia].filter(n => n !== null);
  
  if (atributosValidos.length > 0) {
    const soma = atributosValidos.reduce((a, b) => a + b, 0);
    notas.overall = Math.round(soma / atributosValidos.length);
  }

  return notas;
}