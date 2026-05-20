import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('Iniciando atualização do HNSG no banco de dados...')

  // 1. Procurar por Hospital que tenha Nelson ou HNSG no nome
  const hospitals = await prisma.hospital.findMany()
  const hnsg = hospitals.find(h => 
    h.name.toLowerCase().includes('nelson') || 
    h.name.toLowerCase().includes('hnsg')
  )

  const targetName = 'Hospital Doutor Nelson Gonçalves (HNSG)'
  const targetEmail = 'transferenciasnirhnsg@gmail.com'

  if (hnsg) {
    console.log(`Hospital encontrado no banco: ID: ${hnsg.id}, Nome Atual: "${hnsg.name}"`)
    const updated = await prisma.hospital.update({
      where: { id: hnsg.id },
      data: {
        name: targetName,
        email: targetEmail,
        accepts_cti: false, // Mantém como clínica médica, mas o frontend permitirá encaminhar livremente
        accepts_clinica: true
      }
    })
    console.log(`✓ Hospital atualizado com sucesso: "${updated.name}" com email "${updated.email}"`)
  } else {
    console.log('Hospital não encontrado no banco. Criando novo registro...')
    const created = await prisma.hospital.create({
      data: {
        name: targetName,
        email: targetEmail,
        type: 'PUBLICO',
        accepts_cti: false,
        accepts_clinica: true
      }
    })
    console.log(`✓ Hospital criado com sucesso: "${created.name}" com email "${created.email}"`)
  }
}

main()
  .catch((e) => {
    console.error('Erro na atualização:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
