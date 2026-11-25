import { beforeEach, describe, expect, it, vi } from 'vitest';

const puppeteerMock = vi.hoisted(() => ({
  pagePdf: vi.fn(),
  pageSetContent: vi.fn(),
  browserClose: vi.fn(),
  browserNewPage: vi.fn(),
  launch: vi.fn(),
}));

vi.mock('puppeteer', () => ({
  default: { launch: puppeteerMock.launch },
}));

import {
  buildProfileReportHtml,
  ProfilePdfService,
  type ProfileReportData,
} from './profile-pdf.service.js';

const reportData: ProfileReportData = {
  areas: [
    ['QA', 'Qualidade de Software (QA)'],
    ['DEV', 'Desenvolvimento de Software'],
    ['UX', 'UX/UI Design'],
    ['PRD', 'Gestão de Produto'],
    ['DAD', 'Análise de Dados'],
    ['DSO', 'DevSecOps'],
  ].map(([code, name], index) => ({
    position: index + 1,
    code,
    name,
    percentage: 100 - index * 10,
    description: `Descrição oficial de ${name}.`,
    justification: `Justificativa determinística de ${name}.`,
  })),
  primaryAreas: ['QA'],
  perfilHibrido: false,
  perfilEmDescoberta: false,
  respostasUniformes: false,
  justification: 'Ranking calculado pelo motor de scoring.',
};

describe('ProfilePdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    puppeteerMock.pagePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    puppeteerMock.pageSetContent.mockResolvedValue(undefined);
    puppeteerMock.browserClose.mockResolvedValue(undefined);
    puppeteerMock.browserNewPage.mockResolvedValue({
      pdf: puppeteerMock.pagePdf,
      setContent: puppeteerMock.pageSetContent,
    });
    puppeteerMock.launch.mockResolvedValue({
      close: puppeteerMock.browserClose,
      newPage: puppeteerMock.browserNewPage,
    });
  });

  it('renders all six areas with their result data', () => {
    const html = buildProfileReportHtml(reportData);

    expect(html).toContain('Ranking das áreas de TI');
    expect(html).toContain('Qualidade de Software (QA)');
    expect(html).toContain('100%');
    expect(html).toContain('Justificativa determinística de Qualidade de Software (QA).');
    expect(html.match(/class="area-card"/g)).toHaveLength(6);
  });

  it('includes the applicable profile messages', () => {
    const html = buildProfileReportHtml({
      ...reportData,
      perfilHibrido: true,
      perfilEmDescoberta: true,
      respostasUniformes: true,
    });

    expect(html).toContain('Perfil híbrido');
    expect(html).toContain('Perfil em descoberta');
    expect(html).toContain('Respostas uniformes');
  });

  it('generates a PDF from the provided contract without recalculating scoring', async () => {
    const result = await new ProfilePdfService().generate(reportData);

    expect(result).toEqual(Buffer.from([1, 2, 3]));
    expect(puppeteerMock.pageSetContent).toHaveBeenCalledWith(expect.any(String), {
      waitUntil: 'load',
    });
    expect(puppeteerMock.pagePdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    );
    expect(puppeteerMock.browserClose).toHaveBeenCalledOnce();
  });

  it('requires all six areas in the report contract', async () => {
    await expect(
      new ProfilePdfService().generate({
        ...reportData,
        areas: reportData.areas.slice(1),
      }),
    ).rejects.toThrow('O relatório deve conter exatamente seis áreas.');
  });
});
