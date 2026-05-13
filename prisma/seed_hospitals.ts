import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando cadastro de hospitais...')

  const hospitals = [
    // REDE PÚBLICA (REDE)
    {
      name: 'Hospital Municipal Munir Rafful (HMMR)',
      email: 'Transferenciasnirhmmr@gmail.com',
      type: 'PUBLICO',
      accepts_cti: true,
      accepts_clinica: true,
    },
    {
      name: 'Hospital São João Batista (HSJB)',
      email: 'nir1.hsjb@hsjb.org.br; nir2.hsjb@hsjb.org.br',
      type: 'PUBLICO',
      accepts_cti: true,
      accepts_clinica: true,
    },
    // REDE PRIVADA / CONTRATADA
    {
      name: 'Hospital Santa Cecília',
      email: 'regulacaosus@hospitalsantacecilia.org.br; internacao@hospitalsantacecilia.org.br',
      type: 'PRIVADO/CONTRATADO',
      accepts_cti: true,
      accepts_clinica: true,
    },
    {
      name: 'Viver Mais Hospital',
      email: 'invertacao@vivermaishospital.com.br; recepcao@vivermaishospital.com.br',
      type: 'PRIVADO/CONTRATADO',
      accepts_cti: true,
      accepts_clinica: true,
    },
    {
      name: 'Hospital Fundação Oswaldo Aranha (HFOA)',
      email: 'centraldevagas@hfoa.org.br',
      type: 'PRIVADO/CONTRATADO',
      accepts_cti: true,
      accepts_clinica: true,
    }
  ]

  for (const h of hospitals) {
    await prisma.hospital.upsert({
      where: { name: h.name },
      update: h,
      create: h,
    })
    console.log(`✓ Hospital cadastrado/atualizado: ${h.name}`)
  }

  console.log('Todos os hospitais foram integrados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
