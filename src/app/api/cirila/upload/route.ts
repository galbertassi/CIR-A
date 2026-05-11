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

    console.log(`[UPLOAD_API] Recebido arquivo: ${file.name} (${file.size} bytes)`);

    const supabase = createClient();
    
    if (!supabase) {
      console.error('[UPLOAD_API] Erro: Cliente Supabase não pôde ser criado. Verifique as variáveis de ambiente.');
      return Response.json({ error: 'Configuração do Supabase ausente no servidor. Verifique as chaves de API.' }, { status: 500 });
    }

    const fileId = crypto.randomUUID();
    // Usa uma fallback simples caso o path.extname falhe ou o arquivo não tenha nome
    const fileNameParts = file.name.split('.');
    const ext = fileNameParts.length > 1 ? `.${fileNameParts.pop()}` : '.bin';
    const fileName = `${fileId}${ext}`;
    const filePath = `cirila/${fileName}`;

    console.log(`[UPLOAD_API] Preparando buffer para ${filePath}`);

    // Converte File para Buffer
    if (typeof file.arrayBuffer !== 'function') {
       throw new Error('O objeto file não suporta arrayBuffer(). Verifique a versão do ambiente Node.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
    console.error('[UPLOAD_FATAL_ERROR]', {
      message: err.message,
      stack: err.stack,
      cause: err.cause
    });
    return Response.json({ 
      error: `Erro interno: ${err.message || 'Falha no processamento'}`,
      debug: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
