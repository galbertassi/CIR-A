
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

console.log('--- TESTE DE AMBIENTE ---');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'DEFINIDO' : 'AUSENTE');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDO' : 'AUSENTE');
console.log('-------------------------');
