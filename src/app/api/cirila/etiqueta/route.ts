import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

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
  Header,
  PageOrientation,
  VerticalAlign,
  HeightRule,
  TableLayoutType,
  ImageRun,
  Footer,
  UnderlineType,
} from 'docx';
import sharp from 'sharp';
import { prisma } from '@/lib/db';


import { sanitizeCirila } from '@/lib/sanitization';

/**
 * Gera uma chave única com retry em caso de colisão no banco
 */
async function generateSecureKey(attempts: number = 3): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const key = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Verificar se já existe no banco (tanto em AuthorizationKey quanto CirilaAudit)
    const exists = await prisma.authorizationKey.findFirst({ where: { key } });
    const existsAudit = await prisma.cirilaAudit.findFirst({ where: { key } });
    
    if (!exists && !existsAudit) return key;
  }
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patient = sanitizeCirila(searchParams.get('patient')?.replace(/\+/g, ' ') || 'PACIENTE');
    const professionalKey = searchParams.get('professional')?.toLowerCase() || 'paola';
    const templateUrl = searchParams.get('templateUrl');
    const providedKey = searchParams.get('key');
    const examsRaw = sanitizeCirila(searchParams.get('exam')?.replace(/\+/g, ' ') || 'EXAME');
    const hospitalOrigin = sanitizeCirila(searchParams.get('hospitalOrigin')?.replace(/\+/g, ' ') || 'HOSPITAL ORIGEM');
    const qty = parseInt(searchParams.get('qty') || '1');
    const protocolo = parseInt(searchParams.get('protocolo') || '1');
    const mode = searchParams.get('mode'); 
    const cns = searchParams.get('cns') || '';
    const userId = searchParams.get('userId') || 'SISTEMA_CIRILA';

    // VALIDAÇÃO CRÍTICA: Hospital de Origem é obrigatório
    if (!hospitalOrigin || hospitalOrigin === 'HOSPITAL ORIGEM' || hospitalOrigin.trim() === '') {
      return new NextResponse(JSON.stringify({ 
        error: 'O Hospital de Origem é obrigatório para a geração de etiquetas oficiais.' 
      }), { status: 400 });
    }

    const examsList = examsRaw.split(',').map(e => e.trim());
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

    const prof = profMap[professionalKey] || { name: professionalKey.toUpperCase(), registro: "REGISTRO", cargo: "CARGO" };
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const getDestination = (exam: string) => {
      const e = exam.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (e.includes('ANGIOTC') || e.includes('ANGIO')) return 'HMMR';
      if (e.includes('COLANGIO')) return 'RADIO VIDA';
      if (e.includes('RNM') || e.includes('RMN') || e.includes('RESSONANCIA')) return 'RADIO VIDA';
      if (e.includes('TC') || e.includes('TOMOGRAFIA')) return protocolo === 2 ? 'HMMR' : 'HSJB';
      if (e.includes('ECO') || e.includes('ECOCARDIOGRAMA')) return 'HSJB';
      return 'HSJB';
    };

    const createLabelTable = (examName: string, authKey: string, destination: string, pName: string, hOrigin: string) => {
      const labelBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
      return new Table({
        width: { size: 9000, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        borders: {
          top: labelBorder, bottom: labelBorder, left: labelBorder, right: labelBorder,
          insideHorizontal: labelBorder, insideVertical: labelBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    border: {
                      bottom: {
                        color: "000000",
                        space: 4,
                        style: BorderStyle.SINGLE,
                        size: 12,
                      },
                    },
                    children: [
                      new TextRun({
                        text: prof.name.toUpperCase(),
                        bold: true,
                        size: 24, // 12pt conforme solicitado
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                      new TextRun({
                        text: ` – ${prof.registro.toUpperCase()} – ${prof.cargo.toUpperCase()}`,
                        bold: true,
                        size: 24, // 12pt conforme solicitado
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                    ],
                  }),
                  // Linha separadora (Parágrafo vazio para criar espaço)
                  new Paragraph({ children: [] }),
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 40, after: 80 },
                    children: [
                      new TextRun({
                        text: 'DCRAA – SMSVR – DEPARTAMENTO DE CONTROLE E REGULAÇÃO',
                        bold: true,
                        size: 20, // 10pt conforme solicitado
                        font: { name: 'Arial' },
                        color: '000000',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 120 },
                    children: [
                      new TextRun({
                        text: `${dateStr} : ${authKey} - ${pName.toUpperCase()} – ${hOrigin.toUpperCase()} - ${examName.toUpperCase()} AUTORIZADO PARA ${destination.toUpperCase()}`,
                        bold: true, size: 24, font: { name: 'Arial' }, color: '000000',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
    };

    const labelElements: any[] = [];
    const generatedKeys: string[] = [];

    for (const [index, examName] of finalExams.slice(0, 2).entries()) {
      const authKey = (index === 0 && providedKey) ? providedKey : await generateSecureKey();
      generatedKeys.push(authKey);
      const destination = getDestination(examName);
      
      const now = new Date();
      const examType = examName.toUpperCase().includes('RNM') ? 'RNM' : examName.toUpperCase().includes('TC') ? 'TC' : 'OUTRO';

      try {
        await prisma.authorizationKey.create({
          data: {
            key: authKey,
            patient: patient.toUpperCase(),
            exam: examName.toUpperCase(),
            procedure: examName.toUpperCase(),
            origin: hospitalOrigin.toUpperCase(),
            destination: destination.toUpperCase(),
            professional: prof.name.toUpperCase(),
            user_created: userId, // Auditoria NIR
            type: examType,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            date: now,
            status: 'ATIVO',
            cns: cns
          }
        });
      } catch (err) {
        // Retry em caso de colisão de chave (mesmo com o check prévio)
        const retryKey = await generateSecureKey();
        await prisma.authorizationKey.create({
          data: {
            key: retryKey,
            patient: patient.toUpperCase(),
            exam: examName.toUpperCase(),
            procedure: examName.toUpperCase(),
            origin: hospitalOrigin.toUpperCase(),
            destination: destination.toUpperCase(),
            professional: prof.name.toUpperCase(),
            user_created: userId, // Auditoria NIR
            type: examType,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            date: now,
            status: 'ATIVO',
            cns: cns
          }
        });
      }

      labelElements.push(createLabelTable(examName, authKey, destination, patient, hospitalOrigin));
      if (index < finalExams.slice(0, 2).length - 1) {
        labelElements.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
      }
    }

    // CONFIGURAÇÃO DE ALTURA USÁVEL (A4 com margem 720 DXA)
    // Altura total A4: 16838. Margens: 720+720 = 1440. Altura útil: ~15398 DXA
    const USABLE_HEIGHT = 15300; 

    const createFinalDocument = (contentElements: any[], labels: any[]) => {
      return new Document({
        sections: [{
          properties: { 
            page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } 
          },
          children: [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: TableLayoutType.FIXED,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                // LINHA 1: CONTEÚDO (Imagem ou Texto) - BLINDAGEM: ALTURA FIXA E EXACTA
                new TableRow({
                  height: { value: USABLE_HEIGHT - 2500, rule: HeightRule.EXACT },
                  children: [
                    new TableCell({
                      verticalAlign: VerticalAlign.TOP,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: contentElements.length > 0 ? contentElements : [new Paragraph("")],
                    }),
                  ],
                }),
                // LINHA 2: ETIQUETA (Sempre no final) - BLINDAGEM: ALTURA FIXA E EXACTA
                new TableRow({
                  height: { value: 2500, rule: HeightRule.EXACT },
                  children: [
                    new TableCell({
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 },
                      children: labels,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }],
      });
    };

    if (mode === 'text') {
      const doc = createFinalDocument([new Paragraph({ spacing: { before: 2000 }, children: [new TextRun({ text: "CORPO DO DOCUMENTO LIMPO PARA COLAGEM MANUAL", bold: true, color: "CCCCCC" })] })], labelElements);
      const buffer = await Packer.toBuffer(doc);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Disposition': `attachment; filename="Etiqueta_${patient.replace(/\s/g, '_')}.docx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (templateUrl) {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error('Falha ao baixar o anexo.');
      
      const fileBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || '';
      
      const isDocx = contentType.includes('officedocument') || templateUrl.endsWith('.docx');
      const isPdf = contentType.includes('pdf') || templateUrl.endsWith('.pdf');
      const isImage = contentType.includes('image/') || /\.(jpg|jpeg|png)$/i.test(templateUrl);

      if (isDocx) {
        try {
          const templateZip = await JSZip.loadAsync(fileBuffer);
          const templateXml = await templateZip.file("word/document.xml")?.async("string") || "";

          // Gerar a estrutura da etiqueta de forma limpa
          // Não usamos o spacerTable gigante aqui para evitar quebrar o layout do template original
          // Em vez disso, usaremos um parágrafo espaçador menor ou a tabela direta
          const labelDoc = new Document({
            sections: [{
              children: [
                new Paragraph({ spacing: { before: 400 } }), // Pequeno respiro antes da etiqueta
                ...labelElements
              ]
            }]
          });

          const labelBuffer = await Packer.toBuffer(labelDoc);
          const labelZip = await JSZip.loadAsync(labelBuffer);
          const labelXml = await labelZip.file("word/document.xml")?.async("string") || "";

          // 1. Extrair o conteúdo do corpo da etiqueta gerada
          const labelBodyMatch = labelXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
          if (!labelBodyMatch) throw new Error("Erro ao gerar conteúdo da etiqueta.");
          
          let labelBody = labelBodyMatch[1]
            .replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, '') // Remove propriedades de seção do label
            .replace(/<w:sectPr[\s\S]*?\/>/g, '')
            .replace(/<w:pStyle[^>]*\/>/g, '')            // Remove estilos de parágrafo (usa padrão do template)
            .replace(/<w:rStyle[^>]*\/>/g, '')            // Remove estilos de caractere
            .replace(/ w:(rsid[R|P|Pr]|paraId|textId)="[^"]*"/g, '') // Remove IDs de revisão e parágrafo
            .replace(/ (w14|w15):(paraId|textId)="[^"]*"/g, '')      // Remove extensões Office 2010/2013
            .trim();

          // 2. Sincronizar Namespaces (Crucial para Word não corromper)
          const labelRootMatch = labelXml.match(/<w:document([^>]*)>/);
          let updatedTemplateXml = templateXml;
          
          if (labelRootMatch) {
            const namespaces = labelRootMatch[1].match(/xmlns:\w+="[^"]*"/g) || [];
            const templateRootMatch = templateXml.match(/<w:document([^>]*)>/);
            
            if (templateRootMatch) {
              let templateAttrs = templateRootMatch[1];
              namespaces.forEach(ns => {
                const nsPrefix = ns.split('=')[0];
                if (!templateAttrs.includes(nsPrefix)) {
                  templateAttrs += ` ${ns}`;
                }
              });
              updatedTemplateXml = templateXml.replace(/<w:document[^>]*>/, `<w:document${templateAttrs}>`);
            }
          }

          // 3. Detectar prefixo do namespace do template (geralmente 'w')
          const templatePrefixMatch = updatedTemplateXml.match(/xmlns:(\w+)="http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main"/);
          const templatePrefix = templatePrefixMatch ? templatePrefixMatch[1] : "w";
          
          if (templatePrefix !== "w") {
            labelBody = labelBody.replace(/w:/g, `${templatePrefix}:`);
          }

          // 4. Inserção Cirúrgica: Deve ser ANTES do w:sectPr final do corpo
          const bodyCloseTag = `</${templatePrefix}:body>`;
          const sectPrTag = `<${templatePrefix}:sectPr`;
          
          // Encontrar o sectPr que é filho direto do body (geralmente no final)
          const lastSectPrIndex = updatedTemplateXml.lastIndexOf(sectPrTag);
          const bodyCloseIndex = updatedTemplateXml.lastIndexOf(bodyCloseTag);
          
          let mergedXml;
          // Se encontramos um sectPr próximo ao final do body, inserimos antes dele
          if (lastSectPrIndex !== -1 && lastSectPrIndex < bodyCloseIndex) {
            mergedXml = updatedTemplateXml.slice(0, lastSectPrIndex) + labelBody + updatedTemplateXml.slice(lastSectPrIndex);
          } else {
            // Fallback: insere antes do fechamento do body
            mergedXml = updatedTemplateXml.replace(bodyCloseTag, labelBody + bodyCloseTag);
          }

          templateZip.file("word/document.xml", mergedXml);
          
          // Gerar o buffer final
          const finalBuffer = await templateZip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE'
          });

          return new NextResponse(new Uint8Array(finalBuffer), {
            headers: {
              'Content-Disposition': `attachment; filename="Autorizacao_${patient.replace(/\s/g, '_')}.docx"`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Length': finalBuffer.length.toString(),
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        } catch (xmlError: any) {
          console.error('[CIRILA_XML_MERGE_ERROR]', xmlError);
          // Fallback para geração segura sem merge em caso de erro no parser
          const fallbackDoc = createFinalDocument([], labelElements);
          const fallbackBuffer = await Packer.toBuffer(fallbackDoc);
          return new NextResponse(new Uint8Array(fallbackBuffer), {
            headers: {
              'Content-Disposition': `attachment; filename="Autorizacao_S_Anexo_${patient.replace(/\s/g, '_')}.docx"`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Length': fallbackBuffer.length.toString(),
            },
          });
        }
      } else if (isPdf) {
        return new NextResponse(JSON.stringify({ 
          success: false,
          error: 'CONVERSÃO DE PDF BLOQUEADA',
          message: 'Para garantir a integridade do layout institucional (etiqueta no rodapé e centralização de anexo), o sistema CIR-A exige que documentos sejam enviados como IMAGEM (JPG ou PNG).',
          instruction: 'Por favor, converta seu PDF para imagem ou envie uma foto/print do pedido médico.'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (isImage) {
        // Recalcular proporção para garantir altura máxima absoluta de 500px (Blindagem Final)
        const metadata = await sharp(fileBuffer).metadata();
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 500;

        let width = metadata.width || MAX_WIDTH;
        let height = metadata.height || MAX_HEIGHT;

        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        const finalWidth = Math.round(width * ratio);
        const finalHeight = Math.round(height * ratio);

        const processedImageBuffer = await sharp(fileBuffer)
          .resize(finalWidth, finalHeight)
          .toFormat('png')
          .toBuffer();

        const content = [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: processedImageBuffer,
                transformation: { width: finalWidth, height: finalHeight },
              } as any),
            ],
          })
        ];

        const doc = createFinalDocument(content, labelElements);
        const finalBuffer = await Packer.toBuffer(doc);
        return new NextResponse(new Uint8Array(finalBuffer), {
          headers: {
            'Content-Disposition': `attachment; filename="Autorizacao_${patient.replace(/\s/g, '_')}.docx"`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Length': finalBuffer.length.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    const finalDoc = createFinalDocument([], labelElements);
    const buffer = await Packer.toBuffer(finalDoc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Disposition': `attachment; filename="Etiqueta_${patient.replace(/\s/g, '_')}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (err: any) {
    console.error('[CIRILA_ETIQUETA_CRITICAL_ERROR]', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    return new NextResponse(JSON.stringify({ 
      success: false,
      error: 'Erro crítico na geração de etiqueta. Verifique os dados e tente novamente.',
      details: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
