'use server'

import { prisma } from '../../lib/db'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/sb-server'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { ActionResult } from '@/lib/action-types'

export async function requestBed(patientId: string, targetHospital: string): Promise<ActionResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new Error("Paciente não encontrado");

      await tx.patient.update({
        where: { id: patientId },
        data: {
          status: 'OFFERED',
          last_offer_date: new Date()
        }
      });

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'REQUEST',
          details: targetHospital
        }
      });

      revalidatePath('/patients')
      revalidatePath('/')
      return { success: true }
    });
  } catch (error: any) {
    console.error('[REQUEST_BED_ERROR]', error)
    return { success: false, error: error.message || 'Erro ao solicitar vaga' }
  }
}

export async function registerRefusal(patientId: string, refusingHospital: string, refusalNote?: string): Promise<ActionResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new Error("Paciente não encontrado");

      await tx.patient.update({
        where: { id: patientId },
        data: {
          attempts_count: { increment: 1 }
        }
      });

      let details = refusingHospital;
      if (refusalNote && refusalNote.trim() !== '') {
        details = `${refusingHospital} — Motivo: ${refusalNote.trim()}`;
      }

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'REFUSAL',
          details
        }
      });

      revalidatePath('/patients')
      revalidatePath('/')
      return { success: true }
    });
  } catch (error: any) {
    console.error('[REGISTER_REFUSAL_ERROR]', error)
    return { success: false, error: error.message || 'Erro ao registrar recusa' }
  }
}

export async function transferPatient(patientId: string, destination_hospital: string): Promise<ActionResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: { 
          status: 'TRANSFERRED',
          transfer_date: new Date()
        }
      });

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'TRANSFER',
          details: destination_hospital
        }
      });

      revalidatePath('/patients')
      revalidatePath('/')
      return { success: true }
    });
  } catch (error: any) {
    console.error('[TRANSFER_PATIENT_ERROR]', error)
    return { success: false, error: error.message || 'Erro ao transferir paciente' }
  }
}

export async function cancelPatient(patientId: string, reason: string, exitType: 'ALTA_MEDICA' | 'OBITO' | 'OUTRO' = 'OUTRO'): Promise<ActionResult> {
  try {
    if (!reason || reason.trim() === "") throw new Error("Motivo é obrigatório.");

    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const dateStr = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      await tx.patient.update({
        where: { id: patientId },
        data: { 
          status: 'CANCELLED',
          outcome_date: now,
        }
      });

      const exitLabel = exitType === 'ALTA_MEDICA' ? '✅ Alta Médica' : exitType === 'OBITO' ? '☠️ Óbito' : 'Outro';

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'CANCEL',
          details: `${exitLabel} em ${dateStr}. Motivo: ${reason.trim()}`
        }
      });

      revalidatePath('/patients')
      revalidatePath('/')
      return { success: true }
    });
  } catch (error: any) {
    console.error('[CANCEL_PATIENT_ERROR]', error)
    return { success: false, error: error.message || 'Erro ao cancelar paciente' }
  }
}

// registerPatient foi movido para API Route /api/patients/register para maior robustez com anexos.


export async function evolvePatient(patientId: string, newSeverity: string, newDiagnosis?: string): Promise<ActionResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: patientId } })
      if (!patient) throw new Error('Paciente não encontrado')

      const oldSeverity = patient.severity
      const updateData: any = { severity: newSeverity }
      
      if (newDiagnosis && newDiagnosis.trim() !== '') {
        updateData.diagnosis = newDiagnosis.trim()
      }

      await tx.patient.update({
        where: { id: patientId },
        data: updateData
      })

      let details = `Gravidade alterada de ${oldSeverity} para ${newSeverity}.`;
      if (newDiagnosis && newDiagnosis.trim() !== '') {
        details += ` Diagnóstico atualizado: ${newDiagnosis.trim()}.`;
      }

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'EVOLVE',
          details
        }
      });

      revalidatePath('/patients')
      revalidatePath('/')
      return { success: true }
    });
  } catch (e: any) {
    console.error('[EVOLVE_PATIENT_ERROR]', e)
    return { success: false, error: e.message || 'Erro ao evoluir paciente' }
  }
}

export async function attachMedicalEvolution(formData: FormData): Promise<ActionResult> {
  const patientId = formData.get('patientId') as string;
  const file = formData.get('file') as File;

  if (!patientId || !file) {
    return { success: false, error: 'Dados incompletos para o anexo.' };
  }

  // Validação de tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'O arquivo excede o limite de 5MB.' };
  }

  try {
    // 1. Tentar obter o cliente admin de forma segura
    let supabase;
    try {
      supabase = supabaseAdmin;
      // Testar se o cliente é válido tentando acessar uma propriedade
      if (!supabase) throw new Error("Cliente Supabase não inicializado.");
    } catch (initErr: any) {
      console.error('[ATTACH_EVOLUTION_INIT_ERROR]', initErr.message);
      return { success: false, error: 'Erro de configuração no servidor (Supabase Admin).' };
    }
    
    // 2. Gerar nome e caminho único para a evolução
    const fileExt = file.name.split('.').pop();
    const fileName = `evolution_${patientId}_${Date.now()}.${fileExt}`;
    const filePath = `evolucoes/${fileName}`;

    console.log(`[ATTACH_EVOLUTION] Iniciando upload: ${fileName} (${file.size} bytes)`);

    // Converte File para Buffer para garantir compatibilidade no ambiente Node.js do servidor
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('malotes-pacientes')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.error('[ATTACH_EVOLUTION_STORAGE_ERROR]', uploadError);
      return { 
        success: false, 
        error: `Erro no Supabase: ${uploadError.message}` 
      };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('malotes-pacientes')
      .getPublicUrl(filePath);

    return await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: {
          evolution_url: publicUrl,
          evolution_name: file.name
        }
      });

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'STATUS_UPDATE',
          details: `📄 Nova evolução médica anexada: ${file.name}`
        }
      });

      revalidatePath('/patients');
      revalidatePath('/');
      return { success: true };
    });
  } catch (err: any) {
    console.error('[ATTACH_EVOLUTION_FATAL_ERROR]', err);
    return { success: false, error: `Erro interno crítico: ${err.message || 'Falha no processamento'}` };
  }
}

export async function togglePatientPrivateProfile(patientId: string, currentStatus: boolean): Promise<ActionResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patientId },
        data: { is_private: !currentStatus }
      });

      await tx.log.create({
        data: {
          patient_id: patientId,
          action: 'STATUS_UPDATE',
          details: `Perfil de atendimento alterado para: ${!currentStatus ? '💎 PRIVADO/CONVÊNIO' : '🏥 REDE PÚBLICA (SUS)'}`
        }
      });

      revalidatePath('/patients');
      revalidatePath('/');
      return { success: true };
    });
  } catch (err: any) {
    console.error('[TOGGLE_PRIVATE_PROFILE_ERROR]', err)
    return { success: false, error: err.message || 'Erro ao alterar perfil do paciente' };
  }
}
