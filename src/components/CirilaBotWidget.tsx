'use client';

import React, { useState, useEffect, useRef } from 'react';
import { askCirila, executeEmailDispatch, CirilaResponse } from '../app/api/cirilaActions';
import { Send, Paperclip, Bot, Bell, ChevronDown, ChevronUp, Sparkles, Loader2, FileText, CheckCircle2, BarChart3, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CirilaAvatar from './CirilaAvatar';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#00d8ff', '#0f172a', '#64748b', '#94a3b8'];

function CirilaDashboard({ data, period, examType }: { data: any, period: string, examType?: string }) {
  const chartData = [
    { name: 'TC', value: data.tc },
    { name: 'RNM', value: data.rnm },
    { name: 'Outros', value: data.others }
  ].filter(d => d.value > 0);

  const hospitalData = Object.entries(data.byHospital || {}).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => (b.value as number) - (a.value as number));

  const isFiltered = examType && examType !== 'GERAL';

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '1.25rem',
      border: '1px solid rgba(0, 216, 255, 0.2)',
      boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)',
      marginTop: '1rem',
      width: '100%',
      minWidth: '300px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#00d8ff" />
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#ffffff', fontWeight: 500 }}>
            {isFiltered ? `Relatório ${examType}` : 'Relatório Geral'}
          </h4>
        </div>
        <span style={{ fontSize: '0.65rem', background: 'rgba(0, 216, 255, 0.1)', color: '#00d8ff', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          {period}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>AUTORIZADOS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00d8ff' }}>{data.total}</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>DESEMPENHO</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '1rem', fontWeight: 600 }}>
            <TrendingUp size={14} /> +12%
          </div>
        </div>
      </div>

      {!isFiltered && chartData.length > 0 && (
        <div style={{ height: '160px', width: '100%', marginBottom: '1.25rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(0, 216, 255, 0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: '0.75rem', color: '#fff' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {hospitalData.length > 0 && (
        <div style={{ marginTop: isFiltered ? '0.5rem' : '0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Principais Origens
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {hospitalData.slice(0, 3).map((h: any, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#00d8ff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 400, color: '#f8fafc' }}>{h.name}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#00d8ff' }}>{h.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CirilaBotWidget() {
  const router = useRouter();
  const [messages, setMessages] = useState<CirilaResponse[]>([
    { text: 'Olá! Eu sou a Cirila, sua IA da SMSVR. Como posso agilizar a regulação hoje?', sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [expression, setExpression] = useState<'neutral' | 'smiling' | 'thinking' | 'alert'>('neutral');
  const [lastIncompleteQuery, setLastIncompleteQuery] = useState<string | null>(null);
  const [lastIncompleteFileUrl, setLastIncompleteFileUrl] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, processingStatus]);

  useEffect(() => {
    const handleSimulatedReply = (e: any) => {
      const msg = e.detail || 'Nova Mensagem Recebida do NIR!';
      setNotification(msg);
      setExpression('alert');
      setMessages(prev => [...prev, { text: `🔔 Urgente chefe: ${msg}`, sender: 'ai' }]);
      setTimeout(() => {
        setNotification(null);
        setExpression('neutral');
      }, 10000);
    };
    const handleToggle = () => setIsMinimized(prev => !prev);

    const handleScoreAlert = (e: any) => {
      const num = e.detail;
      const msg = `⚠️ **ALERTA CLÍNICO MÁXIMO:** Detectei **${num}** paciente(s) na fila com Score elevadíssimo (acima do teto de 35 pontos ou com status de Vaga Zero Pura). A prioridade clínica está em vermelho. Recomendo abrir o modo de "Disparo de E-mail Único" na fila imediatamente, vou coordenar com as unidades conveniadas.`;

      setExpression('alert');
      setMessages(prev => {
        if (prev[prev.length - 1]?.text === msg) return prev;
        return [...prev, { text: msg, sender: 'ai' }];
      });
      setNotification(`ALERTA: SCORE ELEVADO DETECTADO`);
      setTimeout(() => {
        setNotification(null);
        setExpression('neutral');
      }, 15000);
      window.dispatchEvent(new CustomEvent('CIRILA_BADGE', { detail: true }));
    };

    window.addEventListener('CIRILA_CRITICAL_ALERT', handleScoreAlert);
    window.addEventListener('NIR_WEBHOOK_REPLY', handleSimulatedReply);
    window.addEventListener('TOGGLE_CIRILA', handleToggle);
    return () => {
      window.removeEventListener('CIRILA_CRITICAL_ALERT', handleScoreAlert);
      window.removeEventListener('NIR_WEBHOOK_REPLY', handleSimulatedReply);
      window.removeEventListener('TOGGLE_CIRILA', handleToggle);
    };
  }, []);

  async function handleSend(textOverride?: string, isSilent: boolean = false) {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    if (!isSilent) {
      setMessages(prev => [...prev, { text: textToSend, sender: 'user' }]);
      setInput('');
    }

    setLoading(true);
    setExpression('thinking');

    try {
      // Prioridade: anexo que acabou de ser feito (window) ou anexo persistido de uma query incompleta
      const fileUrl = (window as any).lastCirilaFileUrl || lastIncompleteFileUrl;

      // Se houver uma query incompleta (ex: aguardando hospital), combina com a resposta atual
      let processedQuery = textToSend;
      if (lastIncompleteQuery && !textToSend.toLowerCase().includes(lastIncompleteQuery.toLowerCase())) {
        processedQuery = `${lastIncompleteQuery} ${textToSend}`;
      }

      const finalQuery = fileUrl ? `${processedQuery} [file_url:${fileUrl}]` : processedQuery;

      console.log(`[CIRILA_WIDGET] Enviando query: "${processedQuery}" | Anexo: ${fileUrl || 'nenhum'}`);

      const reply = await askCirila(finalQuery);

      // Se a resposta for uma pergunta sobre hospital ou assinatura, persiste o contexto
      const isAwaitingInfo = reply.text.includes('qual o Hospital de Origem') || reply.text.includes('Quem assina pela DCRAA');

      if (isAwaitingInfo) {
        setLastIncompleteQuery(processedQuery);
        if (fileUrl) setLastIncompleteFileUrl(fileUrl);
      } else {
        // Se concluiu ou mudou de assunto, limpa o contexto
        console.log('[CIRILA_WIDGET] Fluxo concluído. Limpando contexto de arquivo.');
        setLastIncompleteQuery(null);
        setLastIncompleteFileUrl(null);
        if ((window as any).lastCirilaFileUrl) (window as any).lastCirilaFileUrl = null;
      }

      setMessages(prev => [...prev, reply]);

      // Automação: Se houver uma ação de download de etiqueta, dispara imediatamente
      const downloadAction = reply.actions?.find(a => a.payload.startsWith('DOWNLOAD_ETIQUETA_DOCX:::'));
      if (downloadAction) {
        console.log('[CIRILA_WIDGET] Automação: Disparando download imediato...');
        handleActionClick(downloadAction.payload);
      }
    } catch (err) {
      setMessages(prev => [...prev, { text: '❌ Erro ao conectar com o servidor da Cirila.', sender: 'ai' }]);
    } finally {
      setLoading(false);
      setExpression('neutral');
    }
  }

  const handleActionClick = (payload: string) => {
    if (payload.startsWith('DOWNLOAD_ETIQUETA_DOCX:::')) {
      const parts = payload.split(':::');
      const patient = parts[1] || '';
      const exam = parts[2] || '';
      const professional = parts[3] || '';
      const key = parts[4] || '';
      const templateUrl = parts[5] || '';
      const qty = parts[6] || '1';
      const pos = parts[7] || 'bottom';
      const hospitalOrigin = parts[8] || '';
      const protocolo = parts[9] || '1';

      const url = `/api/cirila/etiqueta?patient=${patient}&exam=${exam}&professional=${professional}&key=${key}&templateUrl=${encodeURIComponent(templateUrl)}&qty=${qty}&pos=${pos}&hospitalOrigin=${hospitalOrigin}&protocolo=${protocolo}`;

      // Abordagem robusta com fetch para capturar erros do servidor
      setProcessingStatus('Gerando documento institucional...');

      const safeDownload = async (fetchUrl: string, fileName: string, successMsg: string, minSize: number = 5000) => {
        try {
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: 'Erro interno no servidor' }));
            throw new Error(errData.error || 'Falha na geração do documento');
          }

          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('officedocument.wordprocessingml.document')) {
             const text = await res.text();
             try {
               const json = JSON.parse(text);
               throw new Error(json.error || 'O servidor não retornou um arquivo Word válido.');
             } catch (e) {
               throw new Error('O servidor retornou um formato inválido.');
             }
          }

          const blob = await res.blob();
          
          if (blob.size < minSize) {
             throw new Error('O arquivo gerado parece estar incompleto ou corrompido. Tente novamente.');
          }

          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
          
          setMessages(prev => [...prev, { text: `✅ **Sucesso!** ${successMsg}`, sender: 'ai' }]);
        } catch (err: any) {
          console.error('[CIRILA_DOWNLOAD_ERROR]', err);
          setMessages(prev => [...prev, { text: `❌ **Falha no Download:** ${err.message}`, sender: 'ai' }]);
        } finally {
          setProcessingStatus(null);
        }
      };

      safeDownload(
        url, 
        `Autorizacao_${patient.replace(/\s/g, '_')}.docx`, 
        `O documento de **${patient}** foi gerado com sucesso.`
      );
      return;
    }

    if (payload.startsWith('DOWNLOAD_DOCX_')) {
      const count = payload.replace('DOWNLOAD_DOCX_', '');
      const url = `/api/cirila/sobreaviso?count=${count}`;
      
      setProcessingStatus(`Gerando Mapa de Sobreaviso (${count} chaves)...`);
      
      const safeDownload = async (fetchUrl: string, fileName: string, successMsg: string, minSize: number = 10000) => {
        try {
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: 'Erro ao processar mapa' }));
            throw new Error(errData.error || 'Falha no servidor');
          }
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('officedocument')) {
            throw new Error('Formato de arquivo inválido retornado pelo servidor.');
          }

          const blob = await res.blob();
          if (blob.size < minSize) throw new Error('Arquivo de mapa inválido ou muito pequeno.');

          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
          
          setMessages(prev => [...prev, { text: `✅ ${successMsg}`, sender: 'ai' }]);
        } catch (err: any) {
          setMessages(prev => [...prev, { text: `❌ **Erro no Mapa:** ${err.message}`, sender: 'ai' }]);
        } finally {
          setProcessingStatus(null);
        }
      };

      safeDownload(url, `Mapa_Sobreaviso_${count}_chaves.docx`, `Mapa Gerado! O arquivo com ${count} chaves está pronto.`, 8000);
      return;
    }

    if (payload === 'DOWNLOAD_REPORT_MONTHLY') {
      const url = '/api/admin/reports/monthly';
      setProcessingStatus('Gerando relatório mensal consolidado...');

      const safeDownload = async (fetchUrl: string, fileName: string) => {
        try {
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (!res.ok) throw new Error('Falha ao gerar relatório no servidor.');
          
          const blob = await res.blob();
          if (blob.size < 5000) throw new Error('Relatório gerado é inválido.');

          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
          
          setMessages(prev => [...prev, { text: `✅ **Relatório Word pronto!** Enviado para o seu computador.`, sender: 'ai' }]);
        } catch (err: any) {
          setMessages(prev => [...prev, { text: `❌ **Erro:** ${err.message}`, sender: 'ai' }]);
        } finally {
          setProcessingStatus(null);
        }
      };

      safeDownload(url, `Relatorio_Mensal_${new Date().getMonth() + 1}_${new Date().getFullYear()}.docx`);
      return;
    }

    if (payload === 'NAVIGATE_SOBREAVISO') {
      router.push('/admin/sobreaviso');
      return;
    }

    handleSend(payload);
  };

  const getActionIcon = (payload: string) => {
    if (payload.includes('relatorio')) return <BarChart3 size={14} />;
    if (payload.includes('DOWNLOAD_DOCX') || payload.includes('DOWNLOAD_ETIQUETA')) return <FileText size={14} />;
    if (payload.includes('protocolo')) return <Bot size={14} />;
    if (payload.includes('ajuda') || payload.includes('comandos')) return <Sparkles size={14} />;
    return null;
  };

  return (
    <div className="card cirila-chat-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '85vh',
      width: '350px !important',
      maxWidth: '90vw',
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: isMinimized ? 'translate(-50%, -50%) scale(0.95)' : 'translate(-50%, -50%) scale(1)',
      zIndex: isMinimized ? -1 : 2147483647,
      opacity: isMinimized ? 0 : 1,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 216, 255, 0.1)',
      pointerEvents: isMinimized ? 'none' : 'auto',
      borderRadius: '32px',
      border: expression === 'alert' ? '2px solid #ef4444' : '1px solid rgba(0, 216, 255, 0.3)',
      backdropFilter: 'blur(40px)',
      background: 'rgba(2, 6, 23, 0.95)',
    }}>

      {/* Header */}
      <div style={{
        background: expression === 'alert' ? 'linear-gradient(135deg, #450a0a, #0f172a)' : 'linear-gradient(135deg, #020617, #0f172a)',
        padding: '1.25rem 2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: expression === 'alert' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(0, 216, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '56px', height: '56px', position: 'relative' }}>
            <CirilaAvatar expression={expression} size="100%" showAura={true} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 500, letterSpacing: '-0.02em', color: '#ffffff' }}>CIRILA</h3>
              <span style={{ fontSize: '0.6rem', background: expression === 'alert' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #00d8ff, #0088ff)', color: 'white', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, transition: 'all 0.5s', boxShadow: '0 4px 12px rgba(0, 216, 255, 0.3)' }}>
                {expression === 'alert' ? 'ALERTA' : 'V.2.5 PREMIUM'}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400 }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: expression === 'alert' ? '#ef4444' : '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: expression === 'alert' ? '0 0 12px #ef4444' : '0 0 12px #10b981', transition: 'all 0.5s' }}></span>
              {expression === 'alert' ? 'Status Crítico' : 'Inteligência Ativa'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {notification && (
            <div style={{ animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(135deg, #ef4444, #991b1b)', padding: '0.6rem 1.25rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 8px 16px rgba(239, 68, 68, 0.4)' }}>
              <Bell size={14} strokeWidth={3} /> ALERTA NIR
            </div>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', cursor: 'pointer', padding: '0.75rem', borderRadius: '14px', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <ChevronDown size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="custom-scrollbar">
        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>

            {m.sender === 'ai' && (
              <div style={{
                width: '50px',
                height: '50px',
                flexShrink: 0,
                marginTop: '4px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%',
                padding: '4px',
                border: m.text.includes('ALERTA CLÍNICO MÁXIMO') ? '1px solid #ef4444' : '1px solid rgba(0, 216, 255, 0.2)',
                filter: m.text.includes('ALERTA CLÍNICO MÁXIMO') ? 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))' : 'drop-shadow(0 0 8px rgba(0, 216, 255, 0.4))'
              }}>
                <CirilaAvatar expression={m.text.includes('ALERTA CLÍNICO MÁXIMO') ? 'alert' : 'neutral'} size="100%" showAura={false} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div
                className={m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: m.sender === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  fontWeight: 400,
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {m.sender === 'ai' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '3px',
                    height: '100%',
                    background: m.text.includes('ALERTA CLÍNICO MÁXIMO') ? 'linear-gradient(to bottom, #ef4444, transparent)' : 'linear-gradient(to bottom, #00d8ff, transparent)'
                  }} />
                )}
                <span
                  style={{ color: m.sender === 'user' ? '#ffffff' : '#e2e8f0' }}
                  dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00d8ff">$1</strong>') }}
                />

                {(m as CirilaResponse).file && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    border: '1px solid rgba(56, 189, 248, 0.1)'
                  }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00d8ff',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                      {m.file?.type?.includes('pdf') ? <FileText size={22} /> : <Paperclip size={22} />}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                        {m.file?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>
                        {m.file && m.file.size ? `${(m.file.size / 1024).toFixed(1)} KB` : 'Template Anexado'}
                      </div>
                    </div>
                    <CheckCircle2 size={18} color="#10b981" strokeWidth={3} />
                  </div>
                )}

                {m.payload?.type === 'CIRILA_DASHBOARD' && (
                  <CirilaDashboard
                    data={m.payload.data}
                    period={m.payload.period}
                    examType={m.payload.examType}
                  />
                )}
              </div>


              {m.actions && m.actions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {m.actions.map(act => (
                    <button
                      key={act.label}
                      onClick={() => handleActionClick(act.payload)}
                      className="btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(56, 189, 248, 0.05)',
                        color: '#00d8ff',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'}
                    >
                      {getActionIcon(act.payload)}
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {processingStatus && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px' }}>
              <CirilaAvatar expression="thinking" size="100%" showAura={false} />
            </div>
            <div style={{ background: '#eff6ff', padding: '1rem 1.5rem', borderRadius: '24px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <Loader2 className="animate-spin" size={18} />
              {processingStatus}
            </div>
          </div>
        )}

        {loading && !processingStatus && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px' }}>
              <CirilaAvatar expression="thinking" size="100%" showAura={false} />
            </div>
            <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div className="spinner" style={{ width: '18px', height: '18px', border: '3px solid #f1f5f9', borderTopColor: '#00d8ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Cirila está processando dados reais...
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1.5rem 2.5rem 2.5rem',
        background: 'rgba(2, 6, 23, 0.95)',
        borderTop: '1px solid rgba(0, 216, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <input
          type="text"
          className="chat-input"
          placeholder="Pergunte à Cirila..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            padding: '1.15rem 1.75rem',
            border: '1px solid rgba(0, 216, 255, 0.2)',
            borderRadius: '16px',
            outline: 'none',
            fontSize: '0.95rem',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            color: '#00d8ff !important',
            fontWeight: 600,
            boxShadow: 'none',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => e.currentTarget.style.border = '1px solid rgba(0, 216, 255, 0.5)'}
          onBlur={(e) => e.currentTarget.style.border = '1px solid rgba(0, 216, 255, 0.2)'}
        />

        <input
          type="file"
          id="cirila-file-upload"
          hidden
          accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setLoading(true);
            setExpression('thinking');
            setProcessingStatus(`📂 Enviando arquivo: ${file.name}...`);

            try {
              // 1. Realiza o upload real para o servidor
              const formData = new FormData();
              formData.append('file', file);

              const uploadRes = await fetch('/api/cirila/upload', {
                method: 'POST',
                body: formData
              });
              const uploadData = await uploadRes.json();

              if (!uploadRes.ok) throw new Error(uploadData.error || 'Erro no upload');

              // Adiciona o arquivo visualmente no chat com confirmação de "Recebido"
              setMessages(prev => [...prev, {
                text: `Documento **${file.name}** recebido chefe! Ele será usado como **Template Visual**. \n\nAgora me diga: **Qual paciente e qual exame devo regular nele?**`,
                sender: 'ai',
                file: {
                  name: uploadData.name,
                  size: uploadData.size,
                  type: uploadData.type
                }
              }]);

              // 🔥 LIMPEZA CRÍTICA: Garante que o novo arquivo mate qualquer contexto anterior
              setLastIncompleteFileUrl(null);
              (window as any).lastCirilaFileUrl = uploadData.url;
              console.log(`[CIRILA_WIDGET] Novo anexo pronto (Cache Buster): ${uploadData.url}`);

            } catch (err: any) {
              console.error('Erro no anexo:', err);
              setMessages(prev => [...prev, { text: `❌ Erro no anexo: ${err.message || 'Erro desconhecido'}`, sender: 'ai' }]);
            } finally {
              setProcessingStatus(null);
              setLoading(false);
              setExpression('neutral');
              e.target.value = '';
            }
          }}
        />


        <button
          onClick={() => document.getElementById('cirila-file-upload')?.click()}
          style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#0284c7', width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
          title="Anexar Pedido (PDF, Imagem ou Word)"
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
        >
          <Paperclip size={24} />
        </button>

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{ background: input.trim() ? 'linear-gradient(135deg, #0f172a, #334155)' : '#cbd5e1', border: 'none', color: 'white', width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.3s', boxShadow: input.trim() ? '0 10px 20px -5px rgba(15, 23, 42, 0.4)' : 'none' }}
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
        </button>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 768px) {
          .cirila-chat-container { width: 100vw !important; height: 100vh !important; max-width: none !important; border-radius: 0 !important; top: 0 !important; left: 0 !important; transform: none !important; }
        }
      `}} />
    </div>
  );
}
