import { prisma } from '../../lib/db'
import ClientQueue from './ClientQueue'
import { calculatePatientScore } from '../../lib/scoring'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/sb-server'
import { ListTodo, Plus, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PatientsPage() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    
    let user = null
    if (supabaseUser) {
      user = await prisma.user.findUnique({
        where: { id: supabaseUser.id }
      })
    }

    const patientsDB = await prisma.patient.findMany({
      where: {
        status: {
          in: ['WAITING', 'OFFERED']
        }
      },
      include: {
        logs: {
          where: { 
            action: { in: ['REFUSAL', 'REQUEST'] } 
          }
        }
      }
    });

    const processedPatients = patientsDB.map(p => {
      const score = calculatePatientScore(p);
      const isDelayed = score > 100 || p.attempts_count >= 3; 
      
      const refused_hospitals = Array.from(new Set(p.logs.filter(l => l.action === 'REFUSAL').map(log => log.details).filter(Boolean))) as string[];
      const requested_hospitals = Array.from(new Set(p.logs.filter(l => l.action === 'REQUEST').map(log => log.details).filter(Boolean))) as string[];

      return {
        ...p,
        score,
        isDelayed,
        refused_hospitals,
        requested_hospitals
      };
    });

    processedPatients.sort((a, b) => {
      if (a.score === -1 && b.score !== -1) return -1;
      if (b.score === -1 && a.score !== -1) return 1;
      return b.score - a.score;
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-700 relative overflow-x-hidden min-w-0">
        <div className="absolute inset-0 technical-grid pointer-events-none opacity-20 -m-8" />
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] font-outfit">FILA EM TEMPO REAL • AUDITORIA VIVA</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none font-outfit">
              Fila <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">Inteligente</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] mt-3 flex items-center gap-2">
              <ListTodo size={12} className="text-blue-500/50" />
              Priorização Automática • Score Clínico Cirila
            </p>
          </div>

          <div className="flex gap-3 no-print">
            <Link href="/patients/new" className="group relative overflow-hidden px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
              <div className="relative z-10 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                <Plus size={16} strokeWidth={3} />
                Novo Paciente
              </div>
            </Link>
          </div>
        </div>

        {/* INFO CARD */}
        <div className="premium-card p-4 border-l-4 border-l-cyan-500 bg-slate-900/40 relative z-10 overflow-hidden">
          <div className="scanline opacity-5" />
          <p className="text-slate-400 text-xs font-medium leading-relaxed flex items-center gap-3">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Pacientes ordenados automaticamente por gravidade, tempo de espera e número de recusas hospitalares.</span>
          </p>
        </div>

        <div className="relative z-10">
          <ClientQueue initialPatients={processedPatients} user={user} />
        </div>
      </div>
    )
  } catch (err) {
    console.error('Patients Page Error:', err);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444' }}>Erro ao carregar fila</h1>
        <p style={{ color: '#94a3b8' }}>{err instanceof Error ? err.message : String(err)}</p>
      </div>
    );
  }
}
