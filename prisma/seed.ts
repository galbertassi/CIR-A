import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando semeadura de dados...')

  // 1. Criar Hospitais (Censo / BedAvailability)
  const hospitals = [
    { hospital_name: 'Hospital São João Batista (HSJB)', cti_masc: 2, cti_fem: 1, clinica_masc: 10, clinica_fem: 8, sem_vagas: false },
    { hospital_name: 'Hospital Mun. Dr. Munir Rafful (Retiro)', cti_masc: 1, cti_fem: 2, clinica_masc: 5, clinica_fem: 5, sem_vagas: false },
  ]

  for (const h of hospitals) {
    await prisma.bedAvailability.upsert({
      where: { hospital_name: h.hospital_name },
      update: {},
      create: h,
    })
  }

  // 2. Criar Pacientes de Exemplo
  const patients = [
    {
      name: 'Ricardo Alvez (Exemplo)',
      origin_hospital: 'UPA Santo Agostinho',
      diagnosis: 'Infarto Agudo do Miocárdio',
      severity: 'SALA_VERMELHA',
      status: 'WAITING',
    },
    {
      name: 'Maria Aparecida (Exemplo)',
      origin_hospital: 'Hospital do Retiro',
      diagnosis: 'AVC Isquêmico',
      severity: 'CTI',
      status: 'OFFERED',
    },
     {
      name: 'Jose Carlos (Exemplo)',
      origin_hospital: 'HSJB',
      diagnosis: 'Pneumonia Grave',
      severity: 'CLINICA_MEDICA',
      status: 'WAITING',
    }
  ]

  for (const p of patients) {
    await prisma.patient.create({
      data: {
        ...p,
        logs: {
          create: {
            action: 'REGISTER',
            details: 'Registro inicial via sistema CIR-A'
          }
        }
      }
    })
  }

  console.log('✅ Semeadura concluída com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
