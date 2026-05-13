export const runtime = "nodejs";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    console.log("[UPLOAD_API] Iniciando processamento...");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const patientId = formData.get("patientId") as string || "unknown";

    if (!file) {
      return Response.json(
        { error: "Arquivo ausente" },
        { status: 400 }
      );
    }

    console.log(`[UPLOAD_API] Arquivo recebido: ${file.name} (${file.size} bytes)`);

    // Validação de segurança no servidor (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "O arquivo excede o limite de 5MB do servidor." },
        { status: 413 }
      );
    }

    // CONVERSÃO PARA BUFFER (Padrão Institucional para Estabilidade Binária)
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileExt = file.name.split('.').pop();
    const fileName = `evolution_${patientId}_${Date.now()}.${fileExt}`;
    const filePath = `evolucoes/${fileName}`;

    // Upload para o bucket malotes-pacientes
    const { error: uploadError } = await supabaseAdmin.storage
      .from('malotes-pacientes')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.error('[UPLOAD_API_STORAGE_ERROR]', uploadError);
      return Response.json(
        { error: `Erro no armazenamento: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('malotes-pacientes')
      .getPublicUrl(filePath);

    console.log("[UPLOAD_API] Sucesso:", publicUrl);

    return Response.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
    });

  } catch (error: any) {
    console.error("[UPLOAD_API_FATAL_ERROR]:", error);

    return Response.json(
      {
        error: "Erro interno no processamento do anexo",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
