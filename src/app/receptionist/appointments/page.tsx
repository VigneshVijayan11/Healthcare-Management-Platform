'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-100  text-green-700  border-green-200',
  completed: 'bg-blue-100   text-blue-700   border-blue-200',
  cancelled: 'bg-red-100    text-red-700    border-red-200',
}

const STATUS_NEXT: Record<string, string> = {
  pending:   'confirmed',
  confirmed: 'completed',
}

export default function ReceptionistAppointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterDate, setFilterDate]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [updating, setUpdating]         = useState<string | null>(null)
  const [copiedId, setCopiedId]         = useState<string | null>(null)
  const supabase = createClient()

  const fetchAppointments = async () => {
    setLoading(true)

    // Fetch appointments joined with patients & doctors
    const { data: apptsData, error } = await supabase
      .from('appointments')
      .select(`
        id, patient_id, doctor_id, date, time_slot, status, token_number,
        patients ( id, users ( full_name, email, phone ) ),
        doctors  ( id, specialization, users ( full_name ) )
      `)
      .order('date', { ascending: false })
      .order('time_slot', { ascending: true })

    if (error) {
      console.error('Error fetching appointments:', error)
      setLoading(false)
      return
    }

    // Also fetch all users to use as a fallback in case join is null
    const { data: usersData } = await supabase.from('users').select('id, full_name, email, phone')
    const userMap = new Map((usersData || []).map((u: any) => [u.id, u]))

    const enriched = (apptsData || []).map((a: any) => {
      const patientUser = a.patients?.users || userMap.get(a.patient_id) || {}
      const doctorUser = a.doctors?.users || userMap.get(a.doctor_id) || {}

      return {
        ...a,
        patient_name: patientUser.full_name || 'Unknown Patient',
        patient_email: patientUser.email || '',
        patient_phone: patientUser.phone || '',
        doctor_name: doctorUser.full_name || 'Assigned Doctor',
        doctor_spec: a.doctors?.specialization || '',
      }
    })

    setAppointments(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchAppointments() }, [])

  // Real-time updates
  useEffect(() => {
    const ch = supabase.channel('receptionist-appts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
    await fetchAppointments()
    setUpdating(null)
  }

  const cancelAppointment = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return
    await updateStatus(id, 'cancelled')
  }

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = appointments.filter(a => {
    const pName = (a.patient_name || '').toLowerCase()
    const pEmail = (a.patient_email || '').toLowerCase()
    const drName = (a.doctor_name || '').toLowerCase()
    const pId = (a.patient_id || '').toLowerCase()
    const dateStr = (a.date || '').toLowerCase()
    const slotStr = (a.time_slot || '').toLowerCase()
    const q = search.trim().toLowerCase()

    const matchesSearch = !q || pName.includes(q) || pEmail.includes(q) || drName.includes(q) || pId.includes(q) || dateStr.includes(q) || slotStr.includes(q)
    const matchesDate = !filterDate || a.date === filterDate
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus

    return matchesSearch && matchesDate && matchesStatus
  })

  const counts = {
    pending:   appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Search and manage patient appointments by name or date</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending',   count: counts.pending,   color: 'text-yellow-600' },
          { label: 'Confirmed', count: counts.confirmed,  color: 'text-green-600'  },
          { label: 'Completed', count: counts.completed,  color: 'text-blue-600'   },
          { label: 'Cancelled', count: counts.cancelled,  color: 'text-red-600'    },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(s.label.toLowerCase())}>
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search patient name, email, or doctor name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-auto"
            />
            <select
              className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {(search || filterDate || filterStatus !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setFilterDate(''); setFilterStatus('all'); setSearch('') }}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-6 text-center">Loading appointments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">No appointments found matching your search.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => {
                const nextStatus = STATUS_NEXT[a.status]

                return (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {a.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-base text-slate-900 dark:text-slate-100">{a.patient_name}</p>
                        <p className="text-xs text-slate-500">{a.patient_email} {a.patient_phone ? `· ${a.patient_phone}` : ''}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-slate-400">Doctor:</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dr. {a.doctor_name}</span>
                          {a.doctor_spec && <span className="text-[11px] text-slate-400">({a.doctor_spec})</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 <strong>{a.date}</strong> at 🕐 <strong>{a.time_slot}</strong> {a.token_number ? `· Token #${a.token_number}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${STATUS_COLORS[a.status] || ''}`}>
                        {a.status}
                      </span>
                      {nextStatus && (
                        <Button
                          size="sm"
                          disabled={updating === a.id}
                          onClick={() => updateStatus(a.id, nextStatus)}
                          className="text-xs"
                        >
                          {updating === a.id ? '...' : nextStatus === 'confirmed' ? '✅ Confirm' : '🏁 Complete'}
                        </Button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === a.id}
                          onClick={() => cancelAppointment(a.id)}
                          className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel
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
    </div>
  )
}
