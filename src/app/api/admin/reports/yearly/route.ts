import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  VerticalAlign,
  Header,
  HeightRule
} from 'docx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    const paramYear = searchParams.get('year');
    let year = (paramYear && !isNaN(parseInt(paramYear))) 
      ? parseInt(paramYear) 
      : now.getFullYear();

    // Validação de segurança
    if (year < 2000 || year > 2100) year = now.getFullYear();

    console.log(`[REPORT] Iniciando geração de relatório anual para ${year}`);

    const keys = await prisma.authorizationKey.findMany({
      where: {
        year: year
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`[REPORT] Encontradas ${keys.length} chaves no ano para processamento`);

    // Agrupamento por mês
    const statsByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthKeys = keys.filter(k => k.month === i + 1);
      return {
        month: i + 1,
        total: monthKeys.length,
        tc: monthKeys.filter(k => k.type === 'TC').length,
        rnm: monthKeys.filter(k => k.type === 'RNM').length
      };
    });

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "SISTEMA CIRILA - GESTÃO DE REGULAÇÃO", bold: true, size: 26, color: "003366", font: "Arial" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `RELATÓRIO ANUAL DE AUTORIZAÇÕES`, bold: true, size: 22, color: "666666", font: "Arial" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `EXERCÍCIO ${year}`, bold: true, size: 18, color: "333333", font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ spacing: { before: 600, after: 200 } }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ 
                    shading: { fill: "003366" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RESUMO CONSOLIDADO ANUAL", bold: true, color: "FFFFFF", font: "Arial" })] })] 
                  }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [
                      new Paragraph({
                        spacing: { before: 100, after: 100 },
                        children: [
                          new TextRun({ text: `Total de Autorizações no Ano: ${keys.length}`, bold: true, size: 20, font: "Arial" }),
                        ]
                      }),
                    ]
                  }),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 400, after: 200 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                height: { value: 400, rule: HeightRule.ATLEAST },
                children: [
                  new TableCell({ shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MÊS", bold: true, font: "Arial", size: 18 })] })] }),
                  new TableCell({ shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL", bold: true, font: "Arial", size: 18 })] })] }),
                  new TableCell({ shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOMOGRAFIA (TC)", bold: true, font: "Arial", size: 18 })] })] }),
                  new TableCell({ shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RESSONÂNCIA (RNM)", bold: true, font: "Arial", size: 18 })] })] }),
                ]
              }),
              ...statsByMonth.map(stat => new TableRow({
                children: [
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: monthNames[stat.month-1], font: "Arial", size: 16 })] })] }),
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: stat.total.toString(), bold: true, font: "Arial", size: 16 })] })] }),
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: stat.tc.toString(), font: "Arial", size: 16 })] })] }),
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: stat.rnm.toString(), font: "Arial", size: 16 })] })] }),
                ]
              }))
            ]
          }),

          new Paragraph({ spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "_______________________________________________", color: "999999" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "COORDENAÇÃO DE REGULAÇÃO - CIR-A", bold: true, size: 18, font: "Arial" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, size: 14, color: "666666", font: "Arial" }),
            ]
          }),
        ],
      }],
    });

    console.log('[REPORT] Doc anual criado, convertendo para buffer...');
    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    console.log(`[REPORT] Sucesso! Buffer anual gerado: ${uint8Array.length} bytes`);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=relatorio_anual_${year}.docx`,
        'Content-Length': uint8Array.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[YEARLY_REPORT_ERROR_FULL]', error);
    return NextResponse.json({ 
      error: 'Erro ao gerar relatório anual',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
