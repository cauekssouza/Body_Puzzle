import { TEXTOS_LAUDO, REF, calcularAssimetria, arred } from './cartaTrunfo';

function formatarDataBR(dataStr) {
  if (!dataStr) return '-';
  return new Date(`${dataStr}T00:00:00`).toLocaleDateString('pt-BR');
}

function somarMesesStr(dataStr, meses) {
  if (!dataStr) return '-';
  const d = new Date(`${dataStr}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString('pt-BR');
}

function slugify(texto) {
  return (texto || 'aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function setaEvolucao(atual, anterior) {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined) return '-';
  const nAt = Number(atual);
  const nAnt = Number(anterior);
  if (Number.isNaN(nAt) || Number.isNaN(nAnt)) return '-';
  const diff = arred(nAt - nAnt, 2);
  if (diff > 0) return `<span style="color:#16a34a;font-weight:bold;">↑ +${diff}</span>`;
  if (diff < 0) return `<span style="color:#EB002E;font-weight:bold;">↓ ${diff}</span>`;
  return '<span style="color:#64748b;">= 0</span>';
}

export function abrirLaudoPDF({ aluno, avaliacao, avaliacaoAnterior, carta, secoesVisiveis }) {
  const sexo = avaliacao.sexo || 'M';
  const R = REF[sexo] || REF.M;
  const temAnterior = Boolean(avaliacaoAnterior);

  const f = avaliacao.forca || {};
  const p = avaliacao.potencia || {};
  const m = avaliacao.mobilidade || {};
  const r = avaliacao.resistencia || {};
  const ant = avaliacao.antropometria || {};
  const mov = avaliacao.movimento || {};
  const tNotas = carta?.testes || {};

  const fAnt = avaliacaoAnterior?.forca || {};
  const pAnt = avaliacaoAnterior?.potencia || {};
  const mAnt = avaliacaoAnterior?.mobilidade || {};
  const rAnt = avaliacaoAnterior?.resistencia || {};
  const antAnt = avaliacaoAnterior?.antropometria || {};

  // Monta as linhas de cada valência (apenas testes preenchidos)
  const blocosValencias = [];

  // 1. FORÇA
  if (secoesVisiveis.forca) {
    const linhasForca = [
      { nome: 'Sentar e levantar (30s)', res: f.sentar_levantar, un: 'reps', ref: R.forcaN1.sentar_levantar, nota: tNotas.sentar_levantar, ant: fAnt.sentar_levantar },
      { nome: 'Hang hold (tempo pendurado)', res: f.hang_hold, un: 's', ref: R.forcaN1.hang_hold, nota: tNotas.hang_hold, ant: fAnt.hang_hold },
      { nome: 'Knee push-up (30s)', res: f.knee_pushup, un: 'reps', ref: R.forcaN1.knee_pushup, nota: tNotas.knee_pushup, ant: fAnt.knee_pushup },
      { nome: 'Canoa (tempo máximo)', res: f.canoa, un: 's', ref: R.forcaN1.canoa, nota: tNotas.canoa, ant: fAnt.canoa },
      { nome: 'Ponte glútea isométrica', res: f.ponte_glutea, un: 's', ref: R.forcaN1.ponte_glutea, nota: tNotas.ponte_glutea, ant: fAnt.ponte_glutea },
      { nome: 'Push-up máximo', res: f.pushup, un: 'reps', ref: R.forcaN23.pushup, nota: tNotas.pushup, ant: fAnt.pushup },
      { nome: 'Prancha (tempo máximo)', res: f.prancha, un: 's', ref: R.forcaN23.prancha, nota: tNotas.prancha, ant: fAnt.prancha },
      { nome: 'Chin-up / barra fixa', res: f.chinup, un: 'reps', ref: R.forcaN23.chinup, nota: tNotas.chinup, ant: fAnt.chinup },
      { nome: 'Agachamento (Squat) — Força Relativa', res: f.squat_rel, un: 'x PC', ref: R.forcaRM.squat, nota: tNotas.rm_squat, ant: fAnt.squat_rel },
      { nome: 'Levantamento Terra (Deadlift) — Força Relativa', res: f.deadlift_rel, un: 'x PC', ref: R.forcaRM.deadlift, nota: tNotas.rm_deadlift, ant: fAnt.deadlift_rel },
      { nome: 'Supino — Força Relativa', res: f.supino_rel, un: 'x PC', ref: R.forcaRM.supino, nota: tNotas.rm_supino, ant: fAnt.supino_rel },
    ].filter((item) => item.res !== null && item.res !== undefined && item.res !== '');

    if (linhasForca.length > 0) {
      blocosValencias.push({
        titulo: 'Força',
        notaAtributo: carta?.atributos?.forca ?? '-',
        texto: TEXTOS_LAUDO.forca,
        linhas: linhasForca,
      });
    }
  }

  // 2. POTÊNCIA
  if (secoesVisiveis.potencia) {
    const assimHop = calcularAssimetria(p.hop_d, p.hop_e);
    const alertaHop = assimHop !== null && assimHop > 0.15;

    const assimTriple = calcularAssimetria(p.triple_hop_d, p.triple_hop_e);
    const alertaTriple = assimTriple !== null && assimTriple > 0.15;

    const assimDjUni = calcularAssimetria(p.dj_d, p.dj_e);
    const alertaDjUni = assimDjUni !== null && assimDjUni > 0.15;

    const linhasPotencia = [
      { nome: 'Salto vertical (CMJ - maior)', res: p.cmj_maior, un: 'cm', ref: R.potencia.cmj, nota: tNotas.cmj, ant: pAnt.cmj_maior },
      { nome: 'Squat Jump (SJ - maior)', res: p.sj_maior, un: 'cm', ref: R.potencia.sj, nota: tNotas.sj, ant: pAnt.sj_maior },
      { nome: 'Relação SJ / CMJ', res: p.sj_cmj_rel, un: '%', ref: '5–15%', nota: '-', ant: pAnt.sj_cmj_rel },
      { nome: 'RSI Bilateral (Drop Jump)', res: p.rsi_bi, un: 'm/s', ref: '2,0–2,5', nota: '-', ant: pAnt.rsi_bi },
      { nome: 'RSI Unilateral — Direito', res: p.rsi_d, un: 'm/s', ref: '1,6–2,0', nota: '-', ant: pAnt.rsi_d, alerta: alertaDjUni },
      { nome: 'RSI Unilateral — Esquerdo', res: p.rsi_e, un: 'm/s', ref: '1,6–2,0', nota: '-', ant: pAnt.rsi_e, alerta: alertaDjUni },
      { nome: 'Salto horizontal bilateral', res: p.salto_horizontal, un: 'cm', ref: R.potencia.salto_horizontal, nota: tNotas.salto_horizontal, ant: pAnt.salto_horizontal },
      { nome: 'Salto em uma perna (Hop) — Direito', res: p.hop_d, un: 'cm', ref: R.potencia.hop, nota: tNotas.hop_d, ant: pAnt.hop_d, alerta: alertaHop },
      { nome: 'Salto em uma perna (Hop) — Esquerdo', res: p.hop_e, un: 'cm', ref: R.potencia.hop, nota: tNotas.hop_e, ant: pAnt.hop_e, alerta: alertaHop },
      { nome: 'Triple Hop — Direito', res: p.triple_hop_d, un: 'cm', ref: R.potencia.triple_hop, nota: tNotas.triple_hop_d, ant: pAnt.triple_hop_d, alerta: alertaTriple },
      { nome: 'Triple Hop — Esquerdo', res: p.triple_hop_e, un: 'cm', ref: R.potencia.triple_hop, nota: tNotas.triple_hop_e, ant: pAnt.triple_hop_e, alerta: alertaTriple },
      { nome: 'Arremesso de Medball (3 kg)', res: p.medball, un: 'cm', ref: R.potencia.medball, nota: tNotas.medball, ant: pAnt.medball },
    ].filter((item) => item.res !== null && item.res !== undefined && item.res !== '');

    if (linhasPotencia.length > 0) {
      blocosValencias.push({
        titulo: 'Potência',
        notaAtributo: carta?.atributos?.potencia ?? '-',
        texto: TEXTOS_LAUDO.potencia,
        linhas: linhasPotencia,
      });
    }
  }

  // 3. MOBILIDADE
  if (secoesVisiveis.mobilidade) {
    const paresMob = [
      { base: 'ri_ombro', label: 'Rotação Interna de Ombro', ref: '60–70°' },
      { base: 're_ombro', label: 'Rotação Externa de Ombro', ref: '85–90°' },
      { base: 'ri_quadril', label: 'Rotação Interna de Quadril', ref: '30–40°' },
      { base: 're_quadril', label: 'Rotação Externa de Quadril', ref: '35–45°' },
      { base: 'isquios', label: 'Flexibilidade de Isquiotibiais', ref: '> 75°' },
      { base: 'dorsi', label: 'Dorsiflexão de Tornozelo', ref: '36–45°' },
    ];

    const linhasMob = [];
    paresMob.forEach((pm) => {
      const valD = m[`${pm.base}_d`];
      const valE = m[`${pm.base}_e`];
      const assim = calcularAssimetria(valD, valE);
      const alerta = assim !== null && assim > 0.15;
      const notaPar = tNotas[`mob_${pm.base}`];

      if (valD !== null && valD !== undefined && valD !== '') {
        linhasMob.push({
          nome: `${pm.label} — Direito`,
          res: valD,
          un: '°',
          ref: pm.ref,
          nota: notaPar ?? '-',
          ant: mAnt[`${pm.base}_d`],
          alerta,
        });
      }
      if (valE !== null && valE !== undefined && valE !== '') {
        linhasMob.push({
          nome: `${pm.label} — Esquerdo`,
          res: valE,
          un: '°',
          ref: pm.ref,
          nota: notaPar ?? '-',
          ant: mAnt[`${pm.base}_e`],
          alerta,
        });
      }
    });

    if (linhasMob.length > 0) {
      blocosValencias.push({
        titulo: 'Mobilidade',
        notaAtributo: carta?.atributos?.mobilidade ?? '-',
        texto: TEXTOS_LAUDO.mobilidade,
        linhas: linhasMob,
      });
    }
  }

  // 4. RESISTÊNCIA
  if (secoesVisiveis.resistencia) {
    const linhasRes = [
      { nome: 'Caminhada de 6 minutos (TC6)', res: r.tc6_distancia, un: 'm', ref: r.tc6_previsto ? `${r.tc6_previsto} m` : '-', nota: tNotas.resistencia ?? '-', ant: rAnt.tc6_distancia },
      { nome: 'Corrida de 12 minutos (Cooper)', res: r.cooper_distancia, un: 'm', ref: '-', nota: tNotas.resistencia ?? '-', ant: rAnt.cooper_distancia },
      { nome: 'VO₂ Estimado (Cooper)', res: r.vo2, un: 'mL/kg/min', ref: '-', nota: '-', ant: rAnt.vo2 },
      { nome: 'Corrida / 3 km — Pace', res: r.pace, un: 'min/km', ref: '-', nota: '-', ant: rAnt.pace },
    ].filter((item) => item.res !== null && item.res !== undefined && item.res !== '');

    if (linhasRes.length > 0) {
      blocosValencias.push({
        titulo: 'Resistência',
        notaAtributo: carta?.atributos?.resistencia ?? '-',
        texto: TEXTOS_LAUDO.resistencia,
        linhas: linhasRes,
      });
    }
  }

  // 5. COMPOSIÇÃO CORPORAL (FITNESS)
  if (secoesVisiveis.fitness) {
    const linhasComp = [
      { nome: 'Massa Corporal', res: avaliacao.massa, un: 'kg', ref: '-', nota: '-', ant: avaliacaoAnterior?.massa },
      { nome: 'Estatura', res: avaliacao.estatura, un: 'm', ref: '-', nota: '-', ant: avaliacaoAnterior?.estatura },
      { nome: 'IMC', res: ant.imc, un: 'kg/m²', ref: '18,5–24,9', nota: '-', ant: antAnt.imc },
      { nome: 'Percentual de Gordura (%G)', res: avaliacao.perc_gordura, un: '%', ref: `${R.gordura}% (ref.)`, nota: tNotas.gordura ?? '-', ant: avaliacaoAnterior?.perc_gordura },
      { nome: 'Massa Gorda', res: ant.massa_gorda, un: 'kg', ref: '-', nota: '-', ant: antAnt.massa_gorda },
      { nome: 'Massa Magra', res: ant.massa_magra, un: 'kg', ref: '-', nota: '-', ant: antAnt.massa_magra },
      { nome: 'Relação Cintura / Quadril (RCQ)', res: ant.rcq, un: '', ref: sexo === 'M' ? '< 0,90' : '< 0,85', nota: '-', ant: antAnt.rcq },
    ].filter((item) => item.res !== null && item.res !== undefined && item.res !== '');

    if (linhasComp.length > 0) {
      blocosValencias.push({
        titulo: 'Composição Corporal (Fitness)',
        notaAtributo: carta?.atributos?.fitness ?? '-',
        texto: TEXTOS_LAUDO.fitness,
        linhas: linhasComp,
      });
    }
  }

  // 6. MOVIMENTO (CHECKLIST)
  let htmlMovimento = '';
  if (secoesVisiveis.movimento) {
    const padroesMov = [
      {
        key: 'squat',
        titulo: 'Squat (Agachamento)',
        itens: ['Calcanhares no chão', 'Joelho acompanha a linha do pé', 'Sem valgo dinâmico evidente', 'Tronco estável', 'Passa de 90° sem retroversão'],
      },
      {
        key: 'hip_hinge',
        titulo: 'Hip Hinge (Dobradiça de Quadril)',
        itens: ['3 pontos de contato', 'Movimento inicia no quadril', 'Coluna neutra durante o movimento', 'Joelho estável'],
      },
      {
        key: 'overhead_squat',
        titulo: 'Overhead Squat',
        itens: ['Braços alinhados com o tronco', 'Tronco ereto', 'Pelve neutra', 'Joelhos estáveis', 'Movimento fluido e controlado'],
      },
    ];

    const linhasMov = [];
    padroesMov.forEach((pm) => {
      const respostas = mov[pm.key] || {};
      pm.itens.forEach((itemTexto, idx) => {
        if (respostas[idx]) {
          linhasMov.push({
            padrao: pm.titulo,
            criterio: itemTexto,
            status: respostas[idx],
          });
        }
      });
    });

    if (linhasMov.length > 0) {
      htmlMovimento = `
        <div class="bloco-valencia">
          <div class="valencia-header">
            <h3>Avaliação de Movimento</h3>
          </div>
          <p class="valencia-desc">${TEXTOS_LAUDO.movimento}</p>
          <table>
            <thead>
              <tr>
                <th>Padrão</th>
                <th>Critério Observado</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${linhasMov
                .map(
                  (l) => `
                <tr>
                  <td><strong>${l.padrao}</strong></td>
                  <td>${l.criterio}</td>
                  <td style="font-weight:bold;color:${l.status === 'Sim' ? '#16a34a' : '#E17900'};">${l.status}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  const nomeArquivo = `avaliacao-${slugify(aluno.nome)}-${avaliacao.data_avaliacao}`;

  const htmlCompleto = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${nomeArquivo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 16mm;
        }
        body {
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          line-height: 1.45;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .capa {
          border-bottom: 4px solid #4460B8;
          padding-bottom: 18px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .capa-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .capa-brand img {
          height: 48px;
        }
        .capa-brand h1 {
          margin: 0;
          color: #4460B8;
          font-size: 26px;
          letter-spacing: 0.5px;
        }
        .capa-dados {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 6px solid #2DAFAB;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 14px;
        }
        .como-ler {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 22px;
          font-size: 13.5px;
        }
        .como-ler h4 {
          margin: 0 0 6px 0;
          color: #4460B8;
          font-size: 15px;
        }
        .carta-wrapper {
          display: flex;
          justify-content: center;
          margin: 20px 0 28px 0;
          page-break-inside: avoid;
        }
        .carta-box {
          position: relative;
          width: 320px;
          height: 533px;
          background-image: url("${window.location.origin}/molde-carta.jpg");
          background-size: cover;
          background-position: center;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .carta-overall {
          position: absolute;
          top: 12%;
          right: 6.5%;
          width: 60px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 32px;
          font-weight: 900;
          color: #4460B8;
        }
        .carta-nome {
          position: absolute;
          top: 44%;
          width: 100%;
          height: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .carta-linha {
          position: absolute;
          left: 9%;
          width: 82%;
          height: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .carta-attr-nome {
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          margin-left: 8px;
        }
        .carta-attr-nota {
          color: #4460B8;
          font-size: 18px;
          font-weight: 900;
          width: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .bloco-valencia {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        .valencia-header {
          background: #4460B8;
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .valencia-header h3 {
          margin: 0;
          font-size: 16px;
          text-transform: uppercase;
        }
        .valencia-desc {
          font-size: 13px;
          color: #334155;
          margin: 8px 0 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        th {
          background: #f1f5f9;
          color: #0f172a;
          text-align: left;
          padding: 7px 10px;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 6px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .comentarios {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 5px solid #E17900;
          padding: 12px 16px;
          border-radius: 6px;
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .rodape {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 2px solid #2DAFAB;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <!-- 1. CAPA -->
      <div class="capa">
        <div class="capa-brand">
          <img src="${window.location.origin}/Icone.png" alt="Body Puzzle" />
          <div>
            <h1>Body Puzzle</h1>
            <span style="font-size:13px;color:#2DAFAB;font-weight:bold;">LAUDO DE AVALIAÇÃO FÍSICA</span>
          </div>
        </div>
        <div style="text-align:right;font-size:13px;color:#475569;">
          <div><strong>Data:</strong> ${formatarDataBR(avaliacao.data_avaliacao)}</div>
          <div><strong>Avaliador:</strong> ${avaliacao.avaliador || 'Equipe Body Puzzle'}</div>
        </div>
      </div>

      <div class="capa-dados">
        <div><strong>Aluno(a):</strong> ${aluno.nome}</div>
        <div><strong>Idade na avaliação:</strong> ${avaliacao.idade !== null && avaliacao.idade !== undefined ? `${avaliacao.idade} anos` : '-'}</div>
        <div><strong>Sexo:</strong> ${sexo === 'M' ? 'Masculino' : 'Feminino'}</div>
        <div><strong>Objetivos:</strong> ${(avaliacao.objetivos || []).join(', ') || '-'}</div>
      </div>

      <!-- 2. COMO LER ESTA AVALIAÇÃO -->
      <div class="como-ler">
        <h4>Como ler esta avaliação</h4>
        <p style="margin:0;">${TEXTOS_LAUDO.como_ler}</p>
      </div>

      <!-- 3. CARTA TRUNFO -->
      <div class="carta-wrapper">
        <div class="carta-box">
          <div class="carta-overall">${carta?.overall ?? '-'}</div>
          <div class="carta-nome">${aluno.nome}</div>

          <div class="carta-linha" style="top:53.2%;">
            <span class="carta-attr-nome">FORÇA</span>
            <span class="carta-attr-nota">${carta?.atributos?.forca ?? '-'}</span>
          </div>
          <div class="carta-linha" style="top:60.45%;">
            <span class="carta-attr-nome">MOBILIDADE</span>
            <span class="carta-attr-nota">${carta?.atributos?.mobilidade ?? '-'}</span>
          </div>
          <div class="carta-linha" style="top:67.7%;">
            <span class="carta-attr-nome">POTÊNCIA</span>
            <span class="carta-attr-nota">${carta?.atributos?.potencia ?? '-'}</span>
          </div>
          <div class="carta-linha" style="top:74.95%;">
            <span class="carta-attr-nome">FITNESS</span>
            <span class="carta-attr-nota">${carta?.atributos?.fitness ?? '-'}</span>
          </div>
          <div class="carta-linha" style="top:82.2%;">
            <span class="carta-attr-nome">RESISTÊNCIA</span>
            <span class="carta-attr-nota">${carta?.atributos?.resistencia ?? '-'}</span>
          </div>
        </div>
      </div>

      <!-- 4. BLOCOS POR VALÊNCIA -->
      ${blocosValencias
        .map(
          (bloco) => `
        <div class="bloco-valencia">
          <div class="valencia-header">
            <h3>${bloco.titulo}</h3>
            <span>Nota do Atributo: <strong>${bloco.notaAtributo}</strong></span>
          </div>
          <p class="valencia-desc">${bloco.texto}</p>
          <table>
            <thead>
              <tr>
                <th>Teste</th>
                <th>Resultado</th>
                <th>Referência</th>
                <th>Nota</th>
                ${temAnterior ? '<th>Evolução</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${bloco.linhas
                .map(
                  (l) => `
                <tr style="${l.alerta ? 'color:#EB002E;font-weight:bold;background:#fef2f2;' : ''}">
                  <td>${l.nome} ${l.alerta ? '(Assimetria > 15%)' : ''}</td>
                  <td>${l.res} ${l.un}</td>
                  <td>${l.ref}</td>
                  <td><strong>${l.nota ?? '-'}</strong></td>
                  ${temAnterior ? `<td>${setaEvolucao(l.res, l.ant)}</td>` : ''}
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        )
        .join('')}

      ${htmlMovimento}

      <!-- 5. COMENTÁRIOS DO PROFESSOR -->
      ${
        avaliacao.comentarios
          ? `
        <div class="comentarios">
          <strong style="color:#9a3412;">Comentários do Professor:</strong>
          <p style="margin:6px 0 0 0;font-size:13.5px;">${avaliacao.comentarios}</p>
        </div>
      `
          : ''
      }

      <!-- 6. RODAPÉ -->
      <div class="rodape">
        <span>Body Puzzle — Treinamento Individualizado</span>
        <span><strong>Data sugerida da próxima avaliação (+3 meses):</strong> ${somarMesesStr(avaliacao.data_avaliacao, 3)}</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  const janela = window.open('', '_blank', 'width=900,height=1100');
  if (!janela) {
    window.alert('Por favor, permita pop-ups no navegador para gerar o PDF da avaliação.');
    return;
  }
  janela.document.open();
  janela.document.write(htmlCompleto);
  janela.document.close();
}