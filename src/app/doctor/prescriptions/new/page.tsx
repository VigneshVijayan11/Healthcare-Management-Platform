'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Medicine = { name: string; dosage: string; frequency: string; duration: string }

function NewPrescriptionForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const appointmentId = searchParams.get('appointment_id')
  const supabaseRef = useRef(createClient())

  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '', frequency: '', duration: '' }])
  const [patientInfo, setPatientInfo] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!appointmentId) return
    const supabase = supabaseRef.current
    const fetchPatient = async () => {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('patient_id, date, patients ( users ( full_name ), dob, blood_group, gender )')
        .eq('id', appointmentId)
        .single()
      if (!fetchError) setPatientInfo(data)
    }
    fetchPatient()
  }, [appointmentId])

  const addMedicine = () =>
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }])
  
  const removeMedicine = (i: number) =>
    setMedicines(medicines.filter((_, idx) => idx !== i))
  
  const updateMedicine = (i: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines]
    updated[i][field] = value
    setMedicines(updated)
  }

  const handleSubmit = async () => {
    if (!patientInfo) {
      setError('Patient information not loaded. Please try again.')
      return
    }
    const emptyMed = medicines.find(m => !m.name.trim())
    if (emptyMed) {
      setError('Please fill in all medicine names before saving.')
      return
    }

    setSaving(true)
    setError('')
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('prescriptions').insert({
      appointment_id: appointmentId,
      doctor_id: user.id,
      patient_id: patientInfo.patient_id,
      diagnosis,
      medicines,
      notes,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    // Notify patient
    await supabase.from('notifications').insert({
      user_id: patientInfo.patient_id,
      title: 'New Prescription Ready',
      message: `Your prescription for your appointment on ${patientInfo.date} is now available to download.`,
      type: 'prescription',
    })

    router.push('/doctor/prescriptions')
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">New Prescription</h1>
        <p className="text-slate-500 text-sm mt-1">Fill out the prescription form below. The patient will be notified automatically.</p>
      </div>

      {!appointmentId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ No appointment selected. Please go to Appointments and click "Write Prescription" on a confirmed appointment.
        </div>
      )}

      {patientInfo && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Patient</p>
                <p className="font-semibold">{patientInfo.patients?.users?.full_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Gender</p>
                <p className="font-semibold">{patientInfo.patients?.gender ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Blood Group</p>
                <p className="font-semibold">{patientInfo.patients?.blood_group ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Appointment Date</p>
                <p className="font-semibold">{patientInfo.date}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Diagnosis & Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              placeholder="e.g. Viral Fever, Upper Respiratory Infection"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Instructions</Label>
            <textarea
              id="notes"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[90px] resize-none"
              placeholder="e.g. Take rest, drink plenty of fluids, avoid cold food..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Medicines</CardTitle>
          <Button size="sm" variant="outline" onClick={addMedicine}>+ Add Medicine</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((med, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Medicine Name</Label>
                <Input
                  placeholder="e.g. Paracetamol"
                  value={med.name}
                  onChange={e => updateMedicine(i, 'name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Dosage</Label>
                <Input
                  placeholder="e.g. 500mg"
                  value={med.dosage}
                  onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Frequency</Label>
                <Input
                  placeholder="e.g. Twice daily"
                  value={med.frequency}
                  onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Duration</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 5 days"
                    value={med.duration}
                    onChange={e => updateMedicine(i, 'duration', e.target.value)}
                  />
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(i)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none px-1 flex-shrink-0"
                      title="Remove medicine"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={saving || !appointmentId || !patientInfo}
          className="flex-1"
        >
          {saving ? 'Saving prescription...' : '✅ Save Prescription & Notify Patient'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading prescription form...
      </div>
    }>
      <NewPrescriptionForm />
    </Suspense>
  )
}
