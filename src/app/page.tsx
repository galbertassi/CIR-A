import { prisma } from '../lib/db'
import { Clock, Ambulance, AlertCircle, CheckCircle2, Bot, Sparkles, Zap, Brain, ShieldCheck, Plus, FileBarChart, Monitor, HeartPulse } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import DashboardCharts from './DashboardCharts'
import PrintButton from '@/components/PrintButton'
import PrivateHospitalsChart from '@/components/PrivateHospitalsChart'
import InteractiveCirilaPanel from '@/components/InteractiveCirilaPanel'
import { PRIVATE_HOSPITALS, ALL_HOSPITALS } from '@/lib/constants'
import DashboardQueue from '@/components/DashboardQueue'
import CirilaAvatar from '@/components/CirilaAvatar'
import { createClient } from '../lib/supabase/sb-server'
import { calculatePatientScore } from '../lib/scoring'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    const [
      dbUser,
      totalWaiting,
      totalOffered,
      totalTransferred,
      patientsWithLogs,
      availabilities,
      transferredLogs,
    ] = await Promise.all([
      authUser ? prisma.user.findUnique({ where: { id: authUser.id } }) : Promise.resolve(null),
      prisma.patient.count({ where: { status: 'WAITING' } }),
      prisma.patient.count({ where: { status: 'OFFERED' } }),
      prisma.patient.count({ where: { status: 'TRANSFERRED' } }),
      prisma.patient.findMany({
        where: { status: { in: ['WAITING', 'OFFERED'] } },
        select: {
          id: true,
          name: true,
          created_at: true,
          severity: true,
          status: true,
          origin_hospital: true,
          attempts_count: true,
          is_private: true,
          logs: {
            where: { action: { in: ['REQUEST', 'REFUSAL'] } },
            orderBy: { timestamp: 'desc' }
          }
        }
      }),
      prisma.bedAvailability.findMany(),
      prisma.log.findMany({
        where: {
          action: 'TRANSFER',
          timestamp: { gte: thirtyDaysAgo }
        },
        select: { details: true, timestamp: true }
      })
    ])

    const processedPatients = patientsWithLogs.map(p => ({
      ...p,
      score: calculatePatientScore(p)
    })).sort((a, b) => {
      if (a.score === -1 && b.score !== -1) return -1;
      if (b.score === -1 && a.score !== -1) return 1;
      return (b.score || 0) - (a.score || 0);
    });

    const now = new Date()
    let totalWaitHours = 0
    let criticalCount = 0
    let ctiCount = 0;
    let clinicaCount = 0;

    processedPatients.forEach(p => {
      const hours = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
      totalWaitHours += hours
      if (p.severity === 'SALA_VERMELHA') criticalCount++
      if (p.severity === 'CTI') ctiCount++;
      if (p.severity === 'CLINICA_MEDICA') clinicaCount++;
    })

    const destMap: Record<string, number> = {};
    transferredLogs.forEach(l => {
      if (l.details) {
        destMap[l.details] = (destMap[l.details] || 0) + 1;
      }
    });
    const transferredData = Object.entries(destMap).map(([name, value]) => ({ name, value }));

    const severityData = [
      { name: 'S. Vermelha', qtd: criticalCount, fill: '#ef4444' },
      { name: 'CTI', qtd: ctiCount, fill: '#f97316' },
      { name: 'Clín. Médica', qtd: clinicaCount, fill: '#3b82f6' }
    ];

    const privateMap: Record<string, number> = {};
    transferredLogs.forEach(l => {
      if (l.details && PRIVATE_HOSPITALS.includes(l.details)) {
        const dateStr = new Date(l.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        privateMap[dateStr] = (privateMap[dateStr] || 0) + 1;
      }
    });
    const privateData = Object.entries(privateMap)
      .map(([dateStr, count]) => ({ dateStr, count }))
      .sort((a, b) => {
        const [d1, m1] = a.dateStr.split('/');
        const [d2, m2] = b.dateStr.split('/');
        return new Date(2026, parseInt(m1) - 1, parseInt(d1)).getTime() - new Date(2026, parseInt(m2) - 1, parseInt(d2)).getTime();
      });

    const privateTotals: Record<string, number> = {};
    PRIVATE_HOSPITALS.forEach(h => { privateTotals[h] = 0; });

    transferredLogs.forEach(l => {
      if (l.details && PRIVATE_HOSPITALS.includes(l.details)) {
        privateTotals[l.details]++;
      }
    });

    processedPatients.forEach(p => {
      if (p.logs && p.logs.length > 0) {
        const lastLog = p.logs[0];
        const matchedHospital = PRIVATE_HOSPITALS.find(h => lastLog.details?.startsWith(h));
        if (lastLog.action === 'REQUEST' && matchedHospital) {
          privateTotals[matchedHospital]++;
        }
      }
    });

    const avgWaitHours = processedPatients.length > 0
      ? (totalWaitHours / processedPatients.length).toFixed(1)
      : 0;

    return (
      <div className="w-full space-y-6 overflow-x-hidden min-w-0 relative z-10">

        {/* Header Simples e Profissional */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ paddingTop: '1.0rem', marginBottom: '1.2rem' }}>
          <div>
            <h1 className="text-3xl font-bold text-white">Painel Geral CIR-A</h1>
            <p className="text-slate-400 text-sm">Central de Regulação de Acesso • SMSVR / DCRAA</p>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <Link href="/patients/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all">
              + Nova Regulação
            </Link>
            <PrintButton user={dbUser} />
          </div>
        </div>

        {/* Status AI Simplificado */}
        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Status Operacional</h2>
            <p className="text-slate-400 text-[10px] font-medium">
              {criticalCount > 2
                ? `ALERTA: ${criticalCount} casos de risco máximo detectados.`
                : "Fluxo de regulação normal."}
            </p>
          </div>
        </div>

        {/* MAIN DASHBOARD CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">

          {/* LEFT: KPIs & Charts (8 Cols) */}
          <div className="xl:col-span-8 space-y-8">

            {/* Grid de KPIs - 4 colunas fixas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Aguardando Vaga</p>
                <h3 className="text-3xl font-bold text-white mt-2">{totalWaiting}</h3>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Vagas Solicitadas</p>
                <h3 className="text-3xl font-bold text-white mt-2">{totalOffered}</h3>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Risco Máximo</p>
                <h3 className={`text-3xl font-bold mt-2 ${criticalCount > 0 ? 'text-red-500' : 'text-white'}`}>{criticalCount}</h3>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Transferidos</p>
                <h3 className="text-3xl font-bold text-white mt-2">{totalTransferred}</h3>
              </div>
            </div>

            {/* CHARTS CONTAINER */}
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                <FileBarChart className="text-blue-500" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Análise de Fluxo</h2>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Distribuição de gravidade e volume hospitalar</p>
                </div>
              </div>
              <DashboardCharts transferredData={transferredData} severityData={severityData} />
            </div>

            {/* PRIVATE HOSPITALS TREND */}
            <PrivateHospitalsChart data={privateData} totals={privateTotals} />
          </div>

          {/* RIGHT: Status & Cirila (4 Cols) */}
          <div className="xl:col-span-4 space-y-8 no-print">

            {/* INTERACTIVE PANEL */}
            <div className="relative">
              <InteractiveCirilaPanel />
            </div>

            {/* BEDS MAP */}
            <div className="card p-8">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <HeartPulse size={18} className="text-blue-400" />
                  </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest font-outfit">Censo de Leitos</h2>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    Disponibilidade em Tempo Real 
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse ml-1" />
                    <span className="text-[7px] text-slate-600 font-medium">({new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
                  </p>
                </div>
                </div>
                <Link href="/vagas" className="px-3 py-1 rounded-full bg-blue-500/10 text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                  Ver Tudo
                </Link>
              </div>

              {availabilities.length === 0 ? (
                <div className="py-16 text-center space-y-4 opacity-20">
                  <div className="relative inline-block">
                    <Monitor size={48} className="mx-auto text-slate-500" />
                    <div className="absolute top-0 right-0 w-3 h-3 bg-slate-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Aguardando sincronização...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
                  {availabilities
                    .filter(h => ALL_HOSPITALS.includes(h.hospital_name))
                    .map(h => {
                    const totalVagas = (h.cti_masc || 0) + (h.cti_fem || 0) + (h.clinica_masc || 0) + (h.clinica_fem || 0);

                    return (
                      <div key={h.id} className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className={`text-[10px] font-bold uppercase tracking-wide ${h.sem_vagas || totalVagas === 0 ? 'text-slate-500' : 'text-slate-200'}`}>
                            {h.hospital_name.replace('Hospital', '').trim()}
                          </h4>
                          {h.sem_vagas || totalVagas === 0 ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">LOTAÇÃO</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">DISPONÍVEL</span>
                            </div>
                          )}
                        </div>

                        {!(h.sem_vagas || totalVagas === 0) && (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'CTI M', value: h.cti_masc, color: 'orange' },
                              { label: 'CTI F', value: h.cti_fem, color: 'orange' },
                              { label: 'CLIN M', value: h.clinica_masc, color: 'blue' },
                              { label: 'CLIN F', value: h.clinica_fem, color: 'blue' },
                            ].filter(item => item.value > 0).map((item, idx) => (
                              <div key={idx} className={`flex justify-between items-center p-2.5 rounded-xl bg-${item.color}-500/5 border border-${item.color}-500/10 group-hover/item:border-${item.color}-500/30 transition-colors`}>
                                <span className={`text-[9px] font-black text-${item.color}-400/70 uppercase`}>{item.label}</span>
                                <span className="text-[13px] font-black text-white">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PATIENT QUEUE TABLE */}
        <div className="relative z-10">
          <DashboardQueue patients={processedPatients} user={dbUser} />
        </div>

      </div>
    )
  } catch (err) {
    console.error('Dashboard Fetch Error:', err);
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="premium-card p-12 max-w-xl border-red-500/20 text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Erro de Conexão Crítico</h1>
            <p className="text-slate-400 text-sm">O sistema não conseguiu estabelecer comunicação com a base de dados institucional.</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-left font-mono text-xs">
            <p className="text-blue-400 font-bold mb-2 uppercase tracking-widest">Diagnóstico:</p>
            <code className="text-red-400">{err instanceof Error ? err.message : String(err)}</code>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ambiente de Segurança DCRAA/SMSVR</p>
        </div>
      </div>
    )
  }
}