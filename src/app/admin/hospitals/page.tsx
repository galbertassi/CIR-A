'use client'

import { useEffect, useState } from 'react'
import { getAllHospitals, upsertHospitalAction, deleteHospitalAction } from './actions'
import { Building2, Mail, Phone, Plus, Edit2, Trash2, Save, X, Loader2, ShieldCheck, Stethoscope, AlertCircle } from 'lucide-react'

export default function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // States para o formulário
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    whatsapp: '',
    type: 'PUBLICO',
    accepts_cti: false,
    accepts_clinica: true
  })

  useEffect(() => {
    fetchHospitals()
  }, [])

  async function fetchHospitals() {
    setLoading(true)
    const res = await getAllHospitals()
    if (res.success) {
      setHospitals(res.data || [])
    } else {
      console.error(res.error)
    }
    setLoading(false)
  }

  function handleEdit(hospital: any) {
    setFormData({
      id: hospital.id,
      name: hospital.name,
      email: hospital.email || '',
      whatsapp: hospital.whatsapp || '',
      type: hospital.type,
      accepts_cti: hospital.accepts_cti,
      accepts_clinica: hospital.accepts_clinica
    })
    setEditingId(hospital.id)
    setIsAdding(false)
  }

  function handleAdd() {
    setFormData({
      id: '',
      name: '',
      email: '',
      whatsapp: '',
      type: 'PUBLICO',
      accepts_cti: false,
      accepts_clinica: true
    })
    setIsAdding(true)
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const data = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) data.append(key, 'on')
      } else {
        data.append(key, value as string)
      }
    })

    const res = await upsertHospitalAction(data)
    if (res.success) {
      setEditingId(null)
      setIsAdding(false)
      await fetchHospitals()
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deseja realmente remover o hospital "${name}" da rede de contatos?`)) return
    setLoading(true)
    const res = await deleteHospitalAction(id)
    if (res.success) await fetchHospitals()
    else {
      alert(res.error)
      setLoading(false)
    }
  }

  if (loading && hospitals.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="#00d8ff" />
    </div>
  )

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.4rem', color: '#f1f5f9' }}>
            Gestão de <span style={{ color: '#00d8ff' }}>Hospitais</span>
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Cadastre os e-mails e contatos dos NIRs para disparos automáticos.
          </p>
        </div>

        <button 
          onClick={handleAdd}
          className="btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '0.8rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 700,
            background: '#00d8ff',
            color: '#020617',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} /> Novo Hospital
        </button>
      </div>

      {/* FORMULARIO DE EDIÇÃO / ADIÇÃO */}
      {(isAdding || editingId) && (
        <div className="card animate-scale-up" style={{ border: '1px solid rgba(0, 216, 255, 0.3)', background: 'rgba(0, 216, 255, 0.03)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Nome da Unidade</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Hospital Municipal Munir Rafful"
                required
                className="input-base"
                style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '10px', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>E-mail do NIR</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="nir.hospital@email.com"
                className="input-base"
                style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '10px', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>WhatsApp (NIA)</label>
              <input 
                type="text" 
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                placeholder="24999999999"
                className="input-base"
                style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '10px', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tipo de Rede</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '10px', color: 'white' }}
              >
                <option value="PUBLICO">Rede Pública</option>
                <option value="PRIVADO/CONTRATADO">Privado / Contratado</option>
              </select>
            </div>

            {/* CAPABILITIES */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formData.accepts_clinica} onChange={(e) => setFormData({...formData, accepts_clinica: e.target.checked})} />
                Aceita Clínica Médica
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={formData.accepts_cti} onChange={(e) => setFormData({...formData, accepts_cti: e.target.checked})} />
                Aceita CTI
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Salvar
              </button>
              <button 
                type="button" 
                onClick={() => { setEditingId(null); setIsAdding(false); }}
                style={{ padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', flex: 0.5 }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Hospital</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Contatos NIR/NIA</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Rede</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Perfis Atendidos</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Nenhum hospital cadastrado.</td>
              </tr>
            ) : (
              hospitals.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,216,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d8ff' }}>
                        <Building2 size={20} />
                      </div>
                      <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{h.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: h.email ? '#e2e8f0' : '#64748b' }}>
                        <Mail size={14} color="#00d8ff" /> {h.email || 'E-mail não cadastrado'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: h.whatsapp ? '#e2e8f0' : '#64748b' }}>
                        <Phone size={14} color="#10b981" /> {h.whatsapp || 'WhatsApp não cadastrado'}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      padding: '0.3rem 0.6rem', 
                      borderRadius: '6px',
                      background: h.type === 'PUBLICO' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                      color: h.type === 'PUBLICO' ? '#60a5fa' : '#c084fc',
                      textTransform: 'uppercase'
                    }}>
                      {h.type}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {h.accepts_clinica && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                          <Stethoscope size={12} /> Clínica
                        </span>
                      )}
                      {h.accepts_cti && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                          <ShieldCheck size={12} /> CTI/Sala Vermelha
                        </span>
                      )}
                      {!h.accepts_clinica && !h.accepts_cti && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nenhum perfil</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(h)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(h.id, h.name)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>

    {/* ALERT TIP */}
    <div style={{ display: 'flex', gap: '1rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1.25rem', borderRadius: '16px', color: '#fbbf24' }}>
      <AlertCircle size={24} />
      <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
        <strong>Dica para Disparos:</strong> A Cirila usará estes dados para enviar as solicitações de vaga. Garanta que o e-mail do NIR esteja correto para que as unidades recebam os pacientes regulados em tempo real.
      </div>
    </div>

    <style jsx>{`
      .input-base:focus {
        border-color: #00d8ff !important;
        box-shadow: 0 0 0 2px rgba(0, 216, 255, 0.2);
        outline: none;
      }
      .animate-scale-up {
        animation: scaleUp 0.3s ease-out;
      }
      @keyframes scaleUp {
        from { transform: scale(0.98); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `}</style>

    </div>
  )
}
