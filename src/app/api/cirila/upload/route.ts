import path from 'path';
import { createClient } from '@/lib/supabase/admin';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validação de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'O arquivo excede o limite de 5MB.' }, { status: 413 });
    }

    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const ext = path.extname(file.name) || '.bin';
    const fileName = `${fileId}${ext}`;
    const filePath = `cirila/${fileName}`;

    // Converte File para Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload para o bucket 'malotes-pacientes'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('malotes-pacientes')
      .upload(filePath, buffer, {
        cacheControl: '0',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.error('[UPLOAD_ERROR]', uploadError);
      return Response.json({ error: `Falha no Supabase: ${uploadError.message}` }, { status: 500 });
    }

    // Obter URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('malotes-pacientes')
      .getPublicUrl(filePath);

    return Response.json({
      success: true,
      fileId,
      url: publicUrl,
      fileName: file.name
    });

  } catch (err: any) {
    console.error('[UPLOAD_FATAL_ERROR]', err);
    return Response.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
