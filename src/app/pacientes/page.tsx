import { prisma } from '../../lib/db'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/sb-server'
import DeletePatientButton from '@/components/DeletePatientButton'
import ReturnAction from './ReturnAction'

export const dynamic = 'force-dynamic'

export default async function PacientesTodosPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let isAdmin = false
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      isAdmin = dbUser?.role === 'ADMIN'
    }

    const patients = await prisma.patient.findMany({
      orderBy: {
        created_at: 'desc'
      },
      include: {
        logs: {
          where: { action: { in: ['CANCEL', 'REGISTER', 'TRANSFER'] } },
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

  return (
    <>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Todos os Pacientes
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Listagem geral de todos os cadastros ativos, transferidos e cancelados.
            </p>
          </div>
          <Link href="/patients/new" className="btn btn-primary">
            + Cadastrar Novo
          </Link>
        </div>

        <div className="card" style={{ padding: '0', backgroundColor: 'var(--surface)' }}>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              
              <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Gravidade</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status Atual</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Data do Cadastro</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Saída / Evento</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                ) : null}

                {patients.map((p, idx) => {
                  const lastLog = p.logs && p.logs.length > 0 ? p.logs[0] : null;

                  return (
                    <tr key={p.id} style={{ 
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--surface-hover)' 
                    }}>
                      
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#e2e8f0' }}>{p.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {p.diagnosis}
                        </div>
                      </td>

                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span className={`badge badge-${p.severity}`}>
                          {p.severity.replace('_', ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        {p.status === 'WAITING' && <span className="badge-status WAITING">Aguardando</span>}
                        {p.status === 'OFFERED' && <span className="badge-status OFFERED">Em Solicitação</span>}
                        {p.status === 'TRANSFERRED' && <span className="badge-status TRANSFERRED">Transferido</span>}
                        {p.status === 'ALTA' && <span className="badge-status ALTA" style={{ background: '#dcfce7', color: '#16a34a' }}>Alta Médica</span>}
                        {p.status === 'FALECIMENTO' && <span className="badge-status FALECIMENTO" style={{ background: '#f1f5f9', color: '#475569' }}>Óbito</span>}
                        {p.status === 'CANCELLED' && <span className="badge-status CANCELLED">Cancelado</span>}
                      </td>

                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(p.created_at).toLocaleDateString('pt-BR')} <br />
                        <small>{new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>

                      <td style={{ padding: '1.25rem 1.5rem', maxWidth: '300px' }}>
                        {p.status === 'CANCELLED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#fca5a5',
                              background: 'rgba(239,68,68,0.12)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              marginBottom: '4px'
                            }}>
                              📋 Saída Cancelada
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                              {lastLog?.details || 'Motivo não registrado'}
                            </div>
                          </div>
                        ) : p.status === 'TRANSFERRED' || p.status === 'ALTA' || p.status === 'FALECIMENTO' ? (
                          <div style={{ fontSize: '0.85rem', color: '#6ee7b7', fontWeight: 600 }}>
                            {p.status === 'TRANSFERRED' ? '✅ Transferido' : p.status === 'ALTA' ? '🏠 Alta' : '✝️ Óbito'}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Em Regulação Ativa</span>
                        )}
                      </td>

                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
                          <ReturnAction patientId={p.id} currentStatus={p.status} />
                          {isAdmin && (
                            <DeletePatientButton patientId={p.id} patientName={p.name} />
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
    );
  } catch (error) {
    console.error('[PACIENTES_PAGE_ERROR]', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444' }}>Erro ao carregar pacientes</h1>
        <p style={{ color: '#94a3b8' }}>Por favor, recarregue a página ou verifique sua conexão.</p>
      </div>
    );
  }
}
