'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminPatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('patients')
        .select('*, users ( full_name, email, phone, created_at )')
        .order('created_at', { ascending: false })
      setPatients(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = patients.filter(p =>
    (p.users?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.users?.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Patients</h1>

      <Card>
        <CardHeader>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-slate-500">Loading...</p> : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No patients found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                      {(p.users?.full_name || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{p.users?.full_name}</p>
                      <p className="text-sm text-slate-500">{p.gender} · {p.blood_group ?? 'Blood group N/A'} · DOB: {p.dob ?? 'N/A'}</p>
                      <p className="text-xs text-slate-400">{p.users?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                    <Button size="sm" variant="outline">View Records</Button>
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
