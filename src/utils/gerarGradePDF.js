import {
  formatarDataBR,
  ordenarTreinosDoMesociclo,
  construirGradeMesocicloPorTreino,
  gerarFaixaSemanasMesociclo,
} from './prescricaoUtils';

export function abrirGradeMesocicloPDF({
  aluno,
  mesociclo,
  treinosDoMesociclo = [],
  sessoesDoMesociclo = [],
  todosExercicios = [],
}) {
  if (!mesociclo) return;

  const faixa = gerarFaixaSemanasMesociclo(mesociclo, sessoesDoMesociclo);
  const treinosOrdenados = ordenarTreinosDoMesociclo(treinosDoMesociclo);

  const blocosHtml = treinosOrdenados
    .map((treino) => {
      const grade = construirGradeMesocicloPorTreino({
        treino,
        mesociclo,
        sessoesDoTreino: sessoesDoMesociclo,
        todosExercicios,
      });

      const colsSemanas = [];
      for (let s = 1; s <= grade.numColunasSemanas; s++) {
        const infoSem = faixa.semanas.find((item) => item.numero === s);
        colsSemanas.push({
          numero: s,
          intervalo: infoSem?.intervaloCurto || '',
          isAtual: s === grade.semanaAtual,
        });
      }

      const linhasHtml = grade.linhasExercicios
        .map((linha) => {
          const tds = colsSemanas
            .map((col) => {
              const cel = linha.celulasPorSemana[col.numero];
              if (!cel || cel.vazia) {
                return `<td style="background:${
                  cel?.isFutura ? '#f8fafc' : '#ffffff'
                };color:#94a3b8;text-align:center;">${cel?.isFutura ? '' : '—'}</td>`;
              }
              const setaHtml = cel.comparacao
                ? ` <span style="font-size:10px;color:${cel.comparacao.cor};font-weight:bold;">${cel.comparacao.seta}</span>`
                : '';
              const seloHtml = cel.seloRepeticaoSemana
                ? ` <span style="font-size:9.5px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:99px;font-weight:bold;">${cel.seloRepeticaoSemana}</span>`
                : '';
              return `<td style="text-align:center;font-weight:600;color:#0f172a;background:${
                col.isAtual ? '#eff6ff' : '#ffffff'
              };">${cel.texto}${setaHtml}${seloHtml}</td>`;
            })
            .join('');

          return `
            <tr>
              <td style="font-weight:700;color:#0f172a;">
                ${linha.nome}
                <div style="font-size:10.5px;color:#64748b;font-weight:normal;">Prescrito: ${linha.prescrito}</div>
              </td>
              ${tds}
            </tr>
          `;
        })
        .join('');

      return `
        <div class="treino-card">
          <div class="treino-header">
            <h3>${treino.titulo || 'Treino'}</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th style="min-width:170px;text-align:left;">Exercício</th>
                ${colsSemanas
                  .map(
                    (c) => `
                  <th style="text-align:center;background:${c.isAtual ? '#dbeafe' : '#f1f5f9'};">
                    S${c.numero}
                    <div style="font-size:9.5px;font-weight:normal;color:#475569;">${c.intervalo}</div>
                  </th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${
                linhasHtml ||
                `<tr><td colspan="${colsSemanas.length + 1}" style="text-align:center;color:#64748b;">Sem exercícios</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Grade do Mesociclo — ${aluno?.nome || 'Aluno'} — ${mesociclo.nome}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body {
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 16px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #4460B8;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          color: #4460B8;
        }
        .meta {
          font-size: 12.5px;
          color: #334155;
          margin-top: 4px;
        }
        .treino-card {
          margin-bottom: 22px;
          page-break-inside: avoid;
        }
        .treino-header h3 {
          margin: 0 0 8px 0;
          font-size: 15px;
          color: #ffffff;
          background: #4460B8;
          padding: 7px 12px;
          border-radius: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
        }
        th {
          background: #f1f5f9;
          color: #1e293b;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:14px;display:flex;justify-content:flex-end;gap:10px;">
        <button onclick="window.print()" style="background:#4460B8;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;">
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>
      <div class="header">
        <div>
          <h1>🧩 Body Puzzle — Evolução do Mesociclo</h1>
          <div class="meta">
            <strong>Aluno:</strong> ${aluno?.nome || '-'} &nbsp;|&nbsp;
            <strong>Mesociclo:</strong> ${mesociclo.nome} &nbsp;|&nbsp;
            <strong>Início:</strong> ${formatarDataBR(mesociclo.data_inicio)} &nbsp;|&nbsp;
            <strong>Duração:</strong> ${mesociclo.semanas || '-'} semanas
            ${mesociclo.objetivo ? ` &nbsp;|&nbsp; <strong>Objetivo:</strong> ${mesociclo.objetivo}` : ''}
          </div>
        </div>
        <div style="font-size:11.5px;color:#64748b;text-align:right;">
          Emitido em ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
      ${blocosHtml}
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
