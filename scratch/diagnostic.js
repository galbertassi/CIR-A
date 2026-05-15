
const { getAdminClient } = require('./src/lib/supabase/admin-client');
const { prisma } = require('./src/lib/db');

async function diagnostic() {
  console.log('--- DIAGNÓSTICO CIRILA ---');
  
  // 1. Testar Supabase Admin
  console.log('1. Testando Supabase Admin...');
  const admin = getAdminClient();
  if (!admin) {
    console.error('❌ Supabase Admin: Cliente não inicializado (variáveis ausentes).');
  } else {
    console.log('✅ Supabase Admin: Cliente inicializado.');
  }

  // 2. Testar Prisma
  console.log('2. Testando Prisma...');
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Prisma: Conectado. Total de usuários: ${userCount}`);
  } catch (err) {
    console.error(`❌ Prisma: Erro ao conectar: ${err.message}`);
  }

  // 3. Verificar Env
  console.log('3. Verificando Variáveis de Ambiente...');
  const vars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  vars.forEach(v => {
    const val = process.env[v];
    console.log(`${v}: ${val ? `OK (${val.length} chars)` : 'AUSENTE'}`);
  });

  process.exit();
}

diagnostic();
