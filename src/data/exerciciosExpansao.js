// Catálogo oficial de expansão da Biblioteca (Seção 6):
// 45 exercícios de Calistenia (status: 'Metodologia', níveis Tuck=1, One-leg=2, Straddle=3, Full=4)
// 23 exercícios de Mobilidade (tipo: 'Mobilidade', status: 'Proposta (revisar)', subpadrão por região do corpo)

export function converterNivelCalistenia(valorNivel, nomeExercicio = '') {
  if (valorNivel !== null && valorNivel !== undefined && valorNivel !== '') {
    const num = Number(valorNivel);
    if (!Number.isNaN(num) && num >= 1 && num <= 5) {
      return num;
    }
    const txt = String(valorNivel).toLowerCase().trim();
    if (txt.includes('tuck')) return 1;
    if (txt.includes('one-leg') || txt.includes('one leg') || txt.includes('1-leg') || txt.includes('unilateral')) return 2;
    if (txt.includes('straddle')) return 3;
    if (txt.includes('full')) return 4;
  }

  const nomeNorm = String(nomeExercicio || '').toLowerCase();
  if (nomeNorm.includes('tuck')) return 1;
  if (nomeNorm.includes('one-leg') || nomeNorm.includes('one leg')) return 2;
  if (nomeNorm.includes('straddle')) return 3;
  if (nomeNorm.includes('full')) return 4;

  return null;
}

export const EXERCICIOS_CALISTENIA_45 = [
  // Front Lever (4 níveis)
  { nome: 'Front Lever (Tuck)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 1, ordem: 1, tipo: 'Isometria', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Escápulas deprimidas e braços estendidos' },
  { nome: 'Front Lever (One-leg)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 2, ordem: 2, tipo: 'Isometria', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Manter quadril alinhado ao tronco' },
  { nome: 'Front Lever (Straddle)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 3, ordem: 3, tipo: 'Isometria', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Abdução ativa do quadril e linha horizontal' },
  { nome: 'Front Lever (Full)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 4, ordem: 4, tipo: 'Isometria', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Corpo totalmente alinhado paralelo ao solo' },

  // Back Lever (4 níveis)
  { nome: 'Back Lever (Tuck)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 1, ordem: 5, tipo: 'Isometria', equipamentos: ['Argolas', 'Barra fixa'], status: 'Metodologia', pontos_atencao: 'Protração escapular e cotovelos bloqueados' },
  { nome: 'Back Lever (One-leg)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 2, ordem: 6, tipo: 'Isometria', equipamentos: ['Argolas', 'Barra fixa'], status: 'Metodologia', pontos_atencao: 'Evitar hiperextensão lombar' },
  { nome: 'Back Lever (Straddle)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 3, ordem: 7, tipo: 'Isometria', equipamentos: ['Argolas', 'Barra fixa'], status: 'Metodologia', pontos_atencao: 'Glúteos contraídos e linha horizontal' },
  { nome: 'Back Lever (Full)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 4, ordem: 8, tipo: 'Isometria', equipamentos: ['Argolas', 'Barra fixa'], status: 'Metodologia', pontos_atencao: 'Alinhamento total ombro-quadril-tornozelo' },

  // Planche (4 níveis)
  { nome: 'Planche (Tuck)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 1, ordem: 9, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Protração máxima e cotovelos estendidos' },
  { nome: 'Planche (One-leg)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 2, ordem: 10, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Inclinação anterior dos ombros controlada' },
  { nome: 'Planche (Straddle)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 3, ordem: 11, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Retroversão pélvica e bloqueio articular' },
  { nome: 'Planche (Full)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 4, ordem: 12, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Corpo paralelo ao solo em suspensão nos braços' },

  // L-Sit / V-Sit (4 níveis)
  { nome: 'L-Sit (Tuck)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 1, ordem: 13, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Depressão escapular ativa' },
  { nome: 'L-Sit (One-leg)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 2, ordem: 14, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Joelho da perna estendida travado' },
  { nome: 'L-Sit (Straddle)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 3, ordem: 15, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Flexão de quadril com abdução ativa' },
  { nome: 'L-Sit (Full)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 4, ordem: 16, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Pernas unidas a 90 graus do tronco' },

  // Human Flag / Bandeira Humana (4 níveis)
  { nome: 'Human Flag / Bandeira (Tuck)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 1, ordem: 17, tipo: 'Isometria', equipamentos: ['Barra vertical/espaldar'], status: 'Metodologia', pontos_atencao: 'Braço inferior empurra e superior puxa' },
  { nome: 'Human Flag / Bandeira (One-leg)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 2, ordem: 18, tipo: 'Isometria', equipamentos: ['Barra vertical/espaldar'], status: 'Metodologia', pontos_atencao: 'Estabilidade lateral de tronco e ombros' },
  { nome: 'Human Flag / Bandeira (Straddle)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 3, ordem: 19, tipo: 'Isometria', equipamentos: ['Barra vertical/espaldar'], status: 'Metodologia', pontos_atencao: 'Evitar rotação do quadril' },
  { nome: 'Human Flag / Bandeira (Full)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 4, ordem: 20, tipo: 'Isometria', equipamentos: ['Barra vertical/espaldar'], status: 'Metodologia', pontos_atencao: 'Corpo horizontal perpendicular ao espaldar' },

  // Handstand / Parada de Mão (4 níveis)
  { nome: 'Handstand / Parada de Mão (Tuck)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 1, ordem: 21, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Apoio (parede/banco)'], status: 'Metodologia', pontos_atencao: 'Elevação escapular máxima e pressão nos dedos' },
  { nome: 'Handstand / Parada de Mão (One-leg)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 2, ordem: 22, tipo: 'Isometria', equipamentos: ['Peso corporal', 'Apoio (parede/banco)'], status: 'Metodologia', pontos_atencao: 'Alinhamento de costelas e pelve' },
  { nome: 'Handstand / Parada de Mão (Straddle)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 3, ordem: 23, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Equilíbrio livre com pernas afastadas' },
  { nome: 'Handstand / Parada de Mão (Full)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 4, ordem: 24, tipo: 'Isometria', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Linha vertical perfeita punho-ombro-quadril-pés' },

  // Handstand Push-up / HSPU (4 níveis)
  { nome: 'Pike Push-up (Tuck / Pés no chão)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 1, ordem: 25, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Cabeça desce à frente das mãos formando triângulo' },
  { nome: 'Pike Push-up Elevado (One-leg / Caixa)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 2, ordem: 26, tipo: 'Força', equipamentos: ['Caixote', 'Banco'], status: 'Metodologia', pontos_atencao: 'Quadril alinhado acima dos ombros' },
  { nome: 'Handstand Push-up na Parede (Straddle)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 3, ordem: 27, tipo: 'Força', equipamentos: ['Apoio (parede/banco)'], status: 'Metodologia', pontos_atencao: 'Controle excêntrico sem perder tensão lombar' },
  { nome: 'Handstand Push-up Livre (Full)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 4, ordem: 28, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Amplitude completa mantendo equilíbrio vertical' },

  // Front Lever Pull-up / Remada em Suspensão (4 níveis)
  { nome: 'Front Lever Row (Tuck)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 1, ordem: 29, tipo: 'Força', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Puxar mantendo tronco paralelo ao solo' },
  { nome: 'Front Lever Row (One-leg)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 2, ordem: 30, tipo: 'Força', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Manter linha horizontal durante toda a puxada' },
  { nome: 'Front Lever Row (Straddle)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 3, ordem: 31, tipo: 'Força', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Evitar balanço de quadril' },
  { nome: 'Front Lever Row (Full)', padrao: 'Calistenia', subpadrao: 'Puxada', nivel: 4, ordem: 32, tipo: 'Força', equipamentos: ['Barra fixa', 'Argolas'], status: 'Metodologia', pontos_atencao: 'Força máxima de puxada horizontal em suspensão' },

  // Planche Push-up (4 níveis)
  { nome: 'Pseudo Planche Push-up (Tuck)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 1, ordem: 33, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Mãos na linha da cintura com inclinação anterior' },
  { nome: 'Tuck Planche Push-up (One-leg)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 2, ordem: 34, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Sem tocar os pés no solo durante a flexão' },
  { nome: 'Planche Push-up (Straddle)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 3, ordem: 35, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Manter quadril na linha do ombro' },
  { nome: 'Planche Push-up (Full)', padrao: 'Calistenia', subpadrao: 'Empurrada', nivel: 4, ordem: 36, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Execução estrita em Full Planche' },

  // Muscle-up & Transições (4 níveis)
  { nome: 'Muscle-up com Elástico / Transição (Tuck)', padrao: 'Calistenia', subpadrao: 'Dinâmicos / Skills', nivel: 1, ordem: 37, tipo: 'Força', equipamentos: ['Barra fixa', 'Argolas', 'Elástico'], status: 'Metodologia', pontos_atencao: 'Pegada falsa e transição próxima ao peito' },
  { nome: 'Muscle-up na Barra (One-leg / Kipping leve)', padrao: 'Calistenia', subpadrao: 'Dinâmicos / Skills', nivel: 2, ordem: 38, tipo: 'Força', equipamentos: ['Barra fixa'], status: 'Metodologia', pontos_atencao: 'Puxada explosiva até a linha do esterno' },
  { nome: 'Ring Muscle-up Estrito (Straddle / L-Sit)', padrao: 'Calistenia', subpadrao: 'Dinâmicos / Skills', nivel: 3, ordem: 39, tipo: 'Força', equipamentos: ['Argolas'], status: 'Metodologia', pontos_atencao: 'Pegada falsa e transição controlada nas argolas' },
  { nome: 'Strict Bar Muscle-up (Full)', padrao: 'Calistenia', subpadrao: 'Dinâmicos / Skills', nivel: 4, ordem: 40, tipo: 'Força', equipamentos: ['Barra fixa'], status: 'Metodologia', pontos_atencao: 'Sem balanço, subida limpa e bloqueio no topo' },

  // Calistenia MMII & Core Dinâmico (5 exercícios fechando 45)
  { nome: 'Shrimp Squat / Pistol Assistido (Tuck)', padrao: 'Calistenia', subpadrao: 'Membros Inferiores', nivel: 1, ordem: 41, tipo: 'Força', equipamentos: ['Peso corporal', 'Apoio (parede/banco)'], status: 'Metodologia', pontos_atencao: 'Alinhamento joelho-ponta do pé' },
  { nome: 'Pistol Squat Livre (One-leg)', padrao: 'Calistenia', subpadrao: 'Membros Inferiores', nivel: 2, ordem: 42, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Controle excêntrico até amplitude máxima' },
  { nome: 'Dragon Squat Prep (Straddle)', padrao: 'Calistenia', subpadrao: 'Membros Inferiores', nivel: 3, ordem: 43, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Passagem da perna livre por trás com estabilidade' },
  { nome: 'Dragon Squat Completo (Full)', padrao: 'Calistenia', subpadrao: 'Membros Inferiores', nivel: 4, ordem: 44, tipo: 'Força', equipamentos: ['Peso corporal'], status: 'Metodologia', pontos_atencao: 'Mobilidade de quadril e força unilateral máxima' },
  { nome: 'Toes to Bar Estrito no Espaldar (Full)', padrao: 'Calistenia', subpadrao: 'Core / Estáticos', nivel: 4, ordem: 45, tipo: 'Força', equipamentos: ['Barra vertical/espaldar', 'Barra fixa'], status: 'Metodologia', pontos_atencao: 'Subir pés até a barra sem impulso de costas' },
];

export const EXERCICIOS_MOBILIDADE_23 = [
  // Tornozelo (3)
  { nome: 'Mobilidade de Dorsiflexão no Apoio (Knee-to-Wall)', padrao: 'Mobilidade', subpadrao: 'Tornozelo', nivel: 1, ordem: 1, tipo: 'Mobilidade', equipamentos: ['Apoio (parede/banco)'], status: 'Proposta (revisar)', pontos_atencao: 'Manter calcanhar 100% apoiado no solo' },
  { nome: 'Dorsiflexão com Sobrecarga (KB no Joelho)', padrao: 'Mobilidade', subpadrao: 'Tornozelo', nivel: 2, ordem: 2, tipo: 'Mobilidade', equipamentos: ['KB', 'Caixote'], status: 'Proposta (revisar)', pontos_atencao: 'Avançar o joelho sobre os dedos sem colapsar o arco plantar' },
  { nome: 'Mobilização Articular de Tornozelo com Elástico', padrao: 'Mobilidade', subpadrao: 'Tornozelo', nivel: 2, ordem: 3, tipo: 'Mobilidade', equipamentos: ['Elástico', 'Step'], status: 'Proposta (revisar)', pontos_atencao: 'Elástico tracionando o tálus na linha maleolar' },

  // Joelho (2)
  { nome: 'CARs de Joelho (Rotação Tibial Controlada)', padrao: 'Mobilidade', subpadrao: 'Joelho', nivel: 1, ordem: 4, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Mover apenas a tíbia sem girar o fêmur' },
  { nome: 'Flexão Máxima de Joelho Assistida em Ajoelhado', padrao: 'Mobilidade', subpadrao: 'Joelho', nivel: 2, ordem: 5, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Progressão gradual sem dor articular' },

  // Quadril (5)
  { nome: '90/90 Hip Switch (Rotação Interna e Externa de Quadril)', padrao: 'Mobilidade', subpadrao: 'Quadril', nivel: 1, ordem: 6, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Manter coluna alta durante a transição dos joelhos' },
  { nome: 'CARs de Quadril em Quatro Apoios ou Espaldar', padrao: 'Mobilidade', subpadrao: 'Quadril', nivel: 2, ordem: 7, tipo: 'Mobilidade', equipamentos: ['Colchonete', 'Barra vertical/espaldar'], status: 'Proposta (revisar)', pontos_atencao: 'Evitar compensação na coluna lombar' },
  { nome: 'Alongamento Dinâmico de Flexores de Quadril (Couch Stretch)', padrao: 'Mobilidade', subpadrao: 'Quadril', nivel: 2, ordem: 8, tipo: 'Mobilidade', equipamentos: ['Colchonete', 'Apoio (parede/banco)'], status: 'Proposta (revisar)', pontos_atencao: 'Contrair glúteo em retroversão pélvica' },
  { nome: 'Cossack Squat Assistido para Mobilidade de Adutores', padrao: 'Mobilidade', subpadrao: 'Quadril', nivel: 2, ordem: 9, tipo: 'Mobilidade', equipamentos: ['Peso corporal', 'KB'], status: 'Proposta (revisar)', pontos_atencao: 'Manter calcanhar da perna base firme no chão' },
  { nome: 'Deep Squat Prying com Kettlebell (Cócoras Profunda)', padrao: 'Mobilidade', subpadrao: 'Quadril', nivel: 1, ordem: 10, tipo: 'Mobilidade', equipamentos: ['KB'], status: 'Proposta (revisar)', pontos_atencao: 'Cotovelos abrem os joelhos mantendo peito aberto' },

  // Coluna Torácica (4)
  { nome: 'Open Book em Decúbito Lateral (Rotação Torácica)', padrao: 'Mobilidade', subpadrao: 'Coluna Torácica', nivel: 1, ordem: 11, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Joelho de cima fixo no solo enquanto o braço gira' },
  { nome: 'Rotação Torácica em Quatro Apoios (Thread the Needle)', padrao: 'Mobilidade', subpadrao: 'Coluna Torácica', nivel: 1, ordem: 12, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Respirar fundo no final da amplitude' },
  { nome: 'Extensão Torácica no Banco com Cano de PVC (Butcher Block)', padrao: 'Mobilidade', subpadrao: 'Coluna Torácica', nivel: 2, ordem: 13, tipo: 'Mobilidade', equipamentos: ['Banco', 'Cano de PVC'], status: 'Proposta (revisar)', pontos_atencao: 'Estender a região torácica sem hiperestender a lombar' },
  { nome: 'Cat-Cow Segmentar (Mobilidade Vertebral)', padrao: 'Mobilidade', subpadrao: 'Coluna Torácica', nivel: 1, ordem: 14, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Mover vértebra por vértebra com controle' },

  // Ombro (4)
  { nome: 'Dislocates de Ombro com Cano de PVC ou Elástico', padrao: 'Mobilidade', subpadrao: 'Ombro', nivel: 1, ordem: 15, tipo: 'Mobilidade', equipamentos: ['Cano de PVC', 'Elástico'], status: 'Proposta (revisar)', pontos_atencao: 'Cotovelos estendidos e costelas baixas' },
  { nome: 'Wall Slides (Deslizamento Escapular na Parede)', padrao: 'Mobilidade', subpadrao: 'Ombro', nivel: 1, ordem: 16, tipo: 'Mobilidade', equipamentos: ['Apoio (parede/banco)'], status: 'Proposta (revisar)', pontos_atencao: 'Punhos, cotovelos e lombar próximos à parede' },
  { nome: 'CARs de Ombro em Pé (Rotação Articular Controlada)', padrao: 'Mobilidade', subpadrao: 'Ombro', nivel: 1, ordem: 17, tipo: 'Mobilidade', equipamentos: ['Peso corporal'], status: 'Proposta (revisar)', pontos_atencao: 'Círculo amplo sem girar o tronco' },
  { nome: 'Hang Passivo e Ativo na Barra / Espaldar', padrao: 'Mobilidade', subpadrao: 'Ombro', nivel: 2, ordem: 18, tipo: 'Mobilidade', equipamentos: ['Barra fixa', 'Barra vertical/espaldar'], status: 'Proposta (revisar)', pontos_atencao: 'Descompressão glenoumeral seguida de depressão escapular' },

  // Punho (2)
  { nome: 'Mobilização de Punhos em Quatro Apoios (4 Direções)', padrao: 'Mobilidade', subpadrao: 'Punho', nivel: 1, ordem: 19, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Palmas totalmente apoiadas e cotovelos bloqueados' },
  { nome: 'First Knuckle Push-ups (Fortalecimento e Mobilidade de Punho)', padrao: 'Mobilidade', subpadrao: 'Punho', nivel: 2, ordem: 20, tipo: 'Mobilidade', equipamentos: ['Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Elevar a palma mantendo os dedos no solo' },

  // Cadeia Posterior / Isquiotibiais (2)
  { nome: 'Jefferson Curl Leve para Cadeia Posterior', padrao: 'Mobilidade', subpadrao: 'Cadeia Posterior / Isquiotibiais', nivel: 2, ordem: 21, tipo: 'Mobilidade', equipamentos: ['KB', 'Step'], status: 'Proposta (revisar)', pontos_atencao: 'Flexão segmentar lenta e controlada' },
  { nome: 'Active Straight Leg Raise com Elástico (Isquiotibiais)', padrao: 'Mobilidade', subpadrao: 'Cadeia Posterior / Isquiotibiais', nivel: 1, ordem: 22, tipo: 'Mobilidade', equipamentos: ['Elástico', 'Colchonete'], status: 'Proposta (revisar)', pontos_atencao: 'Joelho estendido e perna oposta firme no chão' },

  // Global / Geral (1 -> total 23)
  { nome: 'World’s Greatest Stretch (Mobilidade Global Dinâmica)', padrao: 'Mobilidade', subpadrao: 'Global / Geral', nivel: 1, ordem: 23, tipo: 'Mobilidade', equipamentos: ['Peso corporal'], status: 'Proposta (revisar)', pontos_atencao: 'Passada longa, cotovelo ao tornozelo e rotação torácica' },
];
