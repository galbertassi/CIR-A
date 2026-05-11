import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createClient } from '@/lib/supabase/admin';

// ─── POST: recebe e salva o arquivo no Supabase ─────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validação de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.warn(`[CIRILA_UPLOAD] Arquivo muito grande: ${file.size} bytes`);
      return NextResponse.json({ error: 'O arquivo excede o limite de 5MB.' }, { status: 413 });
    }

    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const ext = path.extname(file.name) || '.bin';
    const fileName = `${fileId}${ext}`;
    const filePath = `cirila/${fileName}`;

    console.log(`[CIRILA_UPLOAD] Iniciando upload para Supabase: ${filePath}`);

    // Converte File para Buffer para garantir compatibilidade no ambiente Node.js
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
      console.error('[CIRILA_UPLOAD_SUPABASE_ERROR] Detalhes:', {
        message: uploadError.message,
        name: uploadError.name,
        error: uploadError,
        bucket: 'malotes-pacientes',
        filePath
      });
      return NextResponse.json({ 
        success: false, 
        error: `Falha no armazenamento: ${uploadError.message}`,
        details: uploadError
      }, { status: 500 });
    }

    // Obter URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('malotes-pacientes')
      .getPublicUrl(filePath);

    console.log(`[CIRILA_UPLOAD] Arquivo salvo com sucesso no Supabase: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'ATTACHED',
      url: publicUrl,
    });
  } catch (err: any) {
    console.error('[CIRILA_UPLOAD_ERROR]', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno no processamento do upload.' 
    }, { status: 500 });
  }
}
