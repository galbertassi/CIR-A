'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, LayoutDashboard, ListTodo, Layers, CheckCircle, Building2, Users, Info, LogOut, User as UserIcon, Settings } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import NotificationBell from '@/components/NotificationBell'
import dynamic from 'next/dynamic'
import { NotificationProvider } from '@/context/NotificationContext'

const CirilaBotWidget = dynamic(() => import('@/components/CirilaBotWidget'), {
  ssr: false,
  loading: () => null
})

const CallCirilaButton = dynamic(() => import('@/components/CallCirilaButton'), {
  ssr: false,
  loading: () => null
})

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'ADMINISTRATIVO' | 'ENFERMEIRO_AUDITOR' | 'REGULADOR'
  canCancelPatient: boolean
  canPrintReports: boolean
}

export default function LayoutClientWrapper({ children, user }: { children: React.ReactNode, user: User | null }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  if (isLoginPage) return <>{children}</>

  return (
    <NotificationProvider>
      <div className="min-h-screen flex flex-col">
        
        {!isLoginPage && (
          <button 
            className="mobile-toggle"
            onClick={toggleMobileMenu}
            aria-label="Abrir Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        <div className="flex flex-1 pt-0">
          <aside className={`sidebar-main ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="flex justify-center items-center mb-6 mt-4 px-4">
              <div className="relative w-[120px] h-[60px]">
                <Image
                  src="/logo.png"
                  alt="Logo CIR-A"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <div className="mx-0 my-6 h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,216,255,0.15)] to-transparent" />

            <nav className="flex flex-col gap-1">
              <Link href="/" className={`sidebar-link ${pathname === '/' ? 'sidebar-active' : ''}`}>
                <LayoutDashboard size={20} className={pathname === '/' ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Painel Geral</span>
              </Link>
              <Link href="/patients" className={`sidebar-link ${pathname.startsWith('/patients') ? 'sidebar-active' : ''}`}>
                <ListTodo size={20} className={pathname.startsWith('/patients') ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Fila de Pacientes</span>
              </Link>
              <Link href="/vagas" className={`sidebar-link ${pathname === '/vagas' ? 'sidebar-active' : ''}`}>
                <Layers size={20} className={pathname === '/vagas' ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Censo de Leitos</span>
              </Link>
              <Link href="/transferidos" className={`sidebar-link ${pathname === '/transferidos' ? 'sidebar-active' : ''}`}>
                <CheckCircle size={20} className={pathname === '/transferidos' ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Transferidos</span>
              </Link>
              <Link href="/relatorio-privados" className={`sidebar-link ${pathname === '/relatorio-privados' ? 'sidebar-active' : ''}`}>
                <Building2 size={20} className={pathname === '/relatorio-privados' ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Hosp. Privados</span>
              </Link>
              <Link href="/pacientes" className={`sidebar-link ${pathname === '/pacientes' ? 'sidebar-active' : ''}`}>
                <Users size={20} className={pathname === '/pacientes' ? 'text-[#00d8ff]' : 'text-[#00b4d8]'} />
                <span>Prontuário Geral</span>
              </Link>
              <div className="mt-4 mb-2 px-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Administração</span>
              </div>

            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center opacity-80 ${
                    user?.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/15 text-cyan-400'
                  }`}>
                    <UserIcon size={18} />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis font-outfit">
                        {user?.name || user?.email?.split('@')[0] || 'Acesso'}
                      </span>
                      <span className="text-[9px] color-[#94a3b8] font-semibold uppercase tracking-wider font-outfit">
                        {user?.role || 'Acesso Automatizado'}
                      </span>
                    </div>
                  )}
                </div>

                {user?.role === 'ADMIN' ? (
                  <Link href="/admin/users" className="flex items-center justify-center gap-2 p-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20 transition-all hover:bg-indigo-500/20">
                    <Settings size={12} /> {!isSidebarCollapsed && 'Gestão Admin'}
                  </Link>
                ) : (
                  user && !user.canCancelPatient && !isSidebarCollapsed && (
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 bg-white/5 p-1 px-2 rounded-md font-semibold uppercase tracking-tighter">
                      OPERADOR PADRÃO
                    </div>
                  )
                )}

                <button 
                  onClick={() => logout()}
                  className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-bold p-2 rounded-xl cursor-pointer transition-all hover:bg-red-500/20"
                >
                  <LogOut size={12} /> {!isSidebarCollapsed && 'Sair'}
                </button>
              </div>

              <Link 
                href="/sobre" 
                className={`sidebar-link ${pathname === '/sobre' ? 'sidebar-active' : ''} bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 transition-all !mb-4`}
              >
                <Info size={20} className="text-[#00b4d8]" />
                {!isSidebarCollapsed && <span>Sobre o Sistema</span>}
              </Link>
              
              <div className="my-1 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

              <div className="p-2 flex flex-col gap-1 text-center">
                <div className="text-[9px] text-slate-500 font-bold opacity-60 letter-spacing-[0.5px]">
                  SMSVR • CIR-A • v1.5
                </div>
                <a 
                  href="https://www.instagram.com/gabriel.albertassi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan-400 font-extrabold opacity-80 hover:opacity-100 transition-opacity"
                >
                  Desenvolvido por Gabriel Albertassi
                </a>
              </div>
            </div>
          </aside>

          <main className="main-viewport relative">
            <header className="flex justify-end items-center px-8 py-4 bg-[#071426] sticky top-0 z-50 border-b border-white/5">
              <NotificationBell />
            </header>

            <div className="px-8 pb-8">
              {children}
            </div>

            <footer className="mt-auto p-8 flex flex-col gap-4 border-t border-white/5 items-center text-center bg-slate-900/40">
              <div className="relative w-[120px] h-[36px] opacity-40">
                <Image src="/logo.png" alt="Logo CIR-A" fill className="object-contain grayscale brightness-200" />
              </div>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-[2px]">
                SMSVR • SECRETARIA MUNICIPAL DE SAÚDE • VOLTA REDONDA
              </div>
            </footer>
          </main>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {!isLoginPage && (
          <>
            <CirilaBotWidget />
            <CallCirilaButton />
          </>
        )}
      </div>
    </NotificationProvider>
  )
}
