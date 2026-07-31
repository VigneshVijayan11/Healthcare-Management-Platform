'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BillingRecord = {
  id: string
  patient_id: string
  appointment_id: string | null
  amount: number
  status: 'unpaid' | 'paid'
  payment_method: string | null
  created_at: string
  patients: { users: { full_name: string; email: string } } | null
}

type Patient = { id: string; full_name: string; email: string }

const STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-green-100  text-green-700  border-green-200',
}

export default function ReceptionistBilling() {
  const [bills, setBills] = useState<BillingRecord[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Form fields
  const [selPatient, setSelPatient] = useState('')
  const [amount, setAmount] = useState('')

  const supabase = createClient()

  const fetchBills = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('billing')
      .select(`
        id, patient_id, appointment_id, amount, status, payment_method, created_at,
        patients ( users ( full_name, email ) )
      `)
      .order('created_at', { ascending: false })

    if (!error) {
      setBills((data as any) || [])
    } else {
      console.error('Error fetching bills:', error)
    }
    setLoading(false)
  }

  const fetchPatients = async () => {
    // Try from patients table joined to users
    const { data: patRows, error } = await supabase
      .from('patients')
      .select('id, users ( full_name, email )')

    if (!error && patRows && patRows.length > 0) {
      setPatients(patRows.map((p: any) => ({
        id: p.id,
        full_name: p.users?.full_name || 'Unknown',
        email: p.users?.email || '',
      })))
      return
    }

    // Fallback: from users table
    const { data: userRows } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'patient')
    setPatients((userRows || []).map((u: any) => ({ id: u.id, full_name: u.full_name, email: u.email })))
  }

  useEffect(() => {
    fetchBills()
    fetchPatients()
  }, [])

  const handleCreateBill = async () => {
    if (!selPatient || !amount) {
      setFormError('Please select a patient and enter an amount.')
      return
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.')
      return
    }

    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    // Ensure patient exists in patients table before inserting bill (auto-creates if missing)
    const { data: patientExists } = await supabase.from('patients').select('id').eq('id', selPatient).single()
    if (!patientExists) {
      await supabase.from('patients').insert({ id: selPatient, dob: '1900-01-01' })
    }

    const { error } = await supabase.from('billing').insert({
      patient_id: selPatient,
      amount: parsedAmount,
      status: 'unpaid',
    })

    if (error) {
      setFormError(error.message)
    } else {
      setFormSuccess('Bill created successfully!')
      setSelPatient('')
      setAmount('')
      await fetchBills()
    }
    setSubmitting(false)
  }

  const markPaid = async (id: string) => {
    await supabase.from('billing').update({ status: 'paid' }).eq('id', id)
    await fetchBills()
  }

  const filtered = bills.filter(b => {
    const name = (b.patients as any)?.users?.full_name?.toLowerCase() || ''
    const q = search.toLowerCase()
    const matchSearch = name.includes(q)
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalUnpaid = bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + b.amount, 0)
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage patient bills</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess('') }}>
          {showForm ? 'Cancel' : '+ New Bill'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Unpaid Amount</p>
            <p className="text-2xl font-bold text-yellow-600 mt-0.5">₹{totalUnpaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Collected</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">₹{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Total Bills</p>
            <p className="text-2xl font-bold text-slate-700 mt-0.5">{bills.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Bill Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create New Bill</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient <span className="text-red-500">*</span></Label>
                {patients.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    No registered patients found. Patients must sign up first.
                  </p>
                ) : (
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    value={selPatient}
                    onChange={e => setSelPatient(e.target.value)}
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{formError}</p>}
            {formSuccess && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">✅ {formSuccess}</p>}

            <Button onClick={handleCreateBill} disabled={submitting || patients.length === 0} className="w-full sm:w-auto">
              {submitting ? 'Creating...' : 'Create Bill'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bills List */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by patient name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-6 text-center">Loading bills...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">No billing records found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(b => {
                const patientName = (b.patients as any)?.users?.full_name || 'Unknown Patient'
                const patientEmail = (b.patients as any)?.users?.email || ''
                return (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{patientName}</p>
                        <p className="text-xs text-slate-500">{patientEmail}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        ₹{b.amount.toLocaleString()}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium border ${STATUS_COLORS[b.status] || ''}`}>
                        {b.status}
                      </span>
                      {b.status === 'unpaid' && (
                        <Button size="sm" onClick={() => markPaid(b.id)} className="text-xs bg-green-600 hover:bg-green-700">
                          Mark Paid
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
