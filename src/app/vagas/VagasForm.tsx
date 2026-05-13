'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveBedAvailability } from './actions'

type Props = {
  hospitalName: string;
  initialData: {
    cti_masc: number
    cti_fem: number
    clinica_masc: number
    clinica_fem: number
    sem_vagas: boolean
  }
}

export default function VagasForm({ hospitalName, initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [semVagas, setSemVagas] = useState(initialData.sem_vagas);
  
  const [ctiMasc, setCtiMasc] = useState(initialData.cti_masc);
  const [ctiFem, setCtiFem] = useState(initialData.cti_fem);
  const [clinicaMasc, setClinicaMasc] = useState(initialData.clinica_masc);
  const [clinicaFem, setClinicaFem] = useState(initialData.clinica_fem);

  async function handleSave() {
    try {
      setLoading(true);
      const res = await saveBedAvailability(hospitalName, {
        cti_masc: semVagas ? 0 : ctiMasc,
        cti_fem: semVagas ? 0 : ctiFem,
        clinica_masc: semVagas ? 0 : clinicaMasc,
        clinica_fem: semVagas ? 0 : clinicaFem,
        sem_vagas: semVagas
      });
      
      if (!res.success) {
        alert('Erro: ' + res.error);
        return;
      }
      
      router.refresh();
      alert('Censo atualizado com sucesso!');
    } catch (e: any) {
      alert('Erro inesperado: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: '1rem 1.5rem', opacity: semVagas ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>{hospitalName}</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fca5a5', fontWeight: 700, background: 'rgba(239,68,68,0.12)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)' }}>
          <input 
            type="checkbox" 
            checked={semVagas} 
            onChange={(e) => setSemVagas(e.target.checked)} 
            style={{ width: '18px', height: '18px' }}
          />
          SEM VAGAS (Lotação Máxima)
        </label>
      </div>

      {!semVagas ? (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="label">CTI Masculino</label>
            <input type="number" min="0" className="input" value={ctiMasc} onChange={e => setCtiMasc(Number(e.target.value))} />
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="label">CTI Feminino</label>
            <input type="number" min="0" className="input" value={ctiFem} onChange={e => setCtiFem(Number(e.target.value))} />
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="label">Clínica Médica Masc</label>
            <input type="number" min="0" className="input" value={clinicaMasc} onChange={e => setClinicaMasc(Number(e.target.value))} />
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label className="label">Clínica Médica Fem</label>
            <input type="number" min="0" className="input" value={clinicaFem} onChange={e => setClinicaFem(Number(e.target.value))} />
          </div>

        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>Hospital sinalizado como sem leitos disponíveis hoje.</p>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Situação'}
        </button>
      </div>
    </div>
  )
}
