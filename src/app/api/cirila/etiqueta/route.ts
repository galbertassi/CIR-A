import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  BorderStyle,
  AlignmentType,
  VerticalAlign,
  HeightRule,
  TableLayoutType,
  ImageRun,
  PageOrientation,
} from 'docx';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/sb-server';
import { sanitizeCirila } from '@/lib/sanitization';

/**
 * Gera uma chave única com retry em caso de colisão no banco
 */
async function generateSecureKey(attempts: number = 3): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < attempts; i++) {
    const key = Array.from({ length: 5 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');

    const exists = await prisma.authorizationKey.findFirst({ where: { key } });
    if (!exists) return key;
  }
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patient = sanitizeCirila(searchParams.get('patient')?.replace(/\+/g, ' ') || 'PACIENTE');
    const professionalKey = searchParams.get('professional')?.toLowerCase() || 'paola';
    const templateUrl = searchParams.get('templateUrl');
    const providedKeys = (searchParams.get('key') || '').split(',');
    const examsRaw = sanitizeCirila(searchParams.get('exam')?.replace(/\+/g, ' ') || 'EXAME');
    const hospitalOrigin = sanitizeCirila(searchParams.get('hospitalOrigin')?.replace(/\+/g, ' ') || 'HOSPITAL ORIGEM');
    const qty = parseInt(searchParams.get('qty') || '1');
    const protocolo = parseInt(searchParams.get('protocolo') || '1');
    const mode = searchParams.get('mode');
    const cns = searchParams.get('cns') || '';

    // VALIDAÇÃO CRÍTICA: Hospital de Origem é obrigatório
    if (!hospitalOrigin || hospitalOrigin === 'HOSPITAL ORIGEM' || hospitalOrigin.trim() === '') {
      return new NextResponse(JSON.stringify({
        error: 'O Hospital de Origem é obrigatório para a geração de etiquetas oficiais.'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const examsList = examsRaw.split(',').map(e => {
      let ex = e.trim().toUpperCase();

      // 1. Prioridade COLANGIO: deve ser COLANGIO RNM e não pode ter TC
      if (ex.includes('COLANGIO')) {
        ex = ex.replace(/\bTC\b/g, ''); // Remove TC intruso
        if (!ex.includes('RNM') && !ex.includes('RMN')) {
          ex = ex.replace('COLANGIO', 'COLANGIO RNM');
        }
      }

      // 2. Prioridade ANGIO: deve ser ANGIO TC e não pode ter RNM/RMN
      else if (ex.includes('ANGIO')) {
        ex = ex.replace(/\bRNM\b|\bRMN\b/g, ''); // Remove RNM intruso
        if (!ex.includes('TC')) {
          ex = ex.replace('ANGIO', 'ANGIO TC');
        }
      }

      // Limpeza final de espaços e duplicidades comuns
      return ex.replace(/\s+/g, ' ')
        .replace('COLANGIO RNM RNM', 'COLANGIO RNM')
        .replace('ANGIO TC TC', 'ANGIO TC')
        .trim();
    });

    let finalExams: string[] = [];
    if (examsList.length === 1 && qty > 1) {
      finalExams = Array(qty).fill(examsList[0]);
    } else {
      finalExams = examsList;
    }

    const profMap: Record<string, any> = {
      "paola": { name: "Paola Calderaro Nogueira Leite", registro: "COREN-RJ 88367", cargo: "Enfermeira Supervisora" },
      "inima": { name: "Inimá J. O. Junior", registro: "COREN-RJ 83798", cargo: "Enfermeiro Supervisor" },
      "inimá": { name: "Inimá J. O. Junior", registro: "COREN-RJ 83798", cargo: "Enfermeiro Supervisor" },
      "carlos": { name: "Carlos Roberto Alves", registro: "COREN-RJ 289648", cargo: "Enfermeiro Supervisor / Auditor" },
      "roberto": { name: "Roberto R. Lopes", registro: "COREN-RJ 262240", cargo: "Enfermeiro Supervisor" },
      "sabrina": { name: "Sabrina Silva Ramalho", registro: "COREN-RJ 146764", cargo: "Enfermeira Supervisora" },
      "sabina": { name: "Sabrina Silva Ramalho", registro: "COREN-RJ 146764", cargo: "Enfermeira Supervisora" },
      "barenco": { name: "Dr. Carlos Augusto Barenco", registro: "CRO 11981", cargo: "Supervisor" },
      "rosely": { name: "Rosely Frossard de Andrade", registro: "Mat.1778/PMVR", cargo: "DCRAA/SMSVR" },
      "mazoni": { name: "Dr Marcelo Henrique da Costa Mazoni", registro: "CRM 52-37297-5", cargo: "Médico Supervisor" },
      "gabriel": { name: "Gabriel Albertassi", registro: "DCRAA / SMSVR", cargo: "Coordenador de Regulação" }
    };

    const prof = profMap[professionalKey] || { name: professionalKey.toUpperCase(), registro: "", cargo: "" };
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const getDestination = (exam: string) => {
      const e = exam.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // 1. Prioridade Máxima: COLANGIO ou RNM -> sempre RADIO VIDA
      if (e.includes('COLANGIO') || e.includes('RNM') || e.includes('RMN') || e.includes('RESSONANCIA')) {
        return 'RADIO VIDA';
      }

      // 2. Prioridade Máxima: ANGIO -> sempre HMMR
      if (e.includes('ANGIO')) {
        return 'HMMR';
      }

      // 3. TC / Tomografia -> HSJB (Padrão) ou HMMR (Protocolo 2)
      if (e.includes('TC') || e.includes('TOMOGRAFIA')) {
        return protocolo === 2 ? 'HMMR' : 'HSJB';
      }

      return 'HSJB';
    };

    const createLabelTable = (exams: { name: string, key: string, dest: string }[], pName: string, hOrigin: string) => {
      const labelBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };

      const authLines = exams.map((ex, idx) => {
        return new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: idx === 0 ? 400 : 200 }, // Espaçamento extra antes da primeira autorização
          children: [
            new TextRun({
              text: `${dateStr} : ${ex.key} - ${pName.toUpperCase()} - ${hOrigin.toUpperCase()} - ${ex.name.toUpperCase()} AUTORIZADO PARA ${ex.dest.toUpperCase()}`,
              bold: true,
              size: 20, // 10pt
              font: { name: 'Arial' },
              color: '000000',
            }),
          ],
        });
      });

      const profLine = `${prof.name.toUpperCase()}${prof.registro && prof.registro !== 'REGISTRO' ? ` – ${prof.registro.toUpperCase()}` : ''}${prof.cargo && prof.cargo !== 'CARGO' ? ` – ${prof.cargo.toUpperCase()}` : ''}`;

      return new Table({
        width: { size: 9000, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [9000],
        alignment: AlignmentType.CENTER,
        borders: {
          top: labelBorder, bottom: labelBorder, left: labelBorder, right: labelBorder,
          insideHorizontal: labelBorder, insideVertical: labelBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                margins: { top: 150, bottom: 150, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: profLine,
                        bold: true,
                        size: 20, // 10pt
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: "_______________________________________________________________________________",
                        bold: true,
                        size: 20,
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 100, after: 100 },
                    children: [
                      new TextRun({
                        text: "Departamento, Controle, Regulação – Avaliação e Auditoria – DCRAA – SMSVR",
                        bold: true,
                        size: 22, // 11pt
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                    ],
                  }),
                  ...authLines
                ],
              }),
            ],
          }),
        ],
      });
    };

    // ── Auditoria e Usuário ──────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'CIRILA_SYSTEM';

    const labelElements: any[] = [];
    const now = new Date();

    const examsToProcess = finalExams.slice(0, 2);
    const resolvedExams = [];

    for (const [index, examName] of examsToProcess.entries()) {
      const authKey = (providedKeys[index]) ? providedKeys[index] : await generateSecureKey();
      const destination = getDestination(examName);
      const examType = examName.toUpperCase().includes('RNM') ? 'RNM' : examName.toUpperCase().includes('TC') ? 'TC' : 'OUTRO';

      const existingKey = await prisma.authorizationKey.findUnique({ where: { key: authKey } });
      if (!existingKey) {
        await prisma.authorizationKey.create({
          data: {
            key: authKey,
            patient: patient.toUpperCase(),
            exam: examName.toUpperCase(),
            procedure: examName.toUpperCase(),
            origin: hospitalOrigin.toUpperCase(),
            destination: destination.toUpperCase(),
            professional: prof.name.toUpperCase(),
            user_created: userId,
            type: examType,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            date: now,
            status: 'ATIVO',
            cns: cns
          }
        });
      }
      resolvedExams.push({ name: examName, key: authKey, dest: destination });
    }

    if (resolvedExams.length > 0) {
      labelElements.push(createLabelTable(resolvedExams, patient, hospitalOrigin));
    }

    // ── Layout de Blindagem (Fixed Footer) ───────────────────────────────────
    const USABLE_HEIGHT = 15500;
    const LABEL_HEIGHT = 3000;

    const createFinalDocument = (contentElements: any[]) => {
      return new Document({
        title: "Autorização Cirila",
        creator: "Cirila Bot",
        description: "Documento de Autorização Institucional",
        compatibility: {
          doNotExpandShiftReturn: true,
          useNormalStyleForList: true,
        },
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906, // A4 Width in twips
                height: 16838, // A4 Height in twips
                orientation: PageOrientation.PORTRAIT,
              },
              margin: { top: 500, right: 500, bottom: 500, left: 500 }
            }
          },
          children: [
            new Table({
              width: { size: 10466, type: WidthType.DXA },
              layout: TableLayoutType.FIXED,
              columnWidths: [10466],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                // LINHA 1: CONTEÚDO (Imagem ou Texto)
                new TableRow({
                  height: { value: USABLE_HEIGHT - LABEL_HEIGHT, rule: HeightRule.ATLEAST },
                  children: [
                    new TableCell({
                      verticalAlign: VerticalAlign.TOP,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: contentElements.length > 0 ? contentElements : [new Paragraph("")],
                    }),
                  ],
                }),
                // LINHA 2: ETIQUETA (Sempre no final)
                new TableRow({
                  height: { value: LABEL_HEIGHT, rule: HeightRule.ATLEAST },
                  children: [
                    new TableCell({
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: labelElements,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }],
      });
    };

    // ── Lógica de Anexo ─────────────────────────────────────────────────────
    let bodyElements: any[] = [];

    if (templateUrl) {
      const response = await fetch(templateUrl);
      if (response.ok) {
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || '';
        const isImage = contentType.includes('image/') || /\.(jpg|jpeg|png)$/i.test(templateUrl);

        if (isImage) {
          const metadata = await sharp(fileBuffer).metadata();
          // Redução adicional para garantir página única (aprox. 40% do tamanho anterior)
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 350;

          let width = metadata.width || MAX_WIDTH;
          let height = metadata.height || MAX_HEIGHT;

          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          const finalWidth = Math.round(width * ratio);
          const finalHeight = Math.round(height * ratio);

          const processedImageBuffer = await sharp(fileBuffer)
            .resize(finalWidth, finalHeight)
            .toFormat('png')
            .toBuffer();

          bodyElements = [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new ImageRun({
                  data: processedImageBuffer,
                  transformation: { width: finalWidth, height: finalHeight },
                } as any),
              ],
            })
          ];
        } else {
          // Bloqueio de DOCX/PDF direto conforme o plano de refatoração
          bodyElements = [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 2000 },
              children: [
                new TextRun({
                  text: "ANEXO BLOQUEADO: ENVIE COMO IMAGEM",
                  bold: true,
                  color: "FF0000",
                  size: 24
                }),
                new TextRun({
                  text: "Para garantir que a etiqueta permaneça na mesma folha,",
                  break: 1,
                  size: 20
                }),
                new TextRun({
                  text: "documentos DOCX ou PDF devem ser convertidos para imagem (JPG/PNG).",
                  break: 1,
                  size: 20
                })
              ]
            })
          ];
        }
      }
    } else {
      // Modo texto / Limpo (Totalmente em branco para colagem manual)
      bodyElements = [
        new Paragraph({
          spacing: { before: 1 },
          children: [
            new TextRun({
              text: "",
            })
          ]
        })
      ];
    }

    const doc = createFinalDocument(bodyElements);
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Autorizacao_${patient.replace(/\s/g, '_')}.docx"`,
      },
    });

  } catch (err: any) {
    console.error('[CIRILA_ETIQUETA_ERROR]', err);
    return new NextResponse(JSON.stringify({
      error: 'Erro na geração do documento. Tente converter o anexo para imagem.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
