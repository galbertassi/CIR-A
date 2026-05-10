'use client'

import React, { useRef } from 'react'
import { Printer, FileText, Building2, TrendingUp, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type TransferLog = {
  id: string
  timestamp: Date
  details: string | null
  patient: {
    name: string
    diagnosis: string
    severity: string
    origin_hospital: string
    created_at: Date
    transfer_date: Date | null
  }
}

type Props = {
  byHospital: Record<string, TransferLog[]>
  totalTransfers: number
  generatedAt: string
  privateHospitals: string[]
}

const HOSPITAL_COLORS: Record<string, { accent: string; bg: string; border: string; badge: string }> = {
  'Hospital H.FOA': {
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    badge: 'rgba(245,158,11,0.15)',
  },
  'Hospital Santa Cecília (HSC)': {
    accent: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    badge: 'rgba(139,92,246,0.15)',
  },
  'Hospital Viver Mais': {
    accent: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    badge: 'rgba(16,185,129,0.15)',
  },
}

const SEVERITY_LABEL: Record<string, string> = {
  CLINICA_MEDICA: 'Clínica Médica',
  CTI: 'CTI',
  SALA_VERMELHA: 'Sala Vermelha',
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatDateTime(d: Date | string) {
  const date = new Date(d)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
function calcWait(created: Date | string, transferred: Date | string | null) {
  const end = transferred ? new Date(transferred) : new Date()
  const diff = (end.getTime() - new Date(created).getTime()) / (1000 * 60 * 60)
  if (diff < 24) return `${diff.toFixed(1)}h`
  return `${(diff / 24).toFixed(1)} dias`
}

export default function PrivateReportClient({ byHospital, totalTransfers, generatedAt, privateHospitals }: Props) {

  // Imprime apenas uma seção específica
  function printHospital(hospName: string) {
    const slug = hospName.replace(/\s+/g, '-').toLowerCase()
    const style = document.createElement('style')
    style.id = '__print_override'
    style.innerHTML = `
      @media print {
        .private-hospital-section { display: none !important; }
        .private-hospital-section[data-hospital="${slug}"] { display: block !important; }
        .print-header-global { display: block !important; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  // Imprime todos
  function printAll() {
    window.print()
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" className="no-print" style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px', margin: 0 }}>
            Relatório — Contratos Privados
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            Transferências realizadas para H.FOA, HSC e Viver Mais · Gerado em: <strong style={{ color: '#e2e8f0' }}>{generatedAt}</strong>
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={printAll}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            <Printer size={16} /> Imprimir Todos
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* Total geral */}
        <div className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Total Contratos</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9' }}>{totalTransfers}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>transferências privadas</div>
        </div>

        {/* Card por hospital */}
        {privateHospitals.map(hosp => {
          const col = HOSPITAL_COLORS[hosp] || { accent: '#00b4d8', bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.25)', badge: '' }
          const count = byHospital[hosp]?.length || 0
          return (
            <div key={hosp} className="card" style={{ padding: '1.25rem', background: col.bg, border: `1px solid ${col.border}` }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: col.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                {hosp.replace('Hospital ', '').replace(' (HSC)', '')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9' }}>{count}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>pacientes transferidos</div>
            </div>
          )
        })}
      </div>

      <div className="print-header-global" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
            CIR-A | CENTRAL INTELIGENTE DE REGULAÇÃO AUTOMATIZADA
          </div>
          <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>
            Gerado em: {generatedAt} · Total: {totalTransfers} transferências
          </div>
        </div>
      </div>

      {/* SEÇÕES POR HOSPITAL */}
      {privateHospitals.map(hosp => {
        const col = HOSPITAL_COLORS[hosp] || { accent: '#00b4d8', bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.25)', badge: 'rgba(0,180,216,0.15)' }
        const logs = byHospital[hosp] || []
        const slug = hosp.replace(/\s+/g, '-').toLowerCase()

        // Stats por grav
        const bySev: Record<string, number> = {}
        logs.forEach(l => {
          const sev = l.patient.severity
          bySev[sev] = (bySev[sev] || 0) + 1
        })

        return (
          <div
            key={hosp}
            className="card private-hospital-section"
            data-hospital={slug}
            style={{
              padding: '',
              border: `1px solid ${col.border}`,
              background: col.bg,
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            {/* Header do hospital */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${col.border}`,
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: '10px',
                  background: `rgba(${col.accent === '#f59e0b' ? '245,158,11' : col.accent === '#8b5cf6' ? '139,92,246' : '16,185,129'}, 0.2)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: col.accent,
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9' }}>{hosp}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    {logs.length} paciente{logs.length !== 1 ? 's' : ''} transferido{logs.length !== 1 ? 's' : ''}
                    {logs.length > 0 && ` · Último: ${formatDate(logs[0].timestamp)}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Stats por severidade */}
                {Object.entries(bySev).map(([sev, cnt]) => (
                  <span key={sev} style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '6px',
                    background: sev === 'SALA_VERMELHA' ? 'rgba(239,68,68,0.2)' : sev === 'CTI' ? 'rgba(249,115,22,0.2)' : 'rgba(59,130,246,0.2)',
                    color: sev === 'SALA_VERMELHA' ? '#fca5a5' : sev === 'CTI' ? '#fdba74' : '#93c5fd',
                    border: `1px solid ${sev === 'SALA_VERMELHA' ? 'rgba(239,68,68,0.3)' : sev === 'CTI' ? 'rgba(249,115,22,0.3)' : 'rgba(59,130,246,0.3)'}`,
                  }}>
                    {SEVERITY_LABEL[sev] || sev}: {cnt}
                  </span>
                ))}

                {/* Botão imprimir individual */}
                <button
                  className="no-print"
                  onClick={() => printHospital(hosp)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${col.border}`,
                    background: col.badge,
                    color: col.accent,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  title={`Imprimir relatório de ${hosp}`}
                >
                  <Printer size={14} /> Imprimir
                </button>
              </div>
            </div>

            {/* Tabela */}
            {logs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                Nenhuma transferência registrada para este hospital.
              </div>
            ) : (
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${col.border}` }}>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnóstico</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gravidade</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hospital Origem</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrada na Fila</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Transferência</th>
                      <th style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>T. Espera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: `1px solid rgba(255,255,255,0.04)`,
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: '#e2e8f0' }}>{log.patient.name}</td>
                        <td style={{ padding: '0.75rem 1.25rem', color: '#94a3b8', maxWidth: '200px' }}>{log.patient.diagnosis}</td>
                        <td style={{ padding: '0.75rem 1.25rem' }}>
                          <span className={`badge badge-${log.patient.severity}`}>
                            {SEVERITY_LABEL[log.patient.severity] || log.patient.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', color: '#94a3b8' }}>{log.patient.origin_hospital}</td>
                        <td style={{ padding: '0.75rem 1.25rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatDate(log.patient.created_at)}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', color: col.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {calcWait(log.patient.created_at, log.patient.transfer_date || log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Rodapé da tabela com totalizador */}
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${col.border}`, background: 'rgba(0,0,0,0.15)' }}>
                      <td colSpan={2} style={{ padding: '0.65rem 1.25rem', fontWeight: 700, color: col.accent, fontSize: '0.85rem' }}>
                        Total: {logs.length} paciente{logs.length !== 1 ? 's' : ''}
                      </td>
                      <td colSpan={6} style={{ padding: '0.65rem 1.25rem', color: '#64748b', fontSize: '0.78rem', textAlign: 'right' }}>
                        Relatório gerado pela CIR-A — CENTRAL INTELIGENTE DE REGULAÇÃO AUTOMATIZADA
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )
      })}

      {/* CSS PARA IMPRESSÃO INDIVIDUAL */}
      <style>{`
        @media print {
          .print-header-global {
            display: block !important;
          }
          .private-hospital-section {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 2rem;
            page-break-inside: avoid;
          }
          .private-hospital-section table {
            font-size: 10px !important;
          }
          .private-hospital-section thead tr {
            background: #f1f5f9 !important;
          }
          .private-hospital-section th {
            color: #0f172a !important;
            background: #e2e8f0 !important;
            border: 1px solid #94a3b8 !important;
          }
          .private-hospital-section td {
            color: #1e293b !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
          }
          .private-hospital-section tfoot td {
            background: #f8fafc !important;
          }
        }
      `}</style>
    </div>
  )
}
