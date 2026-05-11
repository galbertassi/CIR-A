export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("UPLOAD INICIADO");

    const formData = await req.formData();

    console.log("FORMDATA OK");

    const file = formData.get("file") as File;

    console.log("FILE:", file);

    if (!file) {
      return Response.json(
        { error: "Arquivo ausente" },
        { status: 400 }
      );
    }

    console.log("NOME:", file.name);
    console.log("TIPO:", file.type);
    console.log("TAMANHO:", file.size);

    // TESTE BUFFER
    const bytes = await file.arrayBuffer();

    console.log("BUFFER OK");

    return Response.json({
      success: true,
      fileName: file.name,
    });

  } catch (error: any) {
    console.error("ERRO REAL:", error);

    return Response.json(
      {
        error: "Erro interno",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
