import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'MONTHLY'; // MONTHLY or ANNUAL
    const now = new Date();
    
    let startDate: Date;
    let title: string;

    if (type === 'ANNUAL') {
      startDate = new Date(now.getFullYear(), 0, 1);
      title = `RELATÓRIO ANUAL DE REGULAÇÃO - ${now.getFullYear()}`;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      title = `RELATÓRIO MENSAL DE REGULAÇÃO - ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`;
    }

    // Coleta de dados
    const [patients, keys] = await Promise.all([
      prisma.patient.findMany({
        where: { created_at: { gte: startDate } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.authorizationKey.findMany({
        where: { created_at: { gte: startDate } }
      })
    ]);

    const tcCount = patients.filter(p => p.diagnosis.toUpperCase().includes('TC')).length;
    const rnmCount = patients.filter(p => p.diagnosis.toUpperCase().includes('RNM')).length;
    const transferred = patients.filter(p => p.status === 'TRANSFERRED').length;

    // Busca nomes dos usuários para auditoria
    const userIds = Array.from(new Set(keys.map(k => k.user_created).filter(Boolean))) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    // Construção do Documento Word
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5 inch margins for more space
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "PREFEITURA DE VOLTA REDONDA – SECRETARIA MUNICIPAL DE SAÚDE",
                bold: true,
                size: 20,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "DCRAA – DEPARTAMENTO DE CONTROLE E REGULAÇÃO",
                bold: true,
                size: 18,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 600 },
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 28,
                font: "Arial",
                underline: { type: "single" },
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "1. INDICADORES DE DESEMPENHO", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MÉTRICA", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "VALOR", bold: true })] })], shading: { fill: "F2F2F2" } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Total de Regulações Realizadas")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${patients.length}`, bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Total de Chaves de Autorização")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${keys.length}`, bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Transferências Efetivadas")] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${transferred}`, bold: true })] })] }),
                ],
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "2. DISTRIBUIÇÃO POR TIPO DE PROCEDIMENTO", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PROCEDIMENTO", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "QTD", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "%", bold: true })] })], shading: { fill: "F2F2F2" } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("TOMOGRAFIA COMPUTADORIZADA (TC)")] }),
                  new TableCell({ children: [new Paragraph(`${tcCount}`)] }),
                  new TableCell({ children: [new Paragraph(`${((tcCount/patients.length || 0) * 100).toFixed(1)}%`)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("RESSONÂNCIA MAGNÉTICA (RNM)")] }),
                  new TableCell({ children: [new Paragraph(`${rnmCount}`)] }),
                  new TableCell({ children: [new Paragraph(`${((rnmCount/patients.length || 0) * 100).toFixed(1)}%`)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("OUTROS PROCEDIMENTOS")] }),
                  new TableCell({ children: [new Paragraph(`${Math.max(0, patients.length - tcCount - rnmCount)}`)] }),
                  new TableCell({ children: [new Paragraph(`${((Math.max(0, patients.length - tcCount - rnmCount)/patients.length || 0) * 100).toFixed(1)}%`)] }),
                ],
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "3. LOG DE AUDITORIA E RASTREABILIDADE", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATA", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CHAVE", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PACIENTE / ORIGEM", bold: true })] })], shading: { fill: "F2F2F2" } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "USUÁRIO", bold: true })] })], shading: { fill: "F2F2F2" } }),
                ],
              }),
              ...keys.slice(0, 100).map(k => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.created_at.toLocaleDateString('pt-BR'), size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.key, bold: true, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${k.patient.substring(0, 20)}... / ${k.origin}`, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.user_created ? (userMap[k.user_created] || 'SISTEMA') : 'CIRILA', size: 16 })] })] }),
                ],
              })),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1000 },
            children: [
              new TextRun({ 
                text: `Este documento constitui relatório oficial do sistema de regulação CIRILA. \nGerado em: ${now.toLocaleString('pt-BR')}`,
                size: 16 
              }),
              new TextRun({ 
                text: "\nDCRAA - SMSVR | Inteligência de Dados", 
                italics: true, 
                size: 16, 
                color: "666666",
                break: 1
              }),
            ]
          })
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Relatorio_NIR_${type}_${now.getFullYear()}.docx"`,
      },
    });

  } catch (err: any) {
    console.error('[CIRILA_RELATORIO_ERROR]', err);
    return new NextResponse(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
