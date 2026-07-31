'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const fetchDoctors = async () => {
    setLoading(true)

    // Primary: join doctors ↔ users
    const { data: doctorRows, error } = await supabase
      .from('doctors')
      .select('*, users ( full_name, email, phone ), departments ( name )')
      .order('created_at', { ascending: false })

    if (!error && doctorRows && doctorRows.length > 0) {
      setDoctors(doctorRows)
      setLoading(false)
      return
    }

    // Fallback: query users table directly for role='doctor'
    // (covers cases where trigger hasn't created a doctors row yet)
    const { data: userRows } = await supabase
      .from('users')
      .select('id, full_name, email, phone, created_at')
      .eq('role', 'doctor')
      .order('created_at', { ascending: false })

    // Shape them to look like doctor rows
    const shaped = (userRows || []).map(u => ({
      id: u.id,
      specialization: '',
      created_at: u.created_at,
      users: { full_name: u.full_name, email: u.email, phone: u.phone },
      departments: null,
    }))
    setDoctors(shaped)
    setLoading(false)
  }

  useEffect(() => { fetchDoctors() }, [])

  const filtered = doctors.filter(d =>
    (d.users?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Doctors</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Invite Doctor'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Invite New Doctor</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              To add a doctor, ask them to sign up at <strong>/login</strong> with the role &quot;Doctor&quot;.
              Their profile will appear here automatically after registration.
              You can then assign their department and specialization.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name or specialization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No doctors found. Doctors will appear here once they sign up.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(d => (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {(d.users?.full_name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">Dr. {d.users?.full_name}</p>
                      <p className="text-sm text-slate-500">
                        {d.specialization || 'Specialization not set'} · {d.departments?.name ?? 'No dept assigned'}
                      </p>
                      <p className="text-xs text-slate-400">{d.users?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
