import nodemailer from 'nodemailer';

// Configuração do transporte SMTP usando os dados do .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'webmail.epdvr.com.br',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para porta 465, false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Algumas redes governamentais exigem isso para aceitar certificados auto-assinados
  tls: {
    rejectUnauthorized: false
  }
});

interface MailOptions {
  to: string[];
  patientName: string;
  patientId: string;
  severity: string;
  originHospital: string;
  diagnosis: string;
  attachments?: {
    filename: string;
    path: string;
  }[];
}

/**
 * Função auxiliar para baixar arquivos de URLs externas (Supabase) e converter para Buffer
 * Necessário pois o Nodemailer em ambiente serverless/container muitas vezes não resolve URLs como path.
 */
async function getAttachmentBuffer(url: string) {
  try {
    const encodedUrl = encodeURI(url);
    console.log(`[MAIL] Iniciando download do anexo: ${encodedUrl}`);
    const response = await fetch(encodedUrl);
    if (!response.ok) throw new Error(`Falha ao baixar arquivo: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      console.warn(`[MAIL] ALERTA: Buffer de anexo vazio para URL: ${url}`);
    }

    console.log(`[MAIL] Download concluído. Tamanho: ${(buffer.length / 1024).toFixed(2)} KB`);
    return buffer;
  } catch (error) {
    console.error(`[MAIL] ERRO CRÍTICO ao baixar anexo (${url}):`, error);
    return null;
  }
}

export async function sendHospitalNotification({
  to,
  patientName,
  patientId,
  severity,
  originHospital,
  diagnosis,
  attachments
}: MailOptions) {
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Configurações SMTP ausentes no .env. O e-mail não será enviado.');
    return { success: false, error: 'SMTP credentials missing' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cir-a-fo1k.vercel.app';
  
  // Link único de confirmação por paciente
  const confirmUrl = `${siteUrl}/api/confirm-receipt?p=${patientId}&h=Hospital`;

  // Processar anexos para garantir envio binário via Buffer
  let processedAttachments: any[] = [];
  if (attachments && attachments.length > 0) {
    console.log(`[MAIL] Processando ${attachments.length} anexos...`);
    
    for (const attachment of attachments) {
      const buffer = await getAttachmentBuffer(attachment.path);
      
      if (buffer) {
        // Identificar contentType baseado na extensão
        const isPdf = attachment.filename.toLowerCase().endsWith('.pdf');
        const isDocx = attachment.filename.toLowerCase().endsWith('.docx');
        const contentType = isPdf ? 'application/pdf' : (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream');

        processedAttachments.push({
          filename: attachment.filename,
          content: buffer,
          contentType: contentType,
          contentDisposition: 'attachment' // Garante que apareça como anexo e não inline
        });

        console.log(`[MAIL] Anexo pronto: ${attachment.filename} | ContentType: ${contentType} | Size: ${buffer.length} bytes`);
      } else {
        console.warn(`[MAIL] Pulando anexo devido a erro no download: ${attachment.filename}`);
      }
    }
  }

  try {
    console.log(`[MAIL] Disparando e-mail para: ${to.join(', ')}`);
    console.log(`[MAIL] Total de anexos na mensagem: ${processedAttachments.length}`);
    
    const info = await transporter.sendMail({
      from: `"CIRA Regulação" <${process.env.SMTP_USER}>`,
      to: to.join(', '),
      bcc: 'central.internacao@epdvr.com.br',
      subject: `[CIR-A | REGULAÇÃO AUTOMATIZADA] Solicitação de Vaga: ${patientName}`,
      attachments: processedAttachments,
      text: `
[CIR-A | REGULAÇÃO AUTOMATIZADA] Solicitação de Vaga: ${patientName}
Paciente: ${patientName}
Gravidade: ${severity}
Hospital de Origem: ${originHospital}
Quadro Clínico: ${diagnosis}

Por favor, utilize o botão "Confirmar Recebimento" no e-mail em formato HTML para validar esta solicitação.
`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #020617; padding: 30px; text-align: center; border-bottom: 3px solid #00d8ff;">
            <h1 style="color: #00d8ff; margin: 0; font-size: 28px; letter-spacing: 1px;">CIR-A</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Central Inteligente de Regulação Automatizada</p>
          </div>
          
          <div style="padding: 40px; color: #1e293b;">
            <h2 style="margin-top: 0; font-size: 20px; color: #020617;">Nova Solicitação de Vaga</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">Olá, equipe do NIR. Foi identificada uma necessidade de regulação para o perfil da sua unidade. Seguem dados iniciais:</p>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #f1f5f9;">
              <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Paciente:</strong> <span style="font-size: 16px; color: #020617;">${patientName}</span></p>
              <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Gravidade:</strong> <span style="padding: 4px 10px; border-radius: 6px; background-color: ${getSeverityColor(severity)}20; color: ${getSeverityColor(severity)}; font-weight: 800; font-size: 12px; display: inline-block;">${severity}</span></p>
              <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Hospital de Origem:</strong> ${originHospital}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Quadro Clínico:</strong> ${diagnosis}</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <div style="margin-top: 20px;">
                <a href="${confirmUrl}" target="_blank"
                   style="background-color: #2563eb; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                   ✅ Confirmar Recebimento
                </a>
              </div>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9;">
            Secretaria Municipal de Saúde de Volta Redonda (SMSVR)
          </div>
        </div>
      `,
    });


    console.log('[MAIL] Email enviado com sucesso:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[MAIL] Erro detalhado no envio (SMTP):', error);
    return { success: false, error };
  }
}

function getSeverityColor(severity: string) {
  const s = severity.toUpperCase();
  if (s.includes('SALA_VERMELHA') || s.includes('CRITICAL') || s.includes('CTI')) return '#ef4444';
  if (s.includes('HIGH') || s.includes('LARANJA')) return '#f59e0b';
  if (s.includes('MEDIUM') || s.includes('AMARELO')) return '#3b82f6';
  return '#10b981';
}
