'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type AppointmentRecord = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  time_slot: string
  status: string
  token_number?: number
  patient_name: string
  patient_email: string
  doctor_name: string
  doctor_spec?: string
}

type BillingRecord = {
  id: string
  patient_id: string
  amount: number
  status: 'unpaid' | 'paid'
  created_at: string
  patient_name: string
  patient_email: string
}

export default function ReceptionistDashboard() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [pendingBills, setPendingBills] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  const fetchDashboardData = async () => {
    setLoading(true)

    const [{ data: apptsData }, { data: billsData }, { data: usersData }] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, patient_id, doctor_id, date, time_slot, status, token_number,
          patients ( id, users ( full_name, email, phone ) ),
          doctors ( id, specialization, users ( full_name ) )
        `)
        .order('date', { ascending: false })
        .order('time_slot', { ascending: true }),

      supabase
        .from('billing')
        .select(`
          id, patient_id, amount, status, created_at,
          patients ( id, users ( full_name, email, phone ) )
        `)
        .eq('status', 'unpaid')
        .order('created_at', { ascending: false }),

      supabase.from('users').select('id, full_name, email, role')
    ])

    const userMap = new Map((usersData || []).map((u: any) => [u.id, u]))

    const enrichedAppts: AppointmentRecord[] = (apptsData || []).map((a: any) => {
      const pUser = a.patients?.users || userMap.get(a.patient_id) || {}
      const dUser = a.doctors?.users || userMap.get(a.doctor_id) || {}

      return {
        id: a.id,
        patient_id: a.patient_id,
        doctor_id: a.doctor_id,
        date: a.date,
        time_slot: a.time_slot,
        status: a.status,
        token_number: a.token_number,
        patient_name: pUser.full_name || 'Unknown Patient',
        patient_email: pUser.email || '',
        doctor_name: dUser.full_name || 'Assigned Doctor',
        doctor_spec: a.doctors?.specialization || '',
      }
    })

    const enrichedBills: BillingRecord[] = (billsData || []).map((b: any) => {
      const pUser = b.patients?.users || userMap.get(b.patient_id) || {}
      return {
        id: b.id,
        patient_id: b.patient_id,
        amount: b.amount,
        status: b.status,
        created_at: b.created_at,
        patient_name: pUser.full_name || 'Unknown Patient',
        patient_email: pUser.email || '',
      }
    })

    setAppointments(enrichedAppts)
    setPendingBills(enrichedBills)
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()

    const channel = supabase.channel('reception-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, fetchDashboardData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const markBillAsPaid = async (billId: string) => {
    await supabase.from('billing').update({ status: 'paid' }).eq('id', billId)
    await fetchDashboardData()
  }

  const updateAppointmentStatus = async (apptId: string, newStatus: string) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId)
    await fetchDashboardData()
  }

  const statusColor: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-green-100  text-green-800  border-green-200',
    completed: 'bg-blue-100   text-blue-800   border-blue-200',
    cancelled: 'bg-red-100    text-red-800    border-red-200',
  }

  // Filter appointments by search query (patient name, email, doctor name)
  const filteredAppointments = appointments.filter(a => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      a.patient_name.toLowerCase().includes(q) ||
      a.patient_email.toLowerCase().includes(q) ||
      a.doctor_name.toLowerCase().includes(q)
    )
  })

  // Filter pending bills by search query (patient name, email)
  const filteredBills = pendingBills.filter(b => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      b.patient_name.toLowerCase().includes(q) ||
      b.patient_email.toLowerCase().includes(q)
    )
  })

  const totalUnpaidAmount = pendingBills.reduce((acc, b) => acc + b.amount, 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(a => a.date === todayStr)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reception Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Track patient appointments and pending billing status</p>
        </div>
        <div className="flex gap-2">
          <Link href="/receptionist/appointments">
            <Button variant="outline">📅 All Appointments</Button>
          </Link>
          <Link href="/receptionist/billing">
            <Button>💳 Billing Portal</Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 font-medium uppercase">Today's Appointments</p>
            <p className="text-3xl font-bold text-teal-600 mt-1">{todayAppointments.length}</p>
            <p className="text-xs text-slate-400 mt-1">Scheduled for today ({todayStr})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 font-medium uppercase">Pending Check-ins</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">
              {todayAppointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Awaiting patient arrival</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 font-medium uppercase">Pending Bills</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{pendingBills.length}</p>
            <p className="text-xs text-slate-400 mt-1">Patients with unpaid bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 font-medium uppercase">Total Unpaid</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">₹{totalUnpaidAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Outstanding amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient & Doctor Name Search Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-100">
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-base">🔍 Search Appointments & Bills by Name</h2>
              <p className="text-xs text-slate-500">Type a Patient's Name, Email, or Doctor's Name to filter details</p>
            </div>
            {searchQuery && (
              <Button size="sm" variant="ghost" onClick={() => setSearchQuery('')} className="text-xs text-blue-600">
                ✕ Clear Search
              </Button>
            )}
          </div>
          <Input
            placeholder="Type Patient Name (e.g. test2) or Doctor Name (e.g. Vignesh)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-slate-950 max-w-lg"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 📅 Booked Appointments Column */}
        <Card className="flex flex-col">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📅</span> Booked Appointments
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Appointments matching search</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredAppointments.length}
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
            {loading ? (
              <p className="text-slate-500 text-center py-8 text-sm">Loading appointments...</p>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No appointments found for "{searchQuery}".
              </div>
            ) : (
              filteredAppointments.map(appt => (
                <div key={appt.id} className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm space-y-3 hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {appt.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{appt.patient_name}</p>
                        <p className="text-xs text-slate-500">{appt.patient_email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs rounded-full font-medium border capitalize ${statusColor[appt.status] || ''}`}>
                      {appt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-slate-400">Doctor:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Dr. {appt.doctor_name}</p>
                      {appt.doctor_spec && <p className="text-[11px] text-slate-400">{appt.doctor_spec}</p>}
                    </div>
                    <div>
                      <span className="text-slate-400">Date & Slot:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{appt.date}</p>
                      <p className="text-[11px] text-slate-500">🕐 {appt.time_slot} {appt.token_number ? `(Token #${appt.token_number})` : ''}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {appt.status === 'pending' && (
                      <Button size="sm" onClick={() => updateAppointmentStatus(appt.id, 'confirmed')} className="text-xs bg-green-600 hover:bg-green-700 h-8">
                        ✅ Confirm Appointment
                      </Button>
                    )}
                    {appt.status === 'confirmed' && (
                      <Button size="sm" onClick={() => updateAppointmentStatus(appt.id, 'completed')} className="text-xs bg-blue-600 hover:bg-blue-700 h-8">
                        🏁 Complete Check-in
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 💳 Pending Billing Column */}
        <Card className="flex flex-col">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>💳</span> Pending Billing Details
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Bills matching search</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredBills.length} Unpaid
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
            {loading ? (
              <p className="text-slate-500 text-center py-8 text-sm">Loading billing records...</p>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No pending bills found for "{searchQuery}".
              </div>
            ) : (
              filteredBills.map(bill => (
                <div key={bill.id} className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm space-y-3 hover:border-amber-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                        {bill.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{bill.patient_name}</p>
                        <p className="text-xs text-slate-500">{bill.patient_email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      Unpaid
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-amber-50/50 dark:bg-slate-800 p-3 rounded-lg border border-amber-100 dark:border-slate-700">
                    <div>
                      <span className="text-xs text-slate-400">Bill Date:</span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {new Date(bill.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Amount Due:</span>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{bill.amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={() => markBillAsPaid(bill.id)}
                      className="text-xs bg-green-600 hover:bg-green-700 h-8"
                    >
                      💳 Collect & Mark Paid
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
