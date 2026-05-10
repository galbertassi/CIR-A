
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log('Total users in Prisma:', users.length)
  console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
