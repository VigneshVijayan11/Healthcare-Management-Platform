'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const PrescriptionPDF = dynamic(() => import('@/components/shared/PrescriptionPDF'), { ssr: false })

export default function PatientDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [patientData, setPatientData] = useState<any>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: userProfile },
        { data: patient },
        { data: appts },
        { data: prescriptions },
        { data: notifs },
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('patients').select('*').eq('id', user.id).single(),
        supabase.from('appointments')
          .select('*, doctors ( users ( full_name ), specialization )')
          .eq('patient_id', user.id)
          .in('status', ['pending', 'confirmed'])
          .order('date', { ascending: true })
          .limit(3),
        supabase.from('prescriptions')
          .select('*, doctors ( users ( full_name ) )')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setProfile(userProfile)
      setPatientData(patient)
      setUpcomingAppointments(appts || [])
      setRecentPrescriptions(prescriptions || [])
      setNotifications(notifs || [])
      setLoading(false)
    }

    fetchAll()

    // Realtime notifications
    const channel = supabase.channel('patient-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => fetchAll())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading your dashboard...</div>

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Patient'} 👋</h1>
          <p className="text-slate-500 mt-1">Here's your health overview for today.</p>
        </div>
        <Link href="/patient/appointments">
          <Button size="lg">+ Book Appointment</Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Upcoming Appointments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{upcomingAppointments.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              {upcomingAppointments[0] ? `Next: ${upcomingAppointments[0].date}` : 'None scheduled'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Prescriptions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{recentPrescriptions.length}</div>
            <p className="text-xs text-slate-500 mt-1">Available to download</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Notifications</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{notifications.filter(n => !n.is_read).length}</div>
            <p className="text-xs text-slate-500 mt-1">Unread alerts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Appointments */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Link href="/patient/appointments"><Button size="sm" variant="outline">Book New</Button></Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No upcoming appointments.</p>
              ) : upcomingAppointments.map(appt => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-sm">Dr. {(appt.doctors as any)?.users?.full_name}</p>
                    <p className="text-xs text-slate-500">{appt.date} at {appt.time_slot} · {(appt.doctors as any)?.specialization}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColor[appt.status]}`}>{appt.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Prescriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Prescriptions</CardTitle>
              <Link href="/patient/records"><Button size="sm" variant="outline">View All</Button></Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPrescriptions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No prescriptions yet.</p>
              ) : recentPrescriptions.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-sm">{p.diagnosis || 'General Prescription'}</p>
                    <p className="text-xs text-slate-500">Dr. {(p.doctors as any)?.users?.full_name} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPrescription(p)}>Download</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* QR Code */}
          <Card>
            <CardHeader><CardTitle className="text-sm">My Check-in QR Code</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center space-y-3">
              {patientData?.qr_code_id ? (
                <>
                  <div className="p-3 bg-white rounded-lg border shadow-sm">
                    <QRCodeSVG
                      value={JSON.stringify({ patient_id: patientData.id, qr_id: patientData.qr_code_id, name: profile?.full_name })}
                      size={160}
                      level="H"
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500">Show this at the reception for fast check-in</p>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">QR code will appear after your patient profile is set up by the reception.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No notifications yet.</p>
              ) : notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`p-3 rounded-lg cursor-pointer text-sm border transition-colors ${n.is_read ? 'bg-white dark:bg-slate-950 opacity-60' : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'}`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Prescription</h2>
              <Button variant="ghost" onClick={() => setSelectedPrescription(null)}>✕ Close</Button>
            </div>
            <div className="p-4">
              <PrescriptionPDF prescription={selectedPrescription} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
