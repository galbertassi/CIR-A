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

  // Detecção de Protocolo (Padrão 1: HSJB, Padrão 2: HMMR para TCs)
  const isProtocolo2 = lowerQuery.includes('protocolo 2') || lowerQuery.includes('protocolo2');
  const currentProtocol = isProtocolo2 ? '2' : '1';

  try {
    // Obter usuário atual para auditoria NIR (DENTRO do try para capturar falhas de env/auth)
    let userId = 'CIRILA_SYSTEM';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch (authErr: any) {
      console.warn('[CIRILA_AUTH_WARN] Falha ao obter usuário, usando fallback SYSTEM:', authErr.message);
      // Não damos throw aqui para permitir que a Cirila funcione em modo público/anônimo se necessário
    }

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

    // 1.1. Resposta Específica para Ativação de Protocolo 2
    if (lowerQuery === 'ativar protocolo 2' || lowerQuery === 'protocolo 2') {
      return {
        text: "🔄 **Protocolo 2 Ativado com Sucesso!** \n\nA partir de agora, todas as **Tomografias (TC)** solicitadas nesta sessão serão direcionadas automaticamente para o **HMMR** (Munir Rafful), conforme a norma técnica. \n\nDeseja gerar uma etiqueta agora ou ver o dashboard?",
        sender: 'ai',
        actions: [
          { label: 'Gerar Etiqueta (Prot. 2)', payload: 'ETIQUETA PROTOCOLO 2' },
          { label: 'Ver Dashboard NIR', payload: 'REPORT_GENERAL' }
        ]
      };
    }

    // 1.2. Resposta Específica para Ativação de Protocolo 1 (Retorno ao HSJB)
    if (lowerQuery === 'ativar protocolo 1' || lowerQuery === 'protocolo 1') {
      return {
        text: "🔄 **Protocolo 1 Ativado com Sucesso!** \n\nO fluxo padrão foi restaurado. Todas as **Tomografias (TC)** serão direcionadas para o **HSJB** (São João Batista). \n\nDeseja gerar uma etiqueta agora?",
        sender: 'ai',
        actions: [
          { label: 'Gerar Etiqueta (Prot. 1)', payload: 'ETIQUETA PROTOCOLO 1' },
          { label: 'Ver Dashboard NIR', payload: 'REPORT_GENERAL' }
        ]
      };
    }

    // 2. Lógica de Etiqueta com Parsing Robusto (NOVO PADRÃO: NOME HOSP EXAME DETALHE ETIQUETA DESTINO)
    if (lowerQuery.includes('etiqueta') || lowerQuery.includes('autorizar')) {
      const parts = lowerQuery.split(/etiqueta|autorizar|autoriza/);
      const leftSide = parts[0].trim();
      const rightSide = parts[1]?.trim() || '';

      const hospitals = [
        'hmmr', 'hmm', 'hsjb', 'radio vida', 'hospital', 'retomada', 'hmpagb', 'upa', 
        'hnsg', 'viver mais', 'h.foa', 'hsc', 'vivermais', 'hfoa', 'unimed', 'hinja',
        'hospital do retiro', 'municipais', 'ufrj', 'hu', 'hosp', 'viver-mais', 'h-foa',
        'viver', 'foa', 'vivermais', 'h-sc', 'hmm', 'h.sc', 'viver mais'
      ];
      const exams = [
        'tc', 'rnm', 'rmn', 'ressonancia', 'tomografia', 'angiotc', 'angio tc', 
        'colangio rnm', 'colangio', 'ultrassom', 'eco', 'doppler', 'ecodoppler',
        'raio-x', 'raiox', 'rx', 'eletro', 'ecg'
      ];

      let foundHospital = '';
      const words = leftSide.split(/\s+/);
      let hospitalIdx = -1;
      let examIndices: number[] = [];

      for (let i = 0; i < words.length; i++) {
        const w = words[i].toLowerCase();
        const normalizedW = w.replace(/[\.\-]/g, '').toLowerCase();
        const w2 = i < words.length - 1 ? `${words[i]} ${words[i+1]}`.toLowerCase() : '';
        const normalizedW2 = w2.replace(/[\.\-]/g, '').toLowerCase();
        
        // 1. Detecta Hospital (Prioridade para nomes compostos como "viver mais" ou "h.foa")
        const compoundMatch = hospitals.find(h => {
          const hNorm = h.replace(/[\.\-]/g, '').toLowerCase();
          return normalizedW2 === hNorm || w2 === h.toLowerCase();
        });

        if (compoundMatch && hospitalIdx === -1) {
          if (compoundMatch.includes('viver')) foundHospital = 'VIVER MAIS';
          else if (compoundMatch.includes('foa')) foundHospital = 'HFOA';
          else if (compoundMatch.includes('hmm')) foundHospital = 'HMMR';
          else if (compoundMatch.includes('sc')) foundHospital = 'HSC';
          else foundHospital = compoundMatch.toUpperCase();
          
          hospitalIdx = i;
          i++; // Pula a próxima palavra do nome composto
          continue;
        }

        // Detecta hospital simples
        if (hospitalIdx === -1) {
          const simpleMatch = hospitals.find(h => 
            normalizedW === h.replace(/[\.\-]/g, '').toLowerCase() || 
            w === h.toLowerCase()
          );

          if (simpleMatch) {
            if (simpleMatch === 'hsc' || simpleMatch === 'h.sc') foundHospital = 'HSC';
            else if (simpleMatch.toLowerCase().includes('foa')) foundHospital = 'HFOA';
            else if (simpleMatch === 'hmm' || simpleMatch === 'hmmr') foundHospital = 'HMMR';
            else if (simpleMatch === 'hsjb') foundHospital = 'HSJB';
            else if (simpleMatch.toLowerCase().includes('viver')) foundHospital = 'VIVER MAIS';
            else if (simpleMatch === 'hnsg') foundHospital = 'HNSG';
            else foundHospital = simpleMatch.toUpperCase();
            
            hospitalIdx = i;
          }
        }

        // 2. Detecta índices de exames
        if (exams.some(e => w === e || (w.length > 2 && e.includes(w)))) {
          // Prevenção de quebra em ANGIO TC
          if (w === 'tc' && i > 0 && words[i - 1].toLowerCase().includes('angio')) continue;
          // Prevenção de quebra em COLANGIO RNM
          if ((w === 'rnm' || w === 'rmn') && i > 0 && words[i - 1].toLowerCase().includes('colangio')) continue;
          // Prevenção de quebra se o termo anterior já for um exame
          if (i > 0 && examIndices.includes(i - 1)) continue;

          examIndices.push(i);
        }
      }


      // Se encontrou hospital e pelo menos um exame
      if (foundHospital && examIndices.length > 0) {
        const firstKeywordIdx = Math.min(hospitalIdx, examIndices[0]);

        // O nome do paciente é tudo antes da primeira palavra-chave detectada
        const patientName = words.slice(0, firstKeywordIdx).join(' ').toUpperCase().trim();

        // Separar múltiplos exames
        let detectedExams: string[] = [];
        const originalHospMatch = words[hospitalIdx]; // Captura o termo original usado na query

        if (examIndices.length > 1) {
          for (let i = 0; i < examIndices.length; i++) {
            const start = examIndices[i];
            const end = examIndices[i + 1] || words.length;
            let examText = words.slice(start, end).join(' ').toUpperCase();
            
            // Limpeza do hospital resíduo (usa tanto o nome normalizado quanto o termo original)
            const hospPattern = foundHospital.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+');
            const origPattern = originalHospMatch.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+');
            const hospRegex = new RegExp(`\\b(${hospPattern}|${origPattern})\\b`, 'gi');
            
            examText = examText.replace(hospRegex, '').trim();
            if (examText) detectedExams.push(examText);
          }
        } else {
          // Apenas um exame
          const lastKeywordIdx = Math.max(hospitalIdx, examIndices[0]);
          const hospPattern = foundHospital.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+');
          const origPattern = originalHospMatch.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+');
          const hospRegex = new RegExp(`\\b(${hospPattern}|${origPattern})\\b`, 'gi');
          
          const examBase = words.slice(examIndices[0], lastKeywordIdx + 1)
            .filter(w => !w.toUpperCase().match(hospRegex))
            .join(' ').toUpperCase();
          const extraDetails = words.slice(lastKeywordIdx + 1).join(' ').toUpperCase();
          detectedExams.push(`${examBase} ${extraDetails}`.trim());
        }


        const rawExamsList = detectedExams.slice(0, 2);

        const finalExamsList = rawExamsList.map(ex => {
          let e = ex.toUpperCase();

          // Limpeza profunda de bordas e resíduos
          e = e.replace(/^[–\-\s,eE\.]+/g, '') // Início (remove 'E' órfão)
               .replace(/[–\-\s,eE\.]+$/g, '') // Fim
               .replace(/\s+/g, ' ')
               .trim();

          // Normalizações específicas
          if (e.includes('COLANGIO')) {
            e = e.replace(/\bTC\b/g, '');
            if (!e.includes('RNM') && !e.includes('RMN')) e = e.replace('COLANGIO', 'COLANGIO RNM');
          } else if (e.includes('ANGIO')) {
            e = e.replace(/\bRNM\b|\bRMN\b/g, '');
            if (!e.includes('TC')) e = e.replace('ANGIO', 'ANGIO TC');
          }

          e = e.replace(/\bRMN\b/g, 'RNM');
          return e.trim();
        }).filter(e => e.length > 0);

        // Lógica de Destino e Profissional
        let destination = rightSide.replace(/PARA/i, '').trim().toUpperCase();
        const profKeys = ['inima', 'inimá', 'paola', 'carlos', 'roberto', 'sabrina', 'sabina', 'barenco', 'rosely', 'mazoni', 'gabriel'];
        const detectedProf = profKeys.find(p => rightSide.toLowerCase().includes(p) || leftSide.toLowerCase().includes(p));
        let foundProfessional = detectedProf || 'paola';

        if (profKeys.includes(destination.toLowerCase())) destination = '';

        // Geração de Chaves para Auditoria
        const keys: string[] = [];
        const destinations: string[] = [];

        // Lógica de Destino Espelhada da API (para consistência no DB)
        const getInternalDest = (ex: string) => {
          const e = ex.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          // 1. Prioridade: COLANGIO ou RNM -> sempre RADIO VIDA
          if (e.includes('COLANGIO') || e.includes('RNM') || e.includes('RMN') || e.includes('RESSONANCIA')) {
            return 'RADIO VIDA';
          }

          // 2. ANGIO TC -> sempre HMMR
          if (e.includes('ANGIO TC')) {
            return 'HMMR';
          }

          // 3. TC / Tomografia -> HSJB (Padrão) ou HMMR (Protocolo 2)
          if (e.includes('TC') || e.includes('TOMOGRAFIA')) {
            return currentProtocol === '2' ? 'HMMR' : 'HSJB';
          }

          return 'HSJB';
        };

        for (const ex of finalExamsList) {
          const k = await generateUniqueKey();
          const now = new Date();
          const dest = getInternalDest(ex);

          await prisma.authorizationKey.create({
            data: {
              key: k,
              patient: patientName || 'AVULSA',
              exam: ex,
              origin: foundHospital,
              destination: dest,
              professional: foundProfessional.toUpperCase(),
              type: (ex.includes('RNM') || ex.includes('RMN')) ? 'RNM' : 'TC',
              user_created: userId,
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              status: 'ATIVO'
            }
          });
          keys.push(k);
          destinations.push(dest);
        }

        // Captura de anexo se houver
        const fileUrlMatch = query.match(/\[file_url:(.*?)\]/);
        const fileUrl = fileUrlMatch ? fileUrlMatch[1] : '';

        return {
          text: `✅ **${keys.length} Chaves Geradas: ${keys.join(' e ')}**\n\nIdentifiquei múltiplos exames:\n- Paciente: **${patientName}**\n- Exames: \n  ${finalExamsList.map((e, idx) => `${idx + 1}. ${e} (${destinations[idx]})`).join('\n  ')}\n- Origem: **${foundHospital}**\n- Assinatura: **${foundProfessional.toUpperCase()}**`,
          sender: 'ai',
          actions: [
            {
              label: `Baixar Etiqueta (${keys.length} Chaves)`,
              payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanitizeCirila(patientName)}:::${sanitizeCirila(finalExamsList.join(','))}:::${foundProfessional}:::${keys.join(',')}:::${fileUrl}:::${keys.length}:::bottom:::${sanitizeCirila(foundHospital)}:::${currentProtocol}:::${userId}`
            }
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
                { label: 'Sim, Gerar Etiqueta', payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanName}:::${sanDiag}:::Dr. Plantonista:::${await generateUniqueKey()}:::${possiblePatient.id}::::::1:::bottom:::${sanHosp}:::${currentProtocol}:::${userId}` },
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

    // Limpeza inteligente da query para busca de nome
    // Remove palavras técnicas que confundem a busca no banco
    const stopWords = [
      'etiqueta', 'autorizar', 'autoriza', 'rnm', 'tc', 'rmn', 'ressonancia', 'tomografia',
      'abdome', 'pelve', 'torax', 'crânio', 'cranio', 'com', 'contraste', 'sem', 'hfoa', 'h.foa',
      'hsjb', 'hmmr', 'hsc', 'viver', 'mais', 'vivermais', 'radio', 'vida', 'radiovida',
      'hmm', 'foa', 'viver', 'hsc', 'rnm', 'abdome', 'pelve', 'etiqueta', 'inima', 'paola'
    ];

    const searchTerms = lowerQuery.split(' ')
      .filter(t => t.length > 2 && !stopWords.includes(t.replace(/[\.\-]/g, '')));

    const matchedPatient = patientsInDB.find(p => {
      const patientName = p.name.toLowerCase();
      
      if (searchTerms.length > 0) {
        const nameParts = p.name.toLowerCase().split(' ');
        // Verifica se os termos principais de busca (ex: "alessandra", "ferreira") estão presentes
        return searchTerms.every(term => nameParts.some(np => np.includes(term)));
      }
      return lowerQuery.includes(p.id.substring(0, 8));
    });

    if (matchedPatient) {
      const fileUrlMatch = query.match(/\[file_url:(.*?)\]/);
      const fileUrl = fileUrlMatch ? fileUrlMatch[1] : '';
      const authKey = await generateUniqueKey();
      const now = new Date();

      // Registrar a chave no banco para auditoria
      await prisma.authorizationKey.create({
        data: {
          key: authKey,
          patient: matchedPatient.name.toUpperCase(),
          exam: matchedPatient.diagnosis.toUpperCase(),
          procedure: matchedPatient.diagnosis.toUpperCase(),
          origin: matchedPatient.origin_hospital.toUpperCase(),
          destination: 'PENDENTE',
          professional: 'DR. PLANTONISTA',
          user_created: userId,
          type: matchedPatient.diagnosis.toUpperCase().includes('RNM') ? 'RNM' : 'TC',
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          status: 'ATIVO'
        }
      });

      return {
        text: `Localizei a ficha de **${matchedPatient.name.toUpperCase()}**. \n\nDiagnóstico: **${matchedPatient.diagnosis}** \nHospital: **${matchedPatient.origin_hospital}**\n\nO que deseja fazer?`,
        sender: 'ai',
        actions: [
          { label: 'Gerar Etiqueta', payload: `DOWNLOAD_ETIQUETA_DOCX:::${sanitizeCirila(matchedPatient.name)}:::${sanitizeCirila(matchedPatient.diagnosis)}:::Dr. Plantonista:::${authKey}:::${fileUrl}:::1:::bottom:::${sanitizeCirila(matchedPatient.origin_hospital)}:::${currentProtocol}:::${userId}` },
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

    const isEnvError = error.message.includes('Configuração') || error.message.includes('Credenciais');

    return {
      text: isEnvError 
        ? `🚨 **Erro de Configuração:** O servidor da Cirila está sem as chaves de acesso necessárias (Supabase). \n\nDetalhe: ${error.message}`
        : "🚨 **Erro de Estabilidade:** Tive um problema interno ao processar sua solicitação. O erro foi registrado para auditoria técnica.",
      sender: 'ai',
      payload: {
        error: error.message,
        type: isEnvError ? 'CONFIG_ERROR' : 'RUNTIME_ERROR',
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
