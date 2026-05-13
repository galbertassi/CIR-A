import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const names = [
    "Hospital Nelson Gonçalves (Antigo Mater Dei)",
    "Hospital Nelson Gonçalves (Antigo Aterrado)",
    "Hospital Doutor Nelson Gonçalves (HNSG)",
    "Hospital Municipal Nelson Gonçalves"
  ]
  
  for (const hospitalName of names) {
    console.log(`Buscando ${hospitalName}...`)
    
    const bed = await prisma.bedAvailability.deleteMany({
      where: { hospital_name: hospitalName }
    })
    console.log(`[${hospitalName}] Deletado de BedAvailability: ${bed.count} registros.`)

    const hosp = await prisma.hospital.deleteMany({
      where: { name: hospitalName }
    })
    console.log(`[${hospitalName}] Deletado de Hospital: ${hosp.count} registros.`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
