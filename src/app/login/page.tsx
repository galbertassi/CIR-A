'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, ShieldCheck, Brain, Zap, HeartPulse, ArrowRight, UserPlus, LogIn, Mail, Lock, User } from 'lucide-react'
import { login, signup } from '../auth/actions'
import CirilaAvatar from '@/components/CirilaAvatar'
import Image from 'next/image'
import styles from './login.module.css'

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'confirmed') {
      setMsg('E-mail confirmado com sucesso! Agora você pode acessar o sistema.')
    }
    const err = searchParams.get('error')
    if (err) {
      // Se for uma mensagem codificada vindo do roteador, mostramos ela.
      // Caso contrário, usamos a mensagem padrão.
      const decodedErr = decodeURIComponent(err)
      setError(decodedErr === 'auth_callback_failed' ? 'Houve um problema na autenticação. O link pode ter expirado.' : decodedErr)
    }
  }, [searchParams])

  // --- LÓGICA DE "VIDA" DA CIRILA ---
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [expression, setExpression] = useState<'neutral' | 'smiling' | 'thinking' | 'alert'>('neutral')
  const [isTyping, setIsTyping] = useState(false)

  const phrases = useMemo(() => [
    "Olá! Sou a Cirila, sua assistente Jarvis para saúde.",
    "Bom trabalho, Gabriel! Vamos regular o sistema hoje?",
    "Monitorando a rede municipal... Tudo pronto para começar!",
    "Desejo a você um excelente turno de trabalho!",
    "A tecnologia a serviço da vida. Conte sempre comigo.",
    "Foco total na eficiência! Pronto para processar dados."
  ], [])

  // Efeito para rotacionar frases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length)
    }, 9000)
    return () => clearInterval(interval)
  }, [phrases.length])

  // Efeito de Typewriter
  useEffect(() => {
    let charIndex = 0
    setIsTyping(true)
    setDisplayedText('')

    const typeInterval = setInterval(() => {
      if (charIndex < phrases[phraseIndex].length) {
        setDisplayedText(phrases[phraseIndex].substring(0, charIndex + 1))
        charIndex++
      } else {
        setIsTyping(false)
        clearInterval(typeInterval)
      }
    }, 40)

    return () => clearInterval(typeInterval)
  }, [phraseIndex, phrases])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMsg(null)
    setExpression('thinking')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    try {
      if (isLogin) {
        console.log(`[Login] Tentativa iniciada para: ${email}`);
        const res = await login(formData)
        console.log("[Login] Resposta recebida da Action:", res);
        
        if (res && !res.success) {
          console.error("[Login] Falha no login:", res.error);
          setError(res.error || "Erro ao fazer login.")
          setExpression('alert')
          setLoading(false)
          setTimeout(() => setExpression('neutral'), 5000)
        } else if (!res) {
          // Se não houver retorno, pode ser que o redirect tenha acontecido (embora em actions async devamos ter retorno ou erro)
          console.log("[Login] Sem retorno direto da Action (possível redirecionamento em curso)");
        }
      } else {
        console.log(`[Signup] Criando conta para: ${email}`);
        const res = await signup(formData)
        console.log("[Signup] Resposta recebida:", res);
        
        if (res && !res.success) {
          setError(res.error || "Erro ao criar conta.")
          setExpression('alert')
        } else {
          setMsg('Conta criada com sucesso! Verifique seu e-mail para confirmar o acesso.')
          setExpression('smiling')
        }
        setLoading(false)
        setTimeout(() => setExpression('neutral'), 5000)
      }
    } catch (err) {
      console.error("[Auth] Erro capturado no handleSubmit:", err)
      setError("Ocorreu um erro inesperado na comunicação com o servidor.")
      setExpression('alert')
      setLoading(false)
      setTimeout(() => setExpression('neutral'), 5000)
    }
  }

  return (
    <div className={styles.loginRoot}>
      {/* ── CAMADA DE FUNDO OTIMIZADA ── */}
      <div className={styles.loginBgLayer}>
        <div className={styles.loginBgPhoto} />
        <div className={styles.loginBgOverlay} />
        <div className={styles.loginBgNetwork} />
        <div className={styles.loginBgHex} />
      </div>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className={styles.loginContent}>

        {/* === COLUNA ESQUERDA — BRANDING === */}
        <div className={styles.loginLeft}>
          <div className={styles.loginLeftInner}>

            {/* Bloco de Marca (Logo + Título) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className={`logo-container-glow ${styles.loginLogoWrapper}`}>
                <Image
                  src="/logo.png"
                  alt="CIR-A Logo"
                  width={100}
                  height={100}
                  priority
                  className={styles.loginLogo}
                  style={{
                    width: '100px',
                    height: 'auto',
                    filter: 'drop-shadow(0 0 20px rgba(0,216,255,0.4))'
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h1 className={styles.loginTitle}>
                  CENTRAL INTELIGENTE DE <br />
                  <span className={styles.loginTitleAccent}>REGULAÇÃO AUTOMATIZADA</span>
                </h1>
                <p className={styles.loginSubtitle}>
                  Tecnologia de última geração a serviço da saúde pública de Volta Redonda.
                </p>
              </div>
            </div>

            {/* FORMULÁRIO DE ACESSO */}
            <div className={styles.loginFormContainer}>
              <div className={styles.formToggleTabs}>
                <button
                  className={`${styles.tabBtn} ${isLogin ? styles.tabBtnActive : ''}`}
                  onClick={() => { setIsLogin(true); setError(null); setMsg(null); }}
                >
                  <LogIn size={18} /> Entrar
                </button>
                <button
                  className={`${styles.tabBtn} ${!isLogin ? styles.tabBtnActive : ''}`}
                  onClick={() => { setIsLogin(false); setError(null); setMsg(null); }}
                >
                  <UserPlus size={18} /> Criar Conta
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.loginActualForm}>
                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label><User size={16} /> Nome Completo</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ex: Dr. João Silva"
                      required
                      onFocus={() => setExpression('thinking')}
                      onBlur={() => setExpression('neutral')}
                    />
                  </div>
                )}
                <div className={styles.inputGroup}>
                  <label>
                    <Mail size={16} /> E-mail Institucional
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="nome@voltaredonda.rj.gov.br"
                    required
                    onFocus={() => setExpression('thinking')}
                    onBlur={() => setExpression('neutral')}
                  />
                </div>

                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label>
                      <Mail size={16} /> Confirmar E-mail
                    </label>
                    <input
                      type="email"
                      name="confirmEmail"
                      placeholder="Confirme seu e-mail institucional"
                      required
                      onFocus={() => setExpression('thinking')}
                      onBlur={() => setExpression('neutral')}
                    />
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label>
                    <Lock size={16} /> Senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    onFocus={() => setExpression('thinking')}
                    onBlur={() => setExpression('neutral')}
                  />
                  {isLogin && (
                    <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                      <a
                        href="/auth/forgot-password"
                        style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseOver={(e) => (e.currentTarget.style.color = '#00d8ff')}
                        onMouseOut={(e) => (e.currentTarget.style.color = '#64748b')}
                      >
                        Esqueci minha senha
                      </a>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label>
                      <Lock size={16} /> Confirmar Senha
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirme sua senha"
                      required
                      onFocus={() => setExpression('thinking')}
                      onBlur={() => setExpression('neutral')}
                    />
                  </div>
                )}

                {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
                {msg && <div style={{ color: '#10b981', fontSize: '0.85rem', textAlign: 'center' }}>{msg}</div>}

                <button
                  type="submit"
                  className={styles.loginSubmitBtn}
                  disabled={loading}
                >
                  {loading ? 'Processando...' : (isLogin ? 'Acessar o Sistema' : 'Confirmar Acesso')}
                  <ArrowRight size={18} />
                </button>
              </form>

              <p className={styles.formHelpText}>
                {isLogin
                  ? 'Utilize suas credenciais institucionais para acessar o painel.'
                  : 'Preencha os dados acima para criar sua conta de operador.'}
              </p>
            </div>

            {/* Rodapé — Créditos agrupados na base */}
            <footer className={styles.loginFooter}>
              <span style={{ whiteSpace: 'nowrap' }}>SMSVR • Volta Redonda • Versão 1.5 Premium</span>
              <a
                href="https://www.instagram.com/gabriel.albertassi"
                target="_blank"
                rel="noopener noreferrer"
              >
                Desenvolvido por Gabriel Albertassi
              </a>
            </footer>
          </div>
        </div>
        
        {/* === COLUNA DIREITA — CIRILA HERO === */}
        <div className={styles.loginRight}>
          <div className={styles.loginRightContainer}>
            <div className={`${styles.loginHolo} ${styles.holo3}`}>
              <span className={`${styles.holoDot} ${styles.holoDotGreen}`} />
              <span>I.A Online</span>
            </div>
            <div className={`${styles.loginHolo} ${styles.holo4}`}><Brain size={14} /><span>Cirila Ativa</span></div>
            <div className={`${styles.loginHolo} ${styles.holo5}`}><Sparkles size={14} /><span>Conte sempre comigo</span></div>
            <div className={`${styles.loginHolo} ${styles.holo6}`}><HeartPulse size={14} /><span>Sempre pronta para te ajudar</span></div>

            <CirilaAvatar
              expression={expression}
              size="550px"
              className={`${styles.loginAvatar} ${expression}`}
            />

            <div
              className={`${styles.loginCirilaSpeech} ${isTyping ? styles.typingIcon : ''}`}
            >
              <Image
                src="/cirila_3D_icon.png"
                alt="ícone Cirila"
                width={36}
                height={36}
                style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,216,255,0.4)' }}
              />
              <div>
                <strong>Olá! Sou a Cirila.</strong>
                <span>{displayedText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
