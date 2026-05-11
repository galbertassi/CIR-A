import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

export async function GET() {
  try {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              children: [
                new TextRun({
                  text: "RELATÓRIO CIRILA",
                  bold: true,
                  size: 32,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Paciente: Ricardo do Carmo",
                  size: 24,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Status: Regulado",
                  size: 24,
                }),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Este documento foi gerado automaticamente pelo sistema Cirila.",
                  size: 20,
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          "attachment; filename=relatorio-cirila.docx",
      },
    });
  } catch (error: any) {
    console.error("ERRO AO GERAR WORD:", error);
    return NextResponse.json(
      { error: "Erro ao gerar documento" },
      { status: 500 }
    );
  }
}
