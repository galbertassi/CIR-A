const fs = require('fs');
const path = require('path');

function testEnvFallback() {
  const rootDir = process.cwd();
  console.log('Current Working Directory:', rootDir);
  
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.resolve(rootDir, '.env')
  ];
  
  console.log('Checking paths:', envPaths);
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log('Found file:', envPath);
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n\s#]+)["']?/m);
      
      if (match && match[1]) {
        console.log('Match found! Length:', match[1].trim().length);
        console.log('Key starts with:', match[1].trim().substring(0, 10));
        return;
      } else {
        console.log('No match for SUPABASE_SERVICE_ROLE_KEY in', envPath);
      }
    } else {
      console.log('File not found:', envPath);
    }
  }
}

testEnvFallback();
