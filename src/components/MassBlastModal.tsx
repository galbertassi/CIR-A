'use client';

import React, { useState } from 'react';
import { sendMassBedRequest, getBedRequestWhatsAppUrl } from '../app/patients/communicationActions';
import { X, Send, MessageCircle, CheckCircle2 } from 'lucide-react';
import { PUBLIC_HOSPITALS, PRIVATE_HOSPITALS } from '@/lib/constants';

export default function MassBlastModal({
  patientId,
  severity,
  onClose,
  isPrivatePatient,
  initialSelectedUnits
}: {
  patientId: string,
  severity: string,
  onClose: () => void,
  isPrivatePatient?: boolean,
  initialSelectedUnits?: string[]
}) {
  const [selectedUnits, setSelectedUnits] = useState<string[]>(initialSelectedUnits || []);
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const canOfferToHNSG = severity !== 'CTI' && severity !== 'SALA_VERMELHA';

  const isTargeted = !!initialSelectedUnits && initialSelectedUnits.length > 0;

  const basePublic = PUBLIC_HOSPITALS.filter(u => {
    const low = u.toLowerCase();
    return low !== 'upa 24h' && !low.includes('regional') && !low.includes('upa');
  });
  const basePrivate = [...PRIVATE_HOSPITALS, 'Hospitais Privados (Geral)'];

  // Filter if targeted, otherwise show all relevant
  const publicUnitsToShow = isTargeted
    ? (initialSelectedUnits || []).filter(u => {
      const low = u.toLowerCase();
      return !basePrivate.includes(u) && low !== 'upa 24h' && !low.includes('regional') && !low.includes('upa');
    })
    : basePublic;

  const privateUnitsToShow = isTargeted
    ? (initialSelectedUnits || []).filter(u => basePrivate.includes(u))
    : basePrivate;

  const toggleUnit = (unit: string) => {
    setSelectedUnits(prev =>
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const toggleAllPublic = () => {
    const allSelected = publicUnitsToShow.every(u => selectedUnits.includes(u));
    if (allSelected) {
      setSelectedUnits(prev => prev.filter(u => !publicUnitsToShow.includes(u)));
    } else {
      setSelectedUnits(prev => Array.from(new Set([...prev, ...publicUnitsToShow])));
    }
  };

  const toggleAllPrivate = () => {
    const allSelected = privateUnitsToShow.every(u => selectedUnits.includes(u));
    if (allSelected) {
      setSelectedUnits(prev => prev.filter(u => !privateUnitsToShow.includes(u)));
    } else {
      setSelectedUnits(prev => Array.from(new Set([...prev, ...privateUnitsToShow])));
    }
  };

  async function handleSend() {
    if (selectedUnits.length === 0) {
      alert("Por favor, selecione pelo menos uma unidade para o disparo.");
      return;
    }
    setLoading(true);

    // Determine profile based on selection
    const hasPrivate = selectedUnits.some(u => basePrivate.includes(u));
    const hasPublic = selectedUnits.some(u => basePublic.includes(u));
    let profile: 'PUBLIC_ONLY' | 'PUBLIC_AND_PRIVATE' | 'PRIVATE_ONLY' = 'PUBLIC_ONLY';
    if (hasPrivate && hasPublic) profile = 'PUBLIC_AND_PRIVATE';
    else if (hasPrivate) profile = 'PRIVATE_ONLY';

    const res = await sendMassBedRequest(patientId, profile, severity, selectedUnits);
    setLoading(false);

    if (!res.success) {
      alert(res.error);
    } else {
      setIsSent(true);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('NIR_WEBHOOK_REPLY', { detail: `Temos retornos/respostas às vagas disparadas por e-mail há pouco!` }));
        }
      }, 15000);
    }
  }

  async function handleZap(hosp: string) {
    const url = await getBedRequestWhatsAppUrl(patientId, hosp);
    if (url) window.open(url, '_blank');
    else alert("Número de WhatsApp não encontrado para este NIR.");
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(7, 20, 38, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}>
      <div className="card" style={{ width: '520px', padding: '2.5rem', position: 'relative', animation: 'fadeInSlideUp 0.2s ease-out', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #e2e8f0', fontFamily: "'Inter', sans-serif", background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', borderRadius: '16px' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            color: '#64748b',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {!isSent ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                {isTargeted ? 'Notificação Direta' : 'Disparo de Vaga'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
                Unidades NIR que receberão a solicitação de <strong style={{ color: '#1e40af' }}>{severity}</strong>:
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REDE PÚBLICA (SUS)</span>
                {!isTargeted && (
                  <button onClick={toggleAllPublic} style={{ fontSize: '0.65rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>
                    Marcar/Desmarcar Todos
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {publicUnitsToShow.map(unit => {
                  const isHNSG = unit.includes('Nelson Gonçalves');
                  const disabled = isHNSG && !canOfferToHNSG;
                  const checked = selectedUnits.includes(unit);
                  return (
                    <label key={unit} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: checked ? '#eff6ff' : '#f8fafc',
                      borderRadius: '10px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`,
                      transition: 'all 0.15s',
                      opacity: disabled ? 0.5 : 1
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => !disabled && toggleUnit(unit)}
                        disabled={disabled}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1e40af' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: checked ? '#1e40af' : '#334155' }}>{unit}</span>
                        {isHNSG && !canOfferToHNSG && (
                          <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>⚠️ Restrito (Apenas Clínica)</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {privateUnitsToShow.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REDE PRIVADA</span>
                  {!isTargeted && (
                    <button onClick={toggleAllPrivate} style={{ fontSize: '0.65rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>
                      Marcar/Desmarcar Todos
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {privateUnitsToShow.map(unit => {
                    const checked = selectedUnits.includes(unit);
                    return (
                      <label key={unit} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: checked ? '#fffbeb' : '#f8fafc',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: `1px solid ${checked ? '#fde68a' : '#e2e8f0'}`,
                        transition: 'all 0.15s'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUnit(unit)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#d97706' }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: checked ? '#92400e' : '#334155' }}>{unit}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={loading || selectedUnits.length === 0}
                style={{
                  flex: 2,
                  padding: '1rem',
                  borderRadius: '12px',
                  background: selectedUnits.length === 0 ? '#e2e8f0' : '#1e3a8a',
                  color: selectedUnits.length === 0 ? '#94a3b8' : 'white',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: (loading || selectedUnits.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Disparar Solicitação
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: '#f0fdf4',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#16a34a',
              border: '2px solid #bbf7d0'
            }}>
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Sucesso!</h2>
            <p style={{ fontSize: '0.935rem', color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
              As solicitações foram enviadas para as unidades NIR selecionadas.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', maxHeight: '240px', overflowY: 'auto', marginBottom: '2rem' }}>
              {selectedUnits.map(hosp => (
                <div key={hosp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{hosp.replace('Hospital ', '').split(' (')[0]}</span>
                  <button
                    onClick={() => handleZap(hosp)}
                    style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700 }}
                  >
                    <MessageCircle size={14} /> Zap
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              Concluir e Voltar
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
