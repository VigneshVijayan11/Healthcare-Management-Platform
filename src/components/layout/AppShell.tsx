'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, FileText, LogOut, Menu, X,
  Stethoscope, ClipboardList, Activity, Bot, Receipt
} from 'lucide-react'

const roleLinks = {
  admin: [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Doctors', href: '/admin/doctors', icon: Stethoscope },
    { name: 'Patients', href: '/admin/patients', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: Activity },
  ],
  doctor: [
    { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
    { name: 'Appointments', href: '/doctor/appointments', icon: Calendar },
    { name: 'Prescriptions', href: '/doctor/prescriptions', icon: FileText },
  ],
  receptionist: [
    { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
    { name: 'Appointments', href: '/receptionist/appointments', icon: Calendar },
    { name: 'Billing', href: '/receptionist/billing', icon: Receipt },
  ],
  patient: [
    { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { name: 'Book Appointment', href: '/patient/appointments', icon: Calendar },
    { name: 'My Records', href: '/patient/records', icon: FileText },
    { name: 'AI Assistant', href: '/patient/ai', icon: Bot },
  ],
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-600',
  doctor: 'bg-blue-600',
  receptionist: 'bg-teal-600',
  patient: 'bg-green-600',
}

export function AppShell({ children, role }: { children: React.ReactNode, role: keyof typeof roleLinks }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const links = roleLinks[role] || []

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 
        flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${roleColors[role]} flex items-center justify-center`}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">HMS Pro</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-5 py-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white ${roleColors[role]} capitalize`}>
            {role} Portal
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (link.href !== `/${role}` && pathname.startsWith(link.href))
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150
                  ${isActive
                    ? `bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold`
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }
                `}
              >
                <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center h-16 px-4 lg:px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 mr-3 -ml-2 text-slate-500 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / Title */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate capitalize">
              {links.find(l => l.href === pathname || pathname.startsWith(l.href + '/') && l.href !== `/${role}`)?.name ?? 'Dashboard'}
            </p>
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${roleColors[role]} text-white flex items-center justify-center text-sm font-bold`}>
              {role.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
