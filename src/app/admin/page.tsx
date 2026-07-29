'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ doctors: 0, patients: 0, appointments: 0, revenue: 0 })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: doctorsCount },
        { count: patientsCount },
        { count: appointmentsCount },
        { data: appts },
        { data: billing },
      ] = await Promise.all([
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments')
          .select('*, patients ( users ( full_name ) ), doctors ( users ( full_name ) )')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('billing').select('amount').eq('status', 'paid'),
      ])

      const totalRevenue = (billing || []).reduce((sum: number, b: any) => sum + (b.amount || 0), 0)

      setStats({
        doctors: doctorsCount || 0,
        patients: patientsCount || 0,
        appointments: appointmentsCount || 0,
        revenue: totalRevenue,
      })
      setRecentAppointments(appts || [])
      setLoading(false)
    }

    fetchStats()

    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Hospital-wide overview and management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Doctors', value: stats.doctors, color: 'text-blue-600', icon: '👨‍⚕️' },
          { label: 'Total Patients', value: stats.patients, color: 'text-green-600', icon: '🧑‍🤝‍🧑' },
          { label: 'Total Appointments', value: stats.appointments, color: 'text-purple-600', icon: '📅' },
          { label: 'Revenue Collected', value: `₹${stats.revenue.toLocaleString()}`, color: 'text-orange-600', icon: '💰' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Recent Appointments</CardTitle></CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                    <div>
                      <p className="font-semibold text-sm">{(a.patients as any)?.users?.full_name}</p>
                      <p className="text-xs text-slate-500">
                        Dr. {(a.doctors as any)?.users?.full_name} · {a.date} {a.time_slot}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColor[a.status]}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: '👨‍⚕️ Manage Doctors', href: '/admin/doctors' },
              { label: '🧑‍🤝‍🧑 Manage Patients', href: '/admin/patients' },
              { label: '📊 View Analytics', href: '/admin/analytics' },
            ].map(a => (
              <a key={a.href} href={a.href}>
                <Button variant="outline" className="w-full justify-start">{a.label}</Button>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
