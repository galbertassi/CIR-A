import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  VerticalAlign,
  PageOrientation,
  TextRun,
  BorderStyle,
  TableLayoutType,
  HeightRule,
} from 'docx';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/sb-server';

// ─── Gerador de chaves únicas ────────────────────────────────────────────────

function makeKeyGenerator() {
  const used = new Set<string>();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return function (): string {
    let k: string;
    do {
      k = Array.from({ length: 5 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    } while (used.has(k));
    used.add(k);
    return k;
  };
}

// ─── Constantes de layout ─────────────────────────────────────────────────────
// A4 Paisagem: largura total 16838 twips — margens L+R = 720 twips → útil = 15398
const PAGE_W = 15398;

// Proporções das colunas (devem somar 100)
// DATA/CHAVE(12), PACIENTE(18), DIAG(13), ORIGEM(13), PROC(10), REDE(8), CNS(16), AUDITOR(10)
const COL_PCTS = [12, 18, 13, 13, 10, 8, 16, 10]; 
const COL_LABELS = [
  'DATA / CHAVE',
  'CLIENTE (PACIENTE)',
  'DIAGNÓSTICO',
  'HOSPITAL ORIGEM',
  'PROCEDIMENTO',
  'PRESTADOR / REDE',
  'CNS',
  'AUDITOR',
];

const COL_WIDTHS = COL_PCTS.map(p => Math.floor((PAGE_W * p) / 100));

const BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
  right: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
};

// Altura das linhas de dados — Ajustada para caberem 8 a 10 por página
const ROW_HEIGHT = 900;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.max(1, Math.min(300, parseInt(searchParams.get('count') || '10')));

    const now         = new Date();
    const dateFileStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    const nextKey = makeKeyGenerator();

    // ── Linha de cabeçalho ─────────────────────────────────────────────────────
    const headerRow = new TableRow({
      tableHeader: true,
      cantSplit:   true,
      height: { value: 600, rule: HeightRule.ATLEAST },
      children: COL_LABELS.map((label, i) =>
        new TableCell({
          width: { size: COL_WIDTHS[i], type: WidthType.DXA },
          shading: { fill: '1e3a8a', color: '1e3a8a', type: 'solid' },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({ text: label, bold: true, size: 14, color: 'FFFFFF', font: { name: 'Arial' } }),
              ],
            }),
          ],
        })
      ),
    });

    // ── Linhas de dados e Persistência ─────────────────────────────────────────
    // Obter usuário atual para auditoria
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'CIRILA_SYSTEM';

    const dataRows = [];
    
    for (let i = 0; i < count; i++) {
      const key = nextKey();
      const fill = i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

      // Persistir no banco de dados
      await prisma.authorizationKey.create({
        data: {
          key,
          patient: 'AVULSA - SOBREAVISO',
          exam: 'NÃO DEFINIDO',
          origin: 'NIR SMSVR',
          destination: 'SOBREAVISO',
          professional: 'CIRILA AUTO',
          type: 'SOBREAVISO',
          user_created: userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          status: 'ATIVO'
        }
      });

      const emptyCell = (colIndex: number, text: string = '') =>
        new TableCell({
          width: { size: COL_WIDTHS[colIndex], type: WidthType.DXA },
          shading: { fill, color: fill, type: 'solid' },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({ 
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 }, 
              children: [
                new TextRun({ 
                  text: text.toUpperCase(), 
                  bold: true, 
                  size: 20, 
                  color: colIndex === 1 ? '1A56DB' : '000000', 
                  font: { name: 'Arial' } 
                })
              ] 
            })
          ],
        });

      dataRows.push(new TableRow({
        cantSplit: true,
        height: { value: ROW_HEIGHT, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: COL_WIDTHS[0], type: WidthType.DXA },
            shading: { fill, color: fill, type: 'solid' },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: '___/___/___', bold: true, size: 20, font: { name: 'Arial' } }),
                  new TextRun({ text: key, bold: true, size: 20, font: { name: 'Arial' }, break: 1 }),
                ],
              }),
            ],
          }),
          emptyCell(1),                         // CLIENTE
          emptyCell(2),                         // DIAGNÓSTICO
          emptyCell(3),                         // HOSPITAL ORIGEM
          emptyCell(4),                         // PROCEDIMENTO
          emptyCell(5),                         // PRESTADOR / REDE
          emptyCell(6),                         // CNS
          emptyCell(7),                         // AUDITOR
        ],
      }));
    }

    // ── Tabela principal ───────────────────────────────────────────────────────
    const table = new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: COL_WIDTHS,
      borders: BORDERS,
      rows: [headerRow, ...dataRows],
    });

    // Título e Data na mesma linha para economizar espaço vertical
    const docTitle = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({ 
            text: 'CIR-A / REGULAÇÃO SMSVR   |   MAPA DE SUPERVISÃO - SOBREAVISO   |   DATA:  ', 
            bold: true, 
            size: 18, 
            font: { name: 'Arial' }, 
            color: '000000' 
          }),
          new TextRun({ 
            text: ' ______ / ______ / ________ ', 
            bold: true, 
            size: 18, 
            font: { name: 'Arial' }, 
            color: '000000' 
          }),
        ],
      }),
    ];

    // ── Documento final (seção única) ─────────────────────────────────────────
    const doc = new Document({
      title: "Mapa de Sobreaviso",
      creator: "Cirila Bot",
      description: "Mapa de Supervisão - Sobreaviso",
      compatibility: {
        doNotExpandShiftReturn: true,
        useNormalStyleForList: true,
      },
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            },
          },
          children: [...docTitle, table],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Mapa_Sobreaviso_${dateFileStr}.docx"`,
      },
    });

  } catch (err: any) {
    console.error('[SOBREAVISO_ERROR]', err);
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Erro interno ao gerar o documento' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
