
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.log('.env file not found at', envPath);
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

console.log('--- ANÁLISE DO .env ---');
lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY')) {
        const parts = line.split('=');
        console.log(`Linha ${i + 1}: Chave="${parts[0]}", Valor_Length=${parts[1] ? parts[1].trim().length : 'N/A'}`);
    }
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL')) {
        const parts = line.split('=');
        console.log(`Linha ${i + 1}: URL="${parts[0]}", Valor_Length=${parts[1] ? parts[1].trim().length : 'N/A'}`);
    }
});
console.log('-----------------------');
