import puppeteer from 'puppeteer';

export interface ProfileReportArea {
  readonly position: number;
  readonly code: string;
  readonly name: string;
  readonly percentage: number;
  readonly description: string;
  readonly justification: string;
}

export interface ProfileReportData {
  readonly areas: readonly ProfileReportArea[];
  readonly primaryAreas: readonly string[];
  readonly perfilHibrido: boolean;
  readonly perfilEmDescoberta: boolean;
  readonly respostasUniformes: boolean;
  readonly justification: string;
}

/**
 * Gera um PDF A4 de uma página a partir de um ranking já calculado. Este
 * serviço não consulta persistência nem recalcula a pontuação do perfil.
 */
export class ProfilePdfService {
  async generate(data: ProfileReportData): Promise<Buffer> {
    validateReportData(data);

    const browser = await puppeteer.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(buildProfileReportHtml(data), {
        waitUntil: 'load',
      });

      return Buffer.from(
        await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
        }),
      );
    } finally {
      await browser.close();
    }
  }
}

export function buildProfileReportHtml(data: ProfileReportData): string {
  const profileMessages = [
    data.perfilHibrido
      ? 'Perfil híbrido: as áreas principais compartilham o maior resultado do questionário.'
      : undefined,
    data.perfilEmDescoberta
      ? 'Perfil em descoberta: todas as áreas apresentam afinidade de até 40%.'
      : undefined,
    data.respostasUniformes
      ? 'Respostas uniformes: o mesmo valor foi informado em todas as perguntas.'
      : undefined,
  ].filter((message): message is string => Boolean(message));

  const areaCards = data.areas
    .map(
      (area) => `
        <article class="area-card">
          <div class="area-header">
            <span class="position">${area.position}º</span>
            <div><strong>${escapeHtml(area.name)}</strong><small>${escapeHtml(area.code)}</small></div>
            <span class="percentage">${area.percentage}%</span>
          </div>
          <p>${escapeHtml(area.description)}</p>
          <p class="justification">${escapeHtml(area.justification)}</p>
        </article>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { color: #172033; font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
      main { padding: 12mm; }
      header { border-bottom: 2px solid #3158d4; margin-bottom: 12px; padding-bottom: 8px; }
      h1 { color: #1c3faa; font-size: 22px; margin: 0 0 3px; }
      h2 { font-size: 13px; margin: 0; }
      .summary { color: #4a5568; line-height: 1.35; margin: 7px 0 0; }
      .messages { display: flex; flex-wrap: wrap; gap: 5px; margin: 9px 0; }
      .message { background: #eef2ff; border-radius: 4px; color: #293a82; padding: 5px 7px; }
      .ranking { display: grid; gap: 6px; grid-template-columns: repeat(2, 1fr); }
      .area-card { border: 1px solid #d8dfef; border-radius: 6px; break-inside: avoid; margin: 0; padding: 7px; }
      .area-header { align-items: center; display: grid; gap: 6px; grid-template-columns: 24px 1fr auto; }
      .position { background: #3158d4; border-radius: 50%; color: white; font-weight: bold; padding: 5px 0; text-align: center; }
      strong { display: block; font-size: 10px; }
      small { color: #667085; }
      .percentage { color: #1c3faa; font-size: 15px; font-weight: bold; }
      p { line-height: 1.28; margin: 5px 0 0; }
      .justification { color: #475467; font-size: 9px; }
      footer { color: #667085; font-size: 8px; margin-top: 9px; text-align: center; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>TechPath</h1>
        <h2>Relatório do perfil de afinidade</h2>
        <p class="summary">${escapeHtml(data.justification)}</p>
      </header>
      ${profileMessages.length > 0 ? `<section class="messages">${profileMessages.map((message) => `<span class="message">${escapeHtml(message)}</span>`).join('')}</section>` : ''}
      <section class="ranking" aria-label="Ranking das áreas de TI">${areaCards}</section>
      <footer>Áreas principais: ${escapeHtml(data.primaryAreas.join(', '))}</footer>
    </main>
  </body>
</html>`;
}

function validateReportData(data: ProfileReportData): void {
  if (data.areas.length !== 6) {
    throw new RangeError('O relatório deve conter exatamente seis áreas.');
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };

    return entities[character];
  });
}
