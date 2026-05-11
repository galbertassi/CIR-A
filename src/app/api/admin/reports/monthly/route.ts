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

    const paramMonth = searchParams.get('month');
    const paramYear = searchParams.get('year');
    
    let month = (paramMonth && !isNaN(parseInt(paramMonth))) 
      ? parseInt(paramMonth) 
      : now.getMonth() + 1;
      
    let year = (paramYear && !isNaN(parseInt(paramYear))) 
      ? parseInt(paramYear) 
      : now.getFullYear();

    // Validação de segurança para o array monthNames
    if (month < 1 || month > 12) month = now.getMonth() + 1;
    if (year < 2000 || year > 2100) year = now.getFullYear();

    console.log(`[REPORT] Iniciando geração de relatório mensal para ${month}/${year}`);

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const keys = await prisma.authorizationKey.findMany({
      where: {
        month: month,
        year: year
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`[REPORT] Encontradas ${keys.length} chaves para processamento`);

    const totalTC = keys.filter(k => k.type === 'TC').length;
    const totalRNM = keys.filter(k => k.type === 'RNM').length;

    // Doc creation
    const doc = new Document({
      title: `Relatório Mensal ${month}/${year}`,
      creator: "CIRILA Bot",
      description: `Relatório Mensal de Autorizações - ${monthNames[month-1]}/${year}`,
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
                  new TextRun({
                    text: "SISTEMA CIRILA - GESTÃO DE REGULAÇÃO",
                    bold: true,
                    size: 26,
                    color: "003366",
                    font: { name: "Arial" }
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `RELATÓRIO MENSAL DE AUTORIZAÇÕES`,
                    bold: true,
                    size: 22,
                    color: "666666",
                    font: { name: "Arial" }
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${monthNames[month-1].toUpperCase()} / ${year}`,
                    bold: true,
                    size: 18,
                    color: "333333",
                    font: { name: "Arial" }
                  }),
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
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RESUMO CONSOLIDADO", bold: true, color: "FFFFFF", font: { name: "Arial" } })] })] 
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
                          new TextRun({ text: `Total de Autorizações: ${keys.length}`, bold: true, size: 20, font: { name: "Arial" } }),
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `• Tomografias (TC): ${totalTC}`, size: 18, font: { name: "Arial" } }),
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `• Ressonâncias (RNM): ${totalRNM}`, size: 18, font: { name: "Arial" } }),
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
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DATA", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CHAVE", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                  new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PACIENTE", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                  new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TIPO", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                  new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CNS", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                  new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: "F2F2F2" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DESTINO", bold: true, font: { name: "Arial" }, size: 18 })] })] }),
                ]
              }),
              ...keys.map(key => {
                const safePatient = String(key.patient || '').toUpperCase();
                const safeDate = key.date ? new Date(key.date).toLocaleDateString('pt-BR') : 'N/A';
                const safeKey = String(key.key || '');
                const safeDestination = String(key.destination || '');
                const safeCNS = String((key as any).cns || '-');
                
                return new TableRow({
                  children: [
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: safeDate, font: { name: "Arial" }, size: 16 })] })] }),
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: safeKey, bold: true, font: { name: "Arial" }, size: 16 })] })] }),
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: safePatient, font: { name: "Arial" }, size: 16 })] })] }),
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: key.type, font: { name: "Arial" }, size: 16 })] })] }),
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: safeCNS, font: { name: "Arial" }, size: 16 })] })] }),
                    new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: safeDestination, font: { name: "Arial" }, size: 16 })] })] }),
                  ]
                });
              })
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
              new TextRun({ text: "COORDENAÇÃO DE REGULAÇÃO - CIR-A", bold: true, size: 18, font: { name: "Arial" } }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, size: 14, color: "666666", font: { name: "Arial" } }),
            ]
          }),
        ],
      }],
    });

    console.log('[REPORT] Doc criado, convertendo para buffer...');
    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    console.log(`[REPORT] Sucesso! Buffer gerado: ${uint8Array.length} bytes`);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=relatorio_mensal_${month}_${year}.docx`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[MONTHLY_REPORT_ERROR_FULL]', error);
    return NextResponse.json({ 
      error: 'Erro ao gerar relatório mensal',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
