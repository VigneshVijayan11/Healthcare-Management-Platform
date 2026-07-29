'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const PrescriptionPDF = dynamic(() => import('@/components/shared/PrescriptionPDF'), { ssr: false })

export default function PatientRecords() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: presc }, { data: appts }] = await Promise.all([
        supabase.from('prescriptions')
          .select('*, doctors ( users ( full_name ) )')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('appointments')
          .select('*, doctors ( users ( full_name ) )')
          .eq('patient_id', user.id)
          .order('date', { ascending: false }),
      ])

      setPrescriptions(presc || [])
      setAppointments(appts || [])
      setLoading(false)
    }

    fetchAll()

    const channel = supabase.channel('patient-records')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prescriptions' }, fetchAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, fetchAll)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Loading your records...</div>
  )

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">My Medical Records</h1>

      {/* Prescriptions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400">
            No prescriptions yet. They will appear here after your doctor visit.
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map(p => (
              <Card key={p.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                  <div>
                    <p className="font-semibold">{p.diagnosis || 'General Prescription'}</p>
                    <p className="text-sm text-slate-500">
                      Dr. {(p.doctors as any)?.users?.full_name} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.medicines?.length ?? 0} medicine(s) prescribed</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPrescription(p)}>
                    View / Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Appointments */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Appointment History</h2>
        {appointments.length === 0 ? (
          <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400">
            No past appointments found.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(a => (
              <Card key={a.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                  <div>
                    <p className="font-semibold">Dr. {(a.doctors as any)?.users?.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {a.date} at {a.time_slot} · Token #{a.token_number}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize self-start sm:self-auto ${statusColor[a.status] ?? ''}`}>
                    {a.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* PDF Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold">Prescription — {selectedPrescription.diagnosis}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)}>✕ Close</Button>
            </div>
            <div className="p-4 overflow-auto">
              <PrescriptionPDF prescription={selectedPrescription} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
