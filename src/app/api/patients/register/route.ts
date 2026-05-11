import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/sb-server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[REGISTRATION][${requestId}] Iniciando processo de cadastro...`);

  try {
    // 1. RECEBIMENTO DA REQUISIÇÃO (API ROUTE)
    const formData = await req.formData();
    
    // Extração de dados conforme especificação
    const name = formData.get('patient') as string;
    const origin_hospital = formData.get('hospital') as string;
    const diagnosis = formData.get('diagnosis') as string;
    const severity = formData.get('severity') as string;
    const observations = formData.get('observations') as string || null;
    const is_private = formData.get('is_private') === 'on' || formData.get('is_private') === 'true';
    const cns = formData.get('cns') as string || null;
    const file = formData.get('file') as File | null;

    console.log(`[REGISTRATION][${requestId}] Dados extraídos: ${name}, ${origin_hospital}, ${severity}`);

    // 2. VALIDAÇÃO RIGOROSA (BACKEND)
    if (!name || !origin_hospital || !diagnosis || !severity) {
      console.warn(`[REGISTRATION][${requestId}] Erro de validação: Campos obrigatórios ausentes.`);
      return NextResponse.json({ 
        success: false, 
        error: 'Campos obrigatórios faltando: Paciente, Hospital, Diagnóstico e Gravidade são necessários.' 
      }, { status: 400 });
    }

    // Validação de tamanho do arquivo (5MB)
    if (file && file.size > 5 * 1024 * 1024) {
      console.warn(`[REGISTRATION][${requestId}] Erro de validação: Arquivo muito grande (${file.size} bytes).`);
      return NextResponse.json({ 
        success: false, 
        error: 'O arquivo de anexo excede o limite de 5MB permitido.' 
      }, { status: 413 });
    }

    let attachment_url = null;
    let attachment_name = null;

    // 3. UPLOAD PARA SUPABASE (SE HOUVER ARQUIVO)
    if (file && file.size > 0) {
      console.log(`[REGISTRATION][${requestId}] Iniciando upload para Supabase: ${file.name}`);
      try {
        const supabase = supabaseAdmin;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${crypto.randomUUID().substring(0, 5)}.${fileExt}`;
        const filePath = `cadastros/${fileName}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('malotes-pacientes')
          .upload(filePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`[REGISTRATION][${requestId}] Erro no Supabase Storage:`, {
            message: uploadError.message,
            name: uploadError.name,
            error: uploadError
          });
          return NextResponse.json({ 
            success: false, 
            error: `Erro ao salvar arquivo no Storage (Supabase): ${uploadError.message}` 
          }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
          .from('malotes-pacientes')
          .getPublicUrl(filePath);

        attachment_url = publicUrl;
        attachment_name = file.name;
        console.log(`[REGISTRATION][${requestId}] Upload concluído: ${attachment_url}`);
      } catch (uploadErr: any) {
        console.error(`[REGISTRATION][${requestId}] Erro crítico no upload:`, uploadErr);
        return NextResponse.json({ 
          success: false, 
          error: `Erro interno no upload: ${uploadErr.message}` 
        }, { status: 500 });
      }
    }

    // 4. VERIFICAR DUPLICIDADE
    const existing = await prisma.patient.findFirst({
      where: {
        name,
        status: { in: ['WAITING', 'OFFERED'] }
      }
    });

    if (existing) {
      console.warn(`[REGISTRATION][${requestId}] Paciente duplicado: ${name}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Este paciente já se encontra ativo na fila de regulação!' 
      }, { status: 409 });
    }

    // 5. SALVAR NO BANCO (PRISMA)
    console.log(`[REGISTRATION][${requestId}] Salvando no banco de dados...`);
    const patient = await prisma.patient.create({
      data: {
        name,
        origin_hospital,
        diagnosis,
        severity,
        observations,
        is_private,
        cns,
        attachment_url,
        attachment_name,
        status: 'WAITING',
      } as any
    });

    // 6. LOG DE AUDITORIA
    await prisma.log.create({
      data: {
        patient_id: patient.id,
        action: 'REGISTER',
        details: 'Paciente inserido via API Route (Fluxo Robusto).'
      }
    });

    console.log(`[REGISTRATION][${requestId}] Cadastro concluído com sucesso: ${patient.id}`);

    // Revalidação manual (opcional em API routes mas boa prática)
    // Nota: revalidatePath não funciona de forma síncrona em API routes no Vercel da mesma forma que em Server Actions, 
    // mas chamamos para garantir a consistência do cache.
    revalidatePath('/patients');
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      patientId: patient.id,
      message: 'Cadastro realizado com sucesso.' 
    });

  } catch (err: any) {
    console.error(`[REGISTRATION][${requestId}] ERRO FATAL:`, err);
    return NextResponse.json({ 
      success: false, 
      error: `Erro interno no servidor: ${err.message || 'Erro desconhecido'}` 
    }, { status: 500 });
  }
}
