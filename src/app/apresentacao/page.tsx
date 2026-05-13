'use client'

import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, ShieldCheck, Activity, Layers, ActivitySquare, HeartPulse, Download } from 'lucide-react'

export default function ApresentacaoCIRA() {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  const nextSlide = () => setSlide(s => Math.min(s + 1, 5))
  const prevSlide = () => setSlide(s => Math.max(s - 1, 0))

  const handlePrint = () => {
    window.print();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          html, body {
            background-color: #020617 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .presentation-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            background: #020617 !important;
          }
          .slides-area {
            display: block !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #020617 !important;
          }
          .slide-wrapper {
            display: flex !important;
            width: 100vw !important;
            height: 100vh !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
            box-sizing: border-box !important;
            padding: 2rem !important;
            break-after: page !important;
            background: #020617 !important;
          }
          /* Garante que imagens de fundo fiquem ok */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}} />

      <div className="presentation-container" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#020617', // Slate 950
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        
        {/* HEADER DA APRESENTAÇÃO */}
        <div className="no-print" style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo.png" alt="CIR-A Logo" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px' }}>APRESENTAÇÃO EXECUTIVA</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            
            {/* BOTÃO BAIXAR PDF */}
            <button 
              onClick={handlePrint}
              style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginRight: '1rem' }}
            >
              <Download size={18} />
              Baixar em PDF
            </button>

            <button onClick={prevSlide} disabled={slide === 0} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: slide === 0 ? 'not-allowed' : 'pointer', opacity: slide === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={24} />
            </button>
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{slide + 1} / 6</span>
            <button onClick={nextSlide} disabled={slide === 5} style={{ background: '#2563eb', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: slide === 5 ? 'not-allowed' : 'pointer', opacity: slide === 5 ? 0.3 : 1 }}>
              <ChevronRight size={24} />
            </button>
            <a href="/" style={{ marginLeft: '2rem', color: '#ef4444', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>FECHAR X</a>
          </div>
        </div>

        {/* ÁREA DOS SLIDES */}
        <div className="slides-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
          
          {/* SLIDE 1: Capa */}
          <div className="slide-wrapper" style={{ display: slide === 0 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '900px' }}>
              <div style={{ display: 'inline-flex', padding: '10px 20px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '30px', fontWeight: 700, marginBottom: '2rem', gap: '10px', alignItems: 'center' }}>
                <HeartPulse size={20} /> Secretaria Municipal de Saúde de Volta Redonda
              </div>
              <h1 style={{ fontSize: '4.5rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-2px', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CIR-A
              </h1>
              <h2 style={{ fontSize: '2rem', fontWeight: 400, color: '#cbd5e1', marginBottom: '3rem' }}>
                Central Inteligente de Regulação Automatizada
              </h2>
              <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto' }}>
                Revolucionando e humanizando a coordenação do fluxo assistencial e de leitos através de dados em tempo real e inteligência artificial.
              </p>
            </div>
          </div>

          {/* SLIDE 2: Problema */}
          <div className="slide-wrapper" style={{ display: slide === 1 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', maxWidth: '1200px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>O Desafio do Passado</h2>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem', lineHeight: 1.2 }}>Um modelo fragmentado e reativo.</h1>
                <p style={{ fontSize: '1.2rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                  No modelo interior, a regulação em saúde dependia essencialmente de <strong>telefonemas, papéis e planilhas desconexas</strong>.
                </p>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '1.5rem', borderRadius: '0 12px 12px 0' }}>
                  <p style={{ fontSize: '1.1rem', color: '#fca5a5', margin: 0, lineHeight: 1.6 }}>
                    A comunicação atrasada entre as pontas hospitalares gera desgaste para a regulação, atrasos na transferência de pacientes críticos e total falta de previsibilidade sistêmica.
                  </p>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: '400px', position: 'relative', background: 'radial-gradient(circle, rgba(15,23,42,1) 0%, rgba(2,6,23,1) 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <img src="/cira_dashboard_slide.png" alt="Concept CIR-A" style={{ width: '100%', height: '100%', minHeight: '400px', objectFit: 'cover', borderRadius: '24px', opacity: 0.5, mixBlendMode: 'luminosity' }} />
                 <div style={{ position: 'absolute', fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', background: 'rgba(0,0,0,0.8)', padding: '1rem 2rem', borderRadius: '50px' }}>Tempo = Vidas</div>
              </div>
            </div>
          </div>

          {/* SLIDE 3: Solução (Torre de Controle) */}
          <div className="slide-wrapper" style={{ display: slide === 2 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '1000px', width: '100%', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>A Solução</h2>
              <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '3rem', lineHeight: 1.2 }}>Visibilidade Completa e Integrada</h1>
              
              <p style={{ fontSize: '1.2rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: '3rem', maxWidth: '800px' }}>
                A CIR-A atua como uma <strong>"Torre de Controle" digital</strong>, interligando a comunicação de todos os pontos de cuidado de Volta Redonda em um único painel.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', width: '100%' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#38bdf8', marginBottom: '1rem' }}>Ponto de Origem</h3>
                  <p style={{ color: '#94a3b8' }}>UPAs e Prontos-Socorros inserem a demanda instantaneamente.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#38bdf8', marginBottom: '1rem' }}>Rede Pública</h3>
                  <p style={{ color: '#94a3b8' }}>Hospitais municipais integrados compartilhando seu censo ativo.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#38bdf8', marginBottom: '1rem' }}>Rede Conveniada</h3>
                  <p style={{ color: '#94a3b8' }}>Hospitais Privados integrados à mesma base de regulação.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 4: Tour pelo Sistema */}
          <div className="slide-wrapper" style={{ display: slide === 3 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#8b5cf6', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Em Prática</h2>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>O Sistema em Ação</h1>
              </div>
              
              <div style={{ width: '100%', minHeight: '400px', flex: 1, position: 'relative', background: '#0f172a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src="/cira_system_tour.webp" 
                  alt="Tour WebP" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '600px' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div style={{ position: 'absolute', bottom: '10%', background: 'rgba(0,0,0,0.7)', padding: '1rem 2rem', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: '2rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ActivitySquare color="#10b981" /> Painel Analytics</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers color="#3b82f6" /> Fila Preditiva</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck color="#8b5cf6" /> Histórico Intocável</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 5: Cirila IA */}
          <div className="slide-wrapper" style={{ display: slide === 4 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', maxWidth: '1200px', width: '100%' }}>
              <div style={{ flex: 1, minHeight: '500px', background: '#0f172a', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <img src="/cira_ai_slide.png" alt="Cirila AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>Inovação</h2>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem', lineHeight: 1.2 }}>Assistente "Cirila" IA</h1>
                <p style={{ fontSize: '1.15rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                  A grande revolução acontece nos bastidores. A equipe tem à sua disposição uma Inteligência Artificial nativa integrada diretamente na fila.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ color: '#f59e0b' }}>🤖</div>
                    <div><strong>Automação de Tarefas</strong><br/><span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Elimina a necessidade de controle contínuo manual.</span></div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ color: '#f59e0b' }}>📊</div>
                    <div><strong>Processamento de Indicadores</strong><br/><span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Analisa o tempo de espera e gravidade instantaneamente.</span></div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SLIDE 6: Conclusão */}
          <div className="slide-wrapper" style={{ display: slide === 5 ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%', textAlign: 'center' }}>
              <div style={{ marginBottom: '2rem' }}>
                <HeartPulse size={64} color="#38bdf8" />
              </div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '2rem', lineHeight: 1.1 }}>Qualidade e Respeito no Atendimento</h1>
              
              <p style={{ fontSize: '1.3rem', color: '#e2e8f0', lineHeight: 1.8, marginBottom: '3rem' }}>
                Com a CIR-A, a Secretaria de Saúde passa a operar de forma <strong>unificada e puramente orientada a dados</strong>. O foco principal não é a tecnologia, mas as vidas que ela acelera salvar.
              </p>

              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                 <div style={{ padding: '1rem 2rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '30px', fontWeight: 700, fontSize: '1.1rem' }}>Mais Agilidade</div>
                 <div style={{ padding: '1rem 2rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '30px', fontWeight: 700, fontSize: '1.1rem' }}>Término do Desperdício</div>
                 <div style={{ padding: '1rem 2rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '30px', fontWeight: 700, fontSize: '1.1rem' }}>Segurança Jurídica</div>
              </div>

              <div style={{ marginTop: '5rem', fontSize: '1rem', color: '#64748b' }}>
                Fim da Apresentação. O futuro da Regulação em Volta Redonda chegou.
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
