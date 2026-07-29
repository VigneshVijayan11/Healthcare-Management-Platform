'use client'

import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Use React.lazy instead of next/dynamic to avoid Turbopack SSR issues
const PrescriptionPDF = lazy(() => import('@/components/shared/PrescriptionPDF'))

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    setMounted(true)
    const supabase = supabaseRef.current

    const fetchPrescriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, patients ( users ( full_name ) )')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setPrescriptions(data || [])
      setLoading(false)
    }

    fetchPrescriptions()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-slate-500 text-sm mt-1">All prescriptions you have issued.</p>
        </div>
        <Button onClick={() => router.push('/doctor/prescriptions/new')}>
          + New Prescription
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          Loading prescriptions...
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="p-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 text-lg">No prescriptions created yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            After confirming an appointment, click "Write Prescription" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                <div>
                  <p className="font-semibold">{p.patients?.users?.full_name ?? 'Unknown Patient'}</p>
                  <p className="text-sm text-slate-500">
                    {p.diagnosis || 'General Prescription'} ·{' '}
                    {new Date(p.created_at).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.medicines?.length ?? 0} medicine(s) prescribed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPrescription(p)}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium self-start sm:self-auto"
                >
                  View / Download PDF
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Modal — only render on client after mount */}
      {mounted && selectedPrescription && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPrescription(null) }}
        >
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-base">
                  {selectedPrescription.patients?.users?.full_name ?? 'Patient'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPrescription.diagnosis || 'General Prescription'} ·{' '}
                  {new Date(selectedPrescription.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close prescription modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-auto flex-1">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                    Loading prescription viewer...
                  </div>
                }
              >
                <PrescriptionPDF prescription={selectedPrescription} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
