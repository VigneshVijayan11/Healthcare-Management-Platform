'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DayCount = { date: string; count: number }
type DoctorStat = { name: string; count: number }

export default function AdminAnalytics() {
  const [dailyPatients, setDailyPatients] = useState<DayCount[]>([])
  const [doctorStats, setDoctorStats] = useState<DoctorStat[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({})
  const [revenue, setRevenue] = useState({ total: 0, paid: 0, unpaid: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const [{ data: appointments }, { data: billing }] = await Promise.all([
        supabase.from('appointments')
          .select('date, status, doctors ( users ( full_name ) )')
          .order('date', { ascending: true }),
        supabase.from('billing').select('amount, status'),
      ])

      // Daily patient counts (last 7 days)
      const dayMap: Record<string, number> = {}
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
      })
      last7.forEach(d => { dayMap[d] = 0 })
      ;(appointments || []).forEach(a => { if (dayMap[a.date] !== undefined) dayMap[a.date]++ })
      setDailyPatients(last7.map(d => ({ date: d, count: dayMap[d] })))

      // Status breakdown
      const sb: Record<string, number> = {}
      ;(appointments || []).forEach(a => { sb[a.status] = (sb[a.status] || 0) + 1 })
      setStatusBreakdown(sb)

      // Doctor performance
      const dm: Record<string, number> = {}
      ;(appointments || []).forEach(a => {
        const name = (a.doctors as any)?.users?.full_name || 'Unknown'
        dm[name] = (dm[name] || 0) + 1
      })
      setDoctorStats(Object.entries(dm).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5))

      // Revenue
      const total = (billing || []).reduce((s, b) => s + b.amount, 0)
      const paid = (billing || []).filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0)
      setRevenue({ total, paid, unpaid: total - paid })

      setLoading(false)
    }
    fetch()
  }, [])

  const maxDailyCount = Math.max(...dailyPatients.map(d => d.count), 1)
  const maxDoctorCount = Math.max(...doctorStats.map(d => d.count), 1)

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-400',
    confirmed: 'bg-green-400',
    completed: 'bg-blue-400',
    cancelled: 'bg-red-400',
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Hospital performance insights</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Billed', value: `₹${revenue.total.toLocaleString()}`, color: 'text-slate-700' },
          { label: 'Revenue Collected', value: `₹${revenue.paid.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Pending Collection', value: `₹${revenue.unpaid.toLocaleString()}`, color: 'text-red-500' },
        ].map(r => (
          <Card key={r.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{r.label}</p>
              <p className={`text-2xl font-bold mt-1 ${r.color}`}>{r.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Patients - Bar Chart */}
        <Card>
          <CardHeader><CardTitle>Daily Appointments (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {dailyPatients.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{d.count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-500"
                    style={{ height: `${(d.count / maxDailyCount) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                  />
                  <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Performance */}
        <Card>
          <CardHeader><CardTitle>Top Doctor Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {doctorStats.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No appointment data yet.</p>
            ) : doctorStats.map(d => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Dr. {d.name}</span>
                  <span className="text-slate-500">{d.count} appts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(d.count / maxDoctorCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Appointment Status Breakdown */}
        <Card>
          <CardHeader><CardTitle>Appointment Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(statusBreakdown).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(statusBreakdown).map(([status, count]) => {
                  const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0)
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1 capitalize">
                        <span className="font-medium">{status}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className={`${statusColors[status] || 'bg-slate-400'} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
