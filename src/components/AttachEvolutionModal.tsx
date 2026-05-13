'use client';

import React, { useState } from 'react';
import { X, Paperclip, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { updatePatientEvolution } from '../app/patients/actions';

interface AttachEvolutionModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

export default function AttachEvolutionModal({ patientId, patientName, onClose }: AttachEvolutionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // VALIDAÇÃO PREVENTIVA (Limite Vercel: 4.5MB)
      const MAX_SIZE = 4.5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O limite é de 4.5MB.`);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);

      // 1. UPLOAD VIA API ROUTE (ESTÁVEL)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // EVITA O ERRO DE RESPOSTA INESPERADA
      if (!response.ok) {
        let errorMessage = `Erro no servidor (${response.status})`;
        try {
          const errorData = await response.json();
          // Prioriza a mensagem de erro específica do backend
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details && typeof errorData.details === 'string') {
              console.error('[UPLOAD_DETAIL]', errorData.details);
            }
          }
        } catch (e) {
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText.substring(0, 100);
          } catch (e2) {}
        }
        
        throw new Error(errorMessage);
      }

      // PROTEÇÃO EXTRA: GARANTE QUE É JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('O servidor retornou uma resposta inválida (HTML).');
      }

      const uploadResult = await response.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Falha ao processar arquivo.');
      }

      // 2. ATUALIZAÇÃO NO BANCO VIA SERVER ACTION (LEVE)
      const dbResult = await updatePatientEvolution(patientId, uploadResult.url, uploadResult.fileName);

      if (dbResult.success) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        throw new Error(dbResult.error || 'Erro ao vincular arquivo ao paciente.');
      }

    } catch (err: any) {
      console.error('[ATTACH_ERROR]', err);
      setError(err.message || 'Falha na conexão com o servidor.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(20px)', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '320px', maxWidth: '90vw', background: 'rgba(15, 23, 42, 1)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '2rem', boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 1), 0 0 60px rgba(56, 189, 248, 0.1)', borderRadius: '24px', position: 'relative', animation: 'fadeInSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            cursor: 'pointer', 
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', color: '#f1f5f9' }}>
            <Paperclip size={20} color="#60a5fa" />
            Anexar Evolução
          </h3>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Paciente</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.5rem' }}>{patientName}</div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ color: '#f1f5f9', margin: '0 0 0.5rem 0' }}>Anexo enviado com sucesso!</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>O histórico do paciente foi atualizado.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div 
              style={{ padding: '2rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: file ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {file ? (
                <div style={{ color: '#60a5fa', fontWeight: 700 }}>
                  <Upload size={32} style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '0.9rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Clique para trocar o arquivo</div>
                </div>
              ) : (
                <div style={{ color: '#94a3b8' }}>
                  <Upload size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>Selecionar Documento</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>PDF, Laudos ou Imagens</div>
                </div>
              )}
              <input 
                id="file-input" 
                type="file" 
                hidden 
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{ background: !file || uploading ? '#1e293b' : 'linear-gradient(90deg, #2563eb, #3b82f6)', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: !file || uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
              {uploading ? 'Enviando documento...' : 'Anexar ao Prontuário'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
