import { prisma } from '../../lib/db'
import PrintButton from '../../components/PrintButton'
import FinalStatusActions from './FinalStatusActions'
import { createClient } from '../../lib/supabase/sb-server'
import { History, CheckCircle, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TransferidosPage() {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    let user = null
    if (supabaseUser) {
      user = await prisma.user.findUnique({
        where: { id: supabaseUser.id }
      })
    }

    const patients = await prisma.patient.findMany({
      where: {
        status: { in: ['TRANSFERRED', 'ALTA', 'FALECIMENTO', 'CANCELLED'] }
      },
      include: {
        logs: {
          where: { action: { in: ['TRANSFER', 'FINAL_STATUS', 'CANCEL'] } },
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return (
      <div className="space-y-8 animate-in fade-in duration-700 relative">
        <div className="absolute inset-0 technical-grid pointer-events-none opacity-20 -m-8" />

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-outfit">ARQUIVO CLÍNICO • HISTÓRICO DE SAÍDAS</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none font-outfit">
              Fluxo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500">Desfechos</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] mt-3 flex items-center gap-2">
              <History size={12} className="text-slate-500/50" />
              Altas, Transferências e Óbitos • Auditoria Passada
            </p>
          </div>

          <div className="flex gap-3 no-print">
            <PrintButton user={user} />
          </div>
        </div>

        {/* INFO CARD */}
        <div className="premium-card p-4 border-l-4 border-l-slate-500 bg-slate-900/40 relative z-10 overflow-hidden">
          <div className="scanline opacity-5" />
          <p className="text-slate-400 text-xs font-medium leading-relaxed flex items-center gap-3">
            <CheckCircle size={14} className="text-slate-400" />
            <span>Histórico completo de pacientes que deixaram a regulação ativa.</span>
          </p>
        </div>

        {/* TABELA */}
        <div className="premium-card relative z-10 overflow-hidden bg-slate-900/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-l border-white/5">Destino</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transferência</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Desfecho</th>
                  <th className="p-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest no-print">Ação</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 text-xs font-bold uppercase tracking-widest opacity-50">
                      Nenhum registro encontrado no arquivo.
                    </td>
                  </tr>
                ) : null}

                {patients.map((p, idx) => {
                  const eventLog = p.logs && p.logs.length > 0 ? p.logs[0] : null;

                  let destination = 'Não registrado';
                  if (p.status === 'ALTA') destination = 'Alta Médica';
                  else if (p.status === 'FALECIMENTO') destination = 'Falecimento';
                  else if (p.status === 'CANCELLED') destination = 'Cancelado';
                  else if (eventLog && eventLog.action === 'TRANSFER') destination = eventLog.details || '';

                  const transferDateToUse = p.transfer_date ? new Date(p.transfer_date) :
                    (eventLog && eventLog.action === 'TRANSFER' ? new Date(eventLog.timestamp) : null);

                  const outcomeDateToUse = p.outcome_date ? new Date(p.outcome_date) :
                    (p.status === 'ALTA' || p.status === 'FALECIMENTO' ?
                      (eventLog && eventLog.action === 'FINAL_STATUS' ? new Date(eventLog.timestamp) : null)
                      : null);

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 px-6">
                        <div className="font-black text-white text-sm uppercase tracking-tight group-hover:text-blue-400 transition-colors">{p.name}</div>
                        <span className={`badge badge-${p.severity} mt-2`}>
                          {p.severity}
                        </span>
                      </td>

                      <td className="p-4 px-6 text-slate-400 text-xs font-medium max-w-[200px] truncate">
                        {p.diagnosis}
                      </td>

                      <td className="p-4 px-6 text-slate-300 text-xs font-bold uppercase">
                        {p.origin_hospital}
                      </td>

                      <td className="p-4 px-6 text-emerald-400 text-xs font-black uppercase tracking-tight border-l border-white/5">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={10} />
                          {destination}
                        </div>
                      </td>

                      <td className="p-4 px-6 text-slate-500 text-[10px] font-bold">
                        {transferDateToUse ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-300">{transferDateToUse.toLocaleDateString('pt-BR')}</div>
                            <div className="opacity-50">{transferDateToUse.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="p-4 px-6 text-slate-500 text-[10px] font-bold">
                        {outcomeDateToUse ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-300">{outcomeDateToUse.toLocaleDateString('pt-BR')}</div>
                            <div className="opacity-50">{outcomeDateToUse.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="p-4 px-6 no-print">
                        <FinalStatusActions patientId={p.id} currentStatus={p.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    console.error('Transferidos Page Error:', err);
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="premium-card p-8 border-red-500/20 text-center">
          <h1 className="text-red-500 font-black uppercase tracking-widest mb-2">Erro ao carregar histórico</h1>
          <p className="text-slate-500 text-xs">{err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    );
  }
}