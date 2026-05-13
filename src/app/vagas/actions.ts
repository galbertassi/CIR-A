'use server'

import { prisma } from '../../lib/db'
import { revalidatePath } from 'next/cache'

import { ActionResult } from '@/lib/action-types'

export async function saveBedAvailability(hospital_name: string, bedData: {
    cti_masc: number
    cti_fem: number
    clinica_masc: number
    clinica_fem: number
    sem_vagas: boolean
}): Promise<ActionResult> {
    try {
        const result = await prisma.bedAvailability.upsert({
            where: { hospital_name },
            update: bedData,
            create: {
                hospital_name,
                ...bedData
            }
        });

        revalidatePath('/vagas')
        revalidatePath('/patients')
        revalidatePath('/', 'layout')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('[SAVE_BED_AVAILABILITY_ERROR]', error)
        return { success: false, error: error.message || 'Erro ao salvar disponibilidade de vagas' }
    }
}
