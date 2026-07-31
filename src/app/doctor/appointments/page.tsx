'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Appointment = {
  id: string
  date: string
  time_slot: string
  status: string
  token_number: number
  patient_id: string
  patient_name: string
  patient_email: string
}

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const fetchAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: apptsData }, { data: usersData }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, patient_id, date, time_slot, status, token_number, patients ( users ( full_name, email ) )')
          .eq('doctor_id', user.id)
          .order('date', { ascending: true }),
        supabase.from('users').select('id, full_name, email'),
      ])

      const userMap = new Map((usersData || []).map((u: any) => [u.id, u]))

      const enriched: Appointment[] = (apptsData || []).map((a: any) => {
        const pUser = a.patients?.users || userMap.get(a.patient_id) || {}
        return {
          id: a.id,
          date: a.date,
          time_slot: a.time_slot,
          status: a.status,
          token_number: a.token_number,
          patient_id: a.patient_id,
          patient_name: pUser.full_name || 'Unknown Patient',
          patient_email: pUser.email || '',
        }
      })

      setAppointments(enriched)
      setLoading(false)
    }

    fetchAppointments()

    const channel = supabase
      .channel('doctor-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const supabase = supabaseRef.current
    await supabase.from('appointments').update({ status }).eq('id', id)
  }

  const goToPrescribe = (appointmentId: string) => {
    router.push(`/doctor/prescriptions/new?appointment_id=${appointmentId}`)
  }

  const filteredAppointments = appointments.filter(a => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      a.patient_name.toLowerCase().includes(q) ||
      a.patient_email.toLowerCase().includes(q) ||
      a.date.toLowerCase().includes(q)
    )
  })

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and update your patient appointments in real-time.</p>
        </div>
        <Input
          placeholder="Search patient by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs bg-white dark:bg-slate-900"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <p className="text-lg">No appointments found matching "{search}".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                <div>
                  <p className="font-semibold text-base">{appt.patient_name}</p>
                  <p className="text-xs text-slate-500">{appt.patient_email}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    📅 {appt.date} at 🕐 {appt.time_slot} · Token #{appt.token_number}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize ${statusColor[appt.status] ?? ''}`}>
                    {appt.status}
                  </span>

                  {appt.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(appt.id, 'confirmed')}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(appt.id, 'cancelled')}>
                        Cancel
                      </Button>
                    </>
                  )}

                  {appt.status === 'confirmed' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(appt.id, 'completed')}>
                        Mark Complete
                      </Button>
                      <Button size="sm" onClick={() => goToPrescribe(appt.id)}>
                        Write Prescription
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
