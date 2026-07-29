'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Doctor = {
  id: string
  specialization: string
  availability_schedule: any
  users: { full_name: string }
  departments: { name: string }
}

export default function BookAppointment() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase
        .from('doctors')
        .select('id, specialization, availability_schedule, users ( full_name ), departments ( name )')
      setDoctors(data as any || [])
    }
    fetchDoctors()
  }, [])

  const handleBook = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check patient ID
    const { data: patient } = await supabase.from('patients').select('id').eq('id', user.id).single()
    if (!patient) {
      setError('Your patient profile is not complete. Please contact reception.')
      setLoading(false)
      return
    }

    // Check for double booking
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', selectedDoctor)
      .eq('date', date)
      .eq('time_slot', timeSlot)
      .not('status', 'eq', 'cancelled')
      .single()

    if (existing) {
      setError('This time slot is already booked. Please choose another.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: selectedDoctor,
      date,
      time_slot: timeSlot,
      status: 'pending',
    })

    if (err) { setError(err.message); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Book Appointment</h1>

      <Card>
        <CardHeader><CardTitle>Select Doctor</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Doctor</Label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={selectedDoctor}
              onChange={e => setSelectedDoctor(e.target.value)}
            >
              <option value="">-- Select a Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr. {(d.users as any)?.full_name} — {d.specialization} ({(d.departments as any)?.name ?? 'General'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
              >
                <option value="">-- Select time --</option>
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <div className="p-3 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm">
              ✅ Appointment booked successfully! The doctor will confirm it shortly.
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handleBook} 
            disabled={!selectedDoctor || !date || !timeSlot || loading}
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
