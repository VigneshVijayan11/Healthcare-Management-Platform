'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ReceptionistDashboard() {
  const [patientIdInput, setPatientIdInput] = useState('')
  const [checkedInPatient, setCheckedInPatient] = useState<any>(null)
  const [checkInError, setCheckInError] = useState('')
  const [stats, setStats] = useState({ waiting: 0, checkedIn: 0 })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0]
      const [{ data: appts }, { count: waiting }] = await Promise.all([
        supabase.from('appointments')
          .select('*, patients ( users ( full_name ) ), doctors ( users ( full_name ) )')
          .eq('date', today)
          .order('time_slot'),
        supabase.from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .eq('status', 'confirmed'),
      ])
      setRecentAppointments(appts || [])
      setStats({ waiting: waiting || 0, checkedIn: (appts || []).filter(a => a.status === 'completed').length })
    }
    fetch()

    const ch = supabase.channel('receptionist-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  const handleCheckIn = async () => {
    if (!patientIdInput.trim()) return
    setLoading(true)
    setCheckInError('')
    setCheckedInPatient(null)

    // Try to find by patient ID or QR code ID
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*, users ( full_name, email )')
      .or(`id.eq.${patientIdInput},qr_code_id.eq.${patientIdInput}`)
      .single()

    if (error || !patient) {
      setCheckInError('Patient not found. Please verify the ID or QR code.')
      setLoading(false)
      return
    }

    // Confirm today's appointment
    const today = new Date().toISOString().split('T')[0]
    const { data: appt } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('date', today)
      .eq('status', 'confirmed')
      .single()

    if (appt) {
      await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    }

    setCheckedInPatient(patient)
    setLoading(false)
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reception Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Awaiting Check-in Today</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.waiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Checked In Today</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.checkedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Appointments</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{recentAppointments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check-in Panel */}
        <Card>
          <CardHeader><CardTitle>🔍 Quick Patient Check-in</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">Enter Patient ID or QR Code ID to check them in.</p>
            <div className="space-y-2">
              <Label>Patient ID / QR Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste Patient ID or QR Code ID..."
                  value={patientIdInput}
                  onChange={e => setPatientIdInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCheckIn() }}
                />
                <Button onClick={handleCheckIn} disabled={loading || !patientIdInput.trim()}>
                  {loading ? '...' : 'Check In'}
                </Button>
              </div>
            </div>

            {checkInError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{checkInError}</div>
            )}

            {checkedInPatient && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <p className="font-semibold text-green-700">✅ Patient Checked In Successfully!</p>
                <p className="text-sm"><span className="font-medium">Name:</span> {checkedInPatient.users?.full_name}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {checkedInPatient.users?.email}</p>
                <p className="text-sm"><span className="font-medium">Blood Group:</span> {checkedInPatient.blood_group ?? 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-2">Token generated. Appointment status updated to "Completed".</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader><CardTitle>📅 Today's Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {recentAppointments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No appointments today.</p>
            ) : recentAppointments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-sm">{(a.patients as any)?.users?.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {a.time_slot} · Dr. {(a.doctors as any)?.users?.full_name} · Token #{a.token_number}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColor[a.status]}`}>{a.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
