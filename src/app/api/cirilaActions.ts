'use server'

import { prisma } from '@/lib/db'
import { sendHospitalNotification } from '@/lib/mail'
import { sanitizeCirila } from '@/lib/sanitization'
import { createClient } from '@/lib/supabase/sb-server'

export type CirilaResponse = {
  text: string;
  sender: 'ai' | 'user';
  actions?: { label: string, payload: string }[];
  image?: string;
  file?: {
    name: string;
    size?: number;
    type: string;
  };
  payload?: any;
};

/**
 * Gera uma chave alfanumérica curta e única com retry em caso de colisão
 */
async function generateUniqueKey(attempts: number = 3): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const key = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Verificar se já existe no banco (tanto em AuthorizationKey quanto CirilaAudit)
    const exists = await prisma.authorizationKey.findFirst({ where: { key } });
    const existsAudit = await prisma.cirilaAudit.findFirst({ where: { key } });
    
    if (!exists && !existsAudit) return key;
  }
  // Se falhar após 3 tentativas (improvável para 5 caracteres), aumenta o tamanho
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Função principal da Cirila (IA) para processar queries e documentos
 */
export async function askCirila(query: string): Promise<CirilaResponse> {
  const sanitizedQuery = query.trim();
  const lowerQuery = sanitizedQuery.toLowerCase();
  
  // Obter usuário atual para auditoria NIR
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'CIRILA_SYSTEM';

  try {
    // 0. Lógica de Dispatch de Email (Invocada por botões)
    if (lowerQuery.startsWith('ask_email_dispatch:::')) {
      const parts = query.split(':::');
      const patientId = parts[1];
      const type = parts[2] || 'ALL';
      
      const result = await executeEmailDispatch(patientId, type);
      
      if (result.success) {
        return {
          text: `✅ **Operação Concluída!** Disparei e-mails para **${result.count} hospitais**. \n\nDestinos: ${result.targetNames?.join(', ')}. \n\nAgora é só aguardar o retorno deles no NIR.`,
          sender: 'ai'
        };
      } else {
        return {
          text: `❌ **Falha no envio:** ${result.error}`,
          sender: 'ai'
        };
      }
    }

    // 1. Lógica de "Gerar X Chaves" (Limite 50) - REQUISITO PRIORITÁRIO
    const keyGenMatch = lowerQuery.match(/(?:gerar|criar|me de|faz)\s+(\d+)\s+chaves?/i);
    if (keyGenMatch) {
      const requestedCount = parseInt(keyGenMatch[1]);
      const count = Math.min(requestedCount, 50); // Limite de 50
      const generatedKeys: string[] = [];
      const now = new Date();

      for (let i = 0; i < count; i++) {
        const newKey = await generateUniqueKey();
        
        try {
          await prisma.authorizationKey.create({
            data: {
              key: newKey,
              patient: 'AVULSA - AGUARDANDO',
              exam: 'NÃO DEFINIDO',
              origin: 'NIR SMSVR',
              destination: 'PENDENTE',
              professional: 'CIRILA AUTO',
              type: 'AVULSA',
              user_created: userId, // Auditoria NIR
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              status: 'ATIVO'
            }
          });
          generatedKeys.push(newKey);
        } catch (dbErr) {
          // Retry automático em caso de colisão rara não detectada pelo generateUniqueKey
          const retryKey = await generateUniqueKey();
          await prisma.authorizationKey.create({
            data: {
              key: retryKey,
              patient: 'AVULSA - AGUARDANDO',
              exam: 'NÃO DEFINIDO',
              origin: 'NIR SMSVR',
              destination: 'PENDENTE',
              professional: 'CIRILA AUTO',
              type: 'AVULSA',
              user_created: userId, // Auditoria NIR
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              status: 'ATIVO'
            }
          });
          generatedKeys.push(retryKey);
        }
      }

      let text = `✅ **Lote de Chaves Gerado!**\n\nGerrei **${count} chaves** avulsas para uso imediato:\n\n${generatedKeys.map(k => `- **${k}**`).join('\n')}`;
      if (requestedCount > 50) {
        text += `\n\n*Nota: O limite máximo por execução é de 50 chaves para estabilidade do sistema.*`;
      }

      return {
        text: text + `\n\n*As chaves foram persistidas no banco de dados para auditoria.*`,
        sender: 'ai',
        actions: [
          { label: 'Ver no Dashboard', payload: 'NAVIGATE_KEYS' }
        ]
      };
    }

    // 2. Lógica de Etiqueta com Parsing Robusto (NOVO PADRÃO: NOME HOSP EXAME DETALHE ETIQUETA DESTINO)
    if (lowerQuery.includes('etiqueta') || lowerQuery.includes('autorizar')) {
      const parts = lowerQuery.split(/etiqueta|autorizar|autoriza/);
      const leftSide = parts[0].trim();
      const rightSide = parts[1]?.trim() || '';
      
      const hospitals = ['hmmr', 'hsjb', 'radio vida', 'hospital', 'hjv', 'nelson', 'retomada'];
      const exams = ['tc', 'rnm', 'rmn', 'ressonancia', 'tomografia', 'angiotc', 'colangio', 'ultrassom', 'eco'];
      
      let foundHospital = '';
      let foundExam = '';
      
      const words = leftSide.split(/\s+/);
      let hospitalIdx = -1;
      let examIdx = -1;
      
      for (let i = 0; i < words.length; i++) {
        const w = words[i].toLowerCase();
        if (hospitals.some(h => w === h || w.includes(h))) {
          foundHospital = words[i].toUpperCase();
          hospitalIdx = i;
        }
        if (exams.some(e => w === e || w.includes(e))) {
          foundExam = words[i].toUpperCase();
          examIdx = i;
        }
      }
      
      // Se encontrou hospital e exame, é o novo padrão completo
      if (foundHospital && foundExam && hospitalIdx !== -1) {
        const firstKeywordIdx = Math.min(hospitalIdx, examIdx);
        const patientName = words.slice(0, firstKeywordIdx).join(' ').toUpperCase();
        const lastKeywordIdx = Math.max(hospitalIdx, examIdx);
        const details = words.slice(lastKeywordIdx + 1).join(' ').toUpperCase();
        const fullExam = `${foundExam} ${details}`.trim();
        const destination = rightSide.toUpperCase() || 'SISTEMA';
        
        // Geração imediata de chave
        const newKey = await generateUniqueKey();
        const now = new Date();
        
        await prisma.authorizationKey.create({
          data: {
            key: newKey,
            patient: patientName || 'AVULSA',
            exam: fullExam,
            origin: foundHospital,
            destination: destination,
            professional: destination,
            type: (fullExam.includes('RNM') || fullExam.includes('RMN')) ? 'RNM' : 'TC',
            user_created: userId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            status: 'ATIVO'
          }
        });

        return {
          text: `✅ **Chave Gerada: ${newKey}**\n\nIdentifiquei a solicitação:\n- Paciente: **${patientName}**\n- Exame: **${fullExam}**\n- Origem: **${foundHospital}**\n- Destino: **${destination}**\n\nO documento institucional foi preparado com a chave persistida e auditada.`,
          sender: 'ai',
          actions: [
            { label: 'Baixar Etiqueta Oficial', payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanitizeCirila(patientName)}:::${sanitizeCirila(fullExam)}:::${sanitizeCirila(destination)}:::${newKey}::::::1:::bottom:::${sanitizeCirila(foundHospital)}:::1:::${userId}` }
          ]
        };
      }
      
      // Fallback para o padrão antigo assistido
      const etiquetaMatch = lowerQuery.match(/(?:etiqueta|autorizar|autoriza|gera etiqueta|faz etiqueta)\s+(?:para\s+)?(.*?)(?:\s+(?:do|no)\s+hospital\s+(.*?))?$/i);
      if (etiquetaMatch) {
        const patientName = sanitizeCirila(etiquetaMatch[1]);
        const hospitalName = sanitizeCirila(etiquetaMatch[2] || '');

        if (!patientName || patientName.length < 3) {
          return {
            text: "Para gerar a etiqueta, eu preciso do **nome do paciente**. Pode me informar?",
            sender: 'ai'
          };
        }

        if (!hospitalName) {
          const possiblePatient = await prisma.patient.findFirst({
            where: { name: { contains: patientName, mode: 'insensitive' } },
            orderBy: { created_at: 'desc' }
          });

          if (possiblePatient) {
            const sanName = sanitizeCirila(possiblePatient.name);
            const sanDiag = sanitizeCirila(possiblePatient.diagnosis);
            const sanHosp = sanitizeCirila(possiblePatient.origin_hospital);

            return {
              text: `Localizei **${sanName}** no hospital **${sanHosp}**. Deseja gerar a etiqueta com esses dados?`,
              sender: 'ai',
              actions: [
                { label: 'Sim, Gerar Etiqueta', payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanName}:::${sanDiag}:::Dr. Plantonista:::${possiblePatient.id}::::::1:::bottom:::${sanHosp}:::1:::${userId}` },
                { label: 'Não, informar outro', payload: 'ASK_MANUAL_ETIQUETA' }
              ]
            };
          }
        }
      }
    }

    if (lowerQuery.includes('relatório') || lowerQuery.includes('dashboard') || lowerQuery.includes('estatística') || lowerQuery.includes('nir')) {
      const now = new Date();
      const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [patientsMonth, totalKeys] = await Promise.all([
        prisma.patient.findMany({ where: { created_at: { gte: firstDayMonth } } }),
        prisma.authorizationKey.count()
      ]);

      const tc = patientsMonth.filter(p => p.diagnosis.toUpperCase().includes('TC')).length;
      const rnm = patientsMonth.filter(p => p.diagnosis.toUpperCase().includes('RNM')).length;
      
      return {
        text: `📊 **Dashboard NIR - ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}**\n\nNeste mês, já realizamos **${patientsMonth.length}** regulações.\n\n- 🖥️ **TC:** ${tc}\n- 🧲 **RNM:** ${rnm}\n- 🔑 **Chaves Totais:** ${totalKeys}\n\nO que deseja analisar agora?`,
        sender: 'ai',
        payload: {
          type: 'CIRILA_DASHBOARD',
          data: {
            total: patientsMonth.length,
            tc,
            rnm,
            others: Math.max(0, patientsMonth.length - tc - rnm),
          },
          period: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        },
        actions: [
          { label: 'Relatório Mensal (DOCX)', payload: 'DOWNLOAD_REPORT_MONTHLY' },
          { label: 'Relatório Anual', payload: 'DOWNLOAD_REPORT_ANNUAL' },
          { label: 'Ver Auditoria', payload: 'NAVIGATE_KEYS' }
        ]
      };
    }

    // 4. Lógica de Sobreaviso (Imutável conforme AGENTS.md)
    if (lowerQuery.includes('sobreaviso') || lowerQuery.includes('mapa') || lowerQuery.includes('planilha')) {
      return {
        text: "O sistema de sobreaviso está pronto para uso. Lembre-se que o layout (Corpo Limpo + Rodapé Fixo) é o padrão institucional imutável.",
        sender: 'ai',
        actions: [
          { label: 'Mapa 10 Chaves', payload: 'DOWNLOAD_DOCX_10' },
          { label: 'Mapa 15 Chaves', payload: 'DOWNLOAD_DOCX_15' },
          { label: 'Mapa 20 Chaves', payload: 'DOWNLOAD_DOCX_20' },
          { label: 'Mapa 30 Chaves', payload: 'DOWNLOAD_DOCX_30' },
          { label: 'Mapa 50 Chaves', payload: 'DOWNLOAD_DOCX_50' },
          { label: 'Mapa 100 Chaves', payload: 'DOWNLOAD_DOCX_100' },
          { label: 'Ver Escala', payload: 'NAVIGATE_SOBREAVISO' }
        ]
      };
    }

    // 5. Criação de Chave Única
    if (lowerQuery.includes('gerar chave') || (lowerQuery.includes('chave') && (lowerQuery.includes('nova') || lowerQuery.includes('uma')))) {
      const novaChave = await generateUniqueKey();
      const now = new Date();
      
      await prisma.authorizationKey.create({
        data: {
          key: novaChave,
          patient: 'AGUARDANDO IDENTIFICAÇÃO',
          exam: 'NÃO ESPECIFICADO',
          origin: 'NÃO ESPECIFICADO',
          destination: 'NÃO ESPECIFICADO',
          professional: 'CIRILA BOT',
          type: 'GERAL',
          user_created: userId, // Auditoria NIR
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          status: 'ATIVO'
        }
      });

      return {
        text: `✅ **Chave Gerada!**\n\nSua nova chave é: **${novaChave}**\n\nEla já foi registrada no sistema.`,
        sender: 'ai',
        actions: [
          { label: 'Ver Minhas Chaves', payload: 'NAVIGATE_KEYS' }
        ]
      };
    }

    // 6. Busca de Paciente para Etiqueta / Email
    const patientsInDB = await prisma.patient.findMany({
      take: 50,
      orderBy: { created_at: 'desc' }
    });

    const searchTerms = lowerQuery.split(' ').filter(t => t.length > 2);
    const matchedPatient = patientsInDB.find(p => {
      const patientName = p.name.toLowerCase();
      return searchTerms.some(term => patientName.includes(term)) || lowerQuery.includes(p.id.substring(0, 8));
    });

    if (matchedPatient) {
      const fileUrlMatch = query.match(/\[file_url:(.*?)\]/);
      const fileUrl = fileUrlMatch ? fileUrlMatch[1] : '';

      return {
        text: `Localizei a ficha de **${matchedPatient.name.toUpperCase()}**. \n\nDiagnóstico: **${matchedPatient.diagnosis}** \nHospital: **${matchedPatient.origin_hospital}**\n\nO que deseja fazer?`,
        sender: 'ai',
        actions: [
          { label: 'Gerar Etiqueta', payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanitizeCirila(matchedPatient.name)}:::${sanitizeCirila(matchedPatient.diagnosis)}:::Dr. Plantonista:::${matchedPatient.id}:::${fileUrl}:::1:::bottom:::${sanitizeCirila(matchedPatient.origin_hospital)}:::1:::${userId}` },
          { label: 'Disparar E-mails', payload: `ASK_EMAIL_DISPATCH:::${matchedPatient.id}:::ALL` },
          { label: 'Ver Prontuário', payload: `NAVIGATE_PATIENT:::${matchedPatient.id}` }
        ]
      };
    }

    // 7. Fallback Contextual para arquivos
    if (query.includes('[file_url:')) {
      return {
        text: "Documento recebido! 📄 \n\nPara vincular esse arquivo e gerar a etiqueta, por favor me informe o **nome do paciente**.",
        sender: 'ai'
      };
    }

    // 8. Resposta Padrão (Menu Inicial)
    return {
      text: "Olá! Eu sou a **Cirila**, assistente inteligente da regulação. \n\nComo posso ajudar?\n\n* 📄 **Etiquetas:** 'Gerar etiqueta para [Nome]'\n* 📊 **Relatórios:** 'Dashboard' ou 'Estatísticas'\n* 🔑 **Chaves:** 'Gerar 10 chaves'\n* 📅 **Sobreaviso:** 'Mapa de sobreaviso'",
      sender: 'ai',
      actions: [
        { label: 'Gerar Chave', payload: 'GENERATE_KEY' },
        { label: 'Dashboard NIR', payload: 'REPORT_GENERAL' }
      ]
    };
  } catch (error: any) {
    console.error('CRITICAL BACKEND ERROR [askCirila]:', {
      query: query.substring(0, 100),
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      text: "🚨 **Erro de Estabilidade:** Tive um problema interno ao processar sua solicitação. O erro foi registrado com contexto completo para auditoria técnica.",
      sender: 'ai',
      payload: { 
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Interface para anexos no sistema Cirila
 */
interface CirilaAttachment {
  filename: string;
  path: string;
}

/**
 * Resultado da operação de dispatch
 */
interface DispatchResult {
  success: boolean;
  count?: number;
  targetNames?: string[];
  error?: string;
}

/**
 * Função real para disparar os e-mails baseada na triagem inteligente
 */
export async function executeEmailDispatch(patientId: string, targetType: string): Promise<DispatchResult> {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return { success: false, error: 'Paciente não encontrado' };

    const hospitals = await prisma.hospital.findMany();

    // Filtro de Triagem Inteligente
    const isGrave = ['CTI', 'SALA_VERMELHA', 'CRITICAL', 'HIGH'].includes(patient.severity.toUpperCase());

    let targets = hospitals.filter(h => {
      // REGRA: Ignorar o hospital onde o paciente JÁ ESTÁ (Origem)
      if (h.name.toLowerCase().trim() === patient.origin_hospital.toLowerCase().trim()) return false;

      // TRAVA DE SEGURANÇA: Só envia para privado se o paciente tiver perfil privado
      if (h.type !== 'PUBLICO' && !patient.is_private) return false;

      // Regra da Rede Pública
      if (targetType === 'PUBLIC' && h.type !== 'PUBLICO') return false;

      // Regra Nelson Gonçalves: Só aceita Clínica Médica (não aceita CTI/GRAVE)
      if (h.name.toLowerCase().includes('nelson') && isGrave) return false;

      // Filtro de Capacidade do Hospital
      if (isGrave && !h.accepts_cti) return false;
      if (!isGrave && !h.accepts_clinica) return false;

      return !!h.email; // Só hospitais com e-mail cadastrado
    });

    // Se o targetType for um ID específico (ex: ONLY_uuid)
    if (targetType.startsWith('ONLY_')) {
      const hospitalId = targetType.replace('ONLY_', '');
      targets = hospitals.filter(h => h.id === hospitalId);
    }

    const emails = targets.map(h => h.email!);
    if (emails.length === 0) return { success: false, error: 'Nenhum hospital compatível com e-mail cadastrado.' };

    // Preparar Anexos: Malote + Evolução Médica - Garantir tipagem estrita
    const attachments: CirilaAttachment[] = [];
    
    if (patient.attachment_url) {
      attachments.push({
        filename: patient.attachment_name || 'malote-paciente.pdf',
        path: patient.attachment_url
      });
    }
    
    if (patient.evolution_url) {
      attachments.push({
        filename: patient.evolution_name || 'evolucao-medica.pdf',
        path: patient.evolution_url
      });
    }

    // Executar envio e auditoria em transação
    await prisma.$transaction(async (tx) => {
      await sendHospitalNotification({
        to: emails,
        patientName: patient.name,
        patientId: patient.id,
        severity: patient.severity,
        originHospital: patient.origin_hospital,
        diagnosis: patient.diagnosis,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      // Registrar Auditoria do Sistema (Cirila)
      await tx.log.create({
        data: {
          patient_id: patient.id,
          action: 'NOTIFICACAO_EMAIL',
          details: `E-mail disparado para ${emails.length} hospitais via Cirila. Destinos: ${targets.map(h => h.name).join(', ')}`
        }
      });
    });

    return { success: true, count: emails.length, targetNames: targets.map(h => h.name) };
  } catch (err: any) {
    console.error('Erro no dispatch Cirila:', err);
    return { success: false, error: err.message };
  }
}
