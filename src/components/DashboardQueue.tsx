'use client'

import React, { useState } from 'react'
import { Send, Clock, Ambulance, AlertCircle, MessageCircle, Mail, Paperclip, Plus, ShieldCheck, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { togglePatientPrivateProfile } from '../app/patients/actions'
import MassBlastModal from './MassBlastModal'
import ChargeEvolutionModal from './ChargeEvolutionModal'
import AttachEvolutionModal from './AttachEvolutionModal'

type Patient = {
  id: string
  name: string
  score: number | null
  severity: string
  status: string
  origin_hospital: string
  is_private?: boolean
  created_at: Date
}

function formatHours(dateString: Date) {
  const diffHours = (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60);
  if (diffHours < 24) return `${diffHours.toFixed(1)}h`;
  return `${(diffHours / 24).toFixed(1)} dias`;
}

export default function DashboardQueue({ patients, user }: { patients: Patient[], user: any }) {
  const [localPatients, setLocalPatients] = React.useState(patients);
  const [blastModal, setBlastModal] = useState<{ id: string, severity: string, is_private?: boolean } | null>(null);
  const [chargeModal, setChargeModal] = useState<{ id: string, origin: string } | null>(null);
  const [attachModal, setAttachModal] = useState<{ id: string, name: string } | null>(null);

  // Sync local state when props change
  React.useEffect(() => {
    setLocalPatients(patients);
  }, [patients]);

  const canAction = user?.role === 'ADMIN' || user?.canCancelPatient;

  const handleTogglePrivate = async (id: string, current: boolean) => {
    // Optimistic Update
    setLocalPatients(prev => prev.map(p =>
      p.id === id ? { ...p, is_private: !current } : p
    ));

    // Server Action
    const result = await togglePatientPrivateProfile(id, current);
    if (!result.success) {
      // Rollback on error
      setLocalPatients(prev => prev.map(p =>
        p.id === id ? { ...p, is_private: current } : p
      ));
      alert("Erro ao atualizar perfil: " + (result as any).error);
    }
  };

  // Show all relevant active patients on the dashboard
  const priorityPatients = localPatients;

  // Disparar alerta da Cirila "brava" quando houver pacientes em risco crítico
  React.useEffect(() => {
    const criticalPatients = localPatients.filter(p => (p.score || 0) > 35 || p.score === -1);
    if (criticalPatients.length > 0) {
      window.dispatchEvent(new CustomEvent('CIRILA_CRITICAL_ALERT', { detail: criticalPatients.length }));
    }
  }, [localPatients]);

  return (
    <div className="mt-4">
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-base font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2 m-0">
            <AlertCircle size={18} className="text-red-500" strokeWidth={3} /> Fila de Regulação em Tempo Real
          </h2>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-bold">{priorityPatients.length} pacientes</span>
            <Link href="/patients/new" className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all no-underline flex items-center gap-1.5">
              <Plus size={14} /> Nova Regulação
            </Link>
          </div>
        </div>

        {priorityPatients.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Não há pacientes na fila no momento.
          </div>
        ) : (
          <div className="table-container custom-scrollbar" style={{ overflowY: 'auto' as any, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gravidade</th>
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Paciente</th>
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Score</th>
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Origem</th>
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Espera</th>
                  <th className="py-3 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {priorityPatients.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-4 px-2">
                      <span className={`badge badge-${p.severity}`}>{p.severity}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-slate-100 font-bold text-sm">{p.name}</div>
                      <div className="flex flex-col gap-1.5 mt-1.5">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${p.status === 'WAITING' ? 'text-slate-500' : 'text-indigo-400'}`}>
                          {p.status === 'WAITING' ? 'Aguardando Vaga' : 'Vaga Solicitada'}
                        </div>

                        <button
                          onClick={() => handleTogglePrivate(p.id, p.is_private ?? false)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all w-fit mt-2 ${p.is_private
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/10'
                            }`}
                          title={p.is_private ? "Mudar para perfil SUS" : "Mudar para perfil Privado"}
                        >
                          {p.is_private ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                          {p.is_private ? 'PERFIL PRIVADO' : 'PERFIL SUS'}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className={`text-sm font-black ${(p.score || 0) >= 35 || p.score === -1 ? 'text-red-500 animate-pulse' : 'text-slate-300'
                        }`}>
                        {p.score === -1 ? 'VAGA ZERO' : p.score || '0'}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-slate-400 text-xs">
                      {p.origin_hospital}
                    </td>
                    <td className="py-4 px-2 text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} /> {formatHours(p.created_at)}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setAttachModal({ id: p.id, name: p.name })}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                          title="Anexar Evolução"
                        >
                          <Paperclip size={14} /> ANEXAR
                        </button>

                        <button
                          onClick={() => setChargeModal({ id: p.id, origin: p.origin_hospital })}
                          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                          title="Cobrar Evolução"
                        >
                          <MessageCircle size={14} /> COBRAR
                        </button>

                        <button
                          onClick={() => {
                            if (canAction) setBlastModal({ id: p.id, severity: p.severity, is_private: p.is_private })
                          }}
                          disabled={!canAction}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${canAction
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/10 opacity-50 cursor-not-allowed'
                            }`}
                          title={canAction ? "Disparo (Busca de Vaga)" : "Acesso Restrito"}
                        >
                          <Send size={14} /> DISPARO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {blastModal && (
        <MassBlastModal
          patientId={blastModal.id}
          severity={blastModal.severity}
          isPrivatePatient={blastModal.is_private}
          onClose={() => setBlastModal(null)}
        />
      )}

      {chargeModal && (
        <ChargeEvolutionModal
          patientId={chargeModal.id}
          originHospital={chargeModal.origin}
          onClose={() => setChargeModal(null)}
        />
      )}
      {attachModal && (
        <AttachEvolutionModal
          patientId={attachModal.id}
          patientName={attachModal.name}
          onClose={() => setAttachModal(null)}
        />
      )}
    </div>
  )
}
