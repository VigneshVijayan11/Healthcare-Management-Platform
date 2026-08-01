'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Appointment = {
  id: string
  date: string
  time_slot: string
  status: string
  token_number: number
  patient_name: string
}

type Stats = {
  todayTotal: number
  todayRemaining: number
  totalPrescriptions: number
  totalPatients: number
  weekTotal: number
}

const STATUS_COLOR: Record<string, { dot: string; badge: string }> = {
  pending:   { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  confirmed: { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  completed: { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelled: { dot: 'bg-red-400',    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  accent: string
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      <div className={`absolute inset-0 opacity-[0.06] ${accent}`} />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
          </div>
          <span className={`text-2xl p-2.5 rounded-xl ${accent} bg-opacity-10`}>{icon}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DoctorDashboard() {
  const [stats, setStats] = useState<Stats>({
    todayTotal: 0,
    todayRemaining: 0,
    totalPrescriptions: 0,
    totalPatients: 0,
    weekTotal: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      // Fetch doctor name
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setDoctorName(userData?.full_name || user.email || 'Doctor')

      // Fetch all appointments + users map in parallel
      const [
        { data: allAppts },
        { data: usersData },
        { data: prescriptionsData },
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, date, time_slot, status, token_number, patient_id, patients ( users ( full_name ) )')
          .eq('doctor_id', user.id)
          .order('date', { ascending: true })
          .order('time_slot', { ascending: true }),
        supabase.from('users').select('id, full_name'),
        supabase
          .from('prescriptions')
          .select('id, patient_id')
          .eq('doctor_id', user.id),
      ])

      const userMap = new Map((usersData || []).map((u: any) => [u.id, u]))

      const enrich = (a: any): Appointment => {
        const pUser = a.patients?.users || userMap.get(a.patient_id) || {}
        return {
          id: a.id,
          date: a.date,
          time_slot: a.time_slot,
          status: a.status,
          token_number: a.token_number,
          patient_name: pUser.full_name || 'Unknown Patient',
        }
      }

      const all: Appointment[] = (allAppts || []).map(enrich)
      const todayList = all.filter(a => a.date === today)
      const remaining = todayList.filter(a => !['completed', 'cancelled'].includes(a.status))
      const upcoming = all.filter(a => a.date > today && !['cancelled'].includes(a.status)).slice(0, 5)
      const uniquePatients = new Set((allAppts || []).map((a: any) => a.patient_id))
      const weekAppts = (allAppts || []).filter((a: any) => a.date >= weekStartStr && a.date <= today)

      setTodayAppointments(todayList.slice(0, 6))
      setUpcomingAppointments(upcoming)
      setStats({
        todayTotal: todayList.length,
        todayRemaining: remaining.length,
        totalPrescriptions: prescriptionsData?.length ?? 0,
        totalPatients: uniquePatients.size,
        weekTotal: weekAppts.length,
      })
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('doctor-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const greetingHour = new Date().getHours()
  const greeting =
    greetingHour < 12 ? 'Good Morning' :
    greetingHour < 17 ? 'Good Afternoon' : 'Good Evening'

  const updateStatus = async (id: string, status: string) => {
    await supabaseRef.current.from('appointments').update({ status }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">
            {greeting}, Dr. {doctorName.split(' ')[0]} 👋
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-0.5">Doctor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/doctor/appointments')}>
            📅 Appointments
          </Button>
          <Button onClick={() => router.push('/doctor/prescriptions')}>
            📋 Prescriptions
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="📅"
          label="Today's Appointments"
          value={stats.todayTotal}
          sub={`${stats.todayRemaining} still pending/confirmed`}
          accent="bg-blue-500"
        />
        <StatCard
          icon="✅"
          label="Completed Today"
          value={stats.todayTotal - stats.todayRemaining}
          sub={stats.todayTotal > 0 ? `${Math.round(((stats.todayTotal - stats.todayRemaining) / stats.todayTotal) * 100)}% done` : 'No appointments yet'}
          accent="bg-green-500"
        />
        <StatCard
          icon="📋"
          label="Total Prescriptions"
          value={stats.totalPrescriptions}
          sub="All time issued"
          accent="bg-violet-500"
        />
        <StatCard
          icon="👥"
          label="Unique Patients"
          value={stats.totalPatients}
          sub={`${stats.weekTotal} appts this week`}
          accent="bg-orange-500"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Queue */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Today's Queue
                {stats.todayTotal > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({stats.todayTotal} appointments)
                  </span>
                )}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => router.push('/doctor/appointments')}>
                View all →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-4xl mb-3">🎉</span>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No appointments today</p>
                <p className="text-slate-400 text-sm mt-1">Enjoy your day off!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((appt) => {
                  const sc = STATUS_COLOR[appt.status] ?? STATUS_COLOR.pending
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                        <div>
                          <p className="text-sm font-semibold leading-tight">{appt.patient_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {appt.time_slot} · Token #{appt.token_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${sc.badge}`}>
                          {appt.status}
                        </span>
                        {appt.status === 'pending' && (
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => updateStatus(appt.id, 'confirmed')}>
                            Confirm
                          </Button>
                        )}
                        {appt.status === 'confirmed' && (
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => router.push(`/doctor/prescriptions/new?appointment_id=${appt.id}`)}>
                            Prescribe
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Upcoming Schedule</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => router.push('/doctor/appointments')}>
                View all →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-4xl mb-3">📆</span>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No upcoming appointments</p>
                <p className="text-slate-400 text-sm mt-1">Your future schedule is clear.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((appt) => {
                  const sc = STATUS_COLOR[appt.status] ?? STATUS_COLOR.pending
                  const dateLabel = new Date(appt.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-blue-600 leading-tight">
                            {dateLabel.split(' ')[0]}
                          </span>
                          <span className="text-sm font-bold text-blue-700 leading-tight">
                            {dateLabel.split(' ')[1]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{appt.patient_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {appt.time_slot} · Token #{appt.token_number}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${sc.badge}`}>
                        {appt.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: '📋', label: 'My Prescriptions', desc: 'View & download all issued prescriptions', href: '/doctor/prescriptions' },
            { icon: '📅', label: 'All Appointments', desc: 'Manage patient appointments & statuses', href: '/doctor/appointments' },
            { icon: '✍️', label: 'Write Prescription', desc: 'Create a new prescription for a patient', href: '/doctor/prescriptions/new' },
          ].map(({ icon, label, desc, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-left group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
