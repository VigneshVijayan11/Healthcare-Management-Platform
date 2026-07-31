'use client'

import { useEffect, useState } from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { createClient } from '@/utils/supabase/client'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { borderBottom: '2 solid #1d4ed8', paddingBottom: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hospitalName: { fontSize: 22, fontWeight: 'bold', color: '#1d4ed8' },
  hospitalSub: { fontSize: 10, color: '#64748b', marginTop: 2 },
  doctorName: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  doctorSub: { fontSize: 10, color: '#64748b', textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  label: { fontSize: 10, color: '#64748b', width: 100 },
  value: { fontSize: 10, color: '#0f172a', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1d4ed8', padding: 8, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: '1 solid #e2e8f0' },
  tableHeaderCell: { fontSize: 9, color: '#ffffff', fontWeight: 'bold' },
  tableCell: { fontSize: 9, color: '#0f172a' },
  col1: { width: '30%' },
  col2: { width: '20%' },
  col3: { width: '25%' },
  col4: { width: '25%' },
  notes: { fontSize: 10, color: '#334155', padding: 10, backgroundColor: '#f8fafc', borderLeft: '3 solid #1d4ed8' },
  disclaimer: { marginTop: 24, fontSize: 8, color: '#94a3b8', textAlign: 'center', borderTop: '1 solid #e2e8f0', paddingTop: 10 },
  signature: { marginTop: 40, flexDirection: 'row', justifyContent: 'flex-end' },
  signLine: { borderTop: '1 solid #0f172a', width: 150, paddingTop: 4, fontSize: 10, textAlign: 'center' },
})

function PrescriptionDocument({ prescription, patientName }: { prescription: any; patientName: string }) {
  const doctorName = prescription.doctors?.users?.full_name ? `Dr. ${prescription.doctors.users.full_name}` : 'Dr. Attending Physician'
  const medicines: any[] = prescription.medicines || []
  const date = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hospitalName}>HMS Pro Hospital</Text>
            <Text style={styles.hospitalSub}>123, Medical Avenue, Healthcare City - 600001</Text>
            <Text style={styles.hospitalSub}>Tel: +91 98765 43210 | care@hmspro.com</Text>
          </View>
          <View>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.doctorSub}>MBBS, MD | Reg. No: 12345</Text>
            <Text style={styles.doctorSub}>General Medicine</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{patientName}</Text>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          {prescription.diagnosis && (
            <View style={styles.row}>
              <Text style={styles.label}>Diagnosis:</Text>
              <Text style={styles.value}>{prescription.diagnosis}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rx — Medicines</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Medicine</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Dosage</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Frequency</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Duration</Text>
          </View>
          {medicines.map((med, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>{med.name || '—'}</Text>
              <Text style={[styles.tableCell, styles.col2]}>{med.dosage || '—'}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{med.frequency || '—'}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{med.duration || '—'}</Text>
            </View>
          ))}
        </View>

        {prescription.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions / Notes</Text>
            <Text style={styles.notes}>{prescription.notes}</Text>
          </View>
        )}

        <View style={styles.signature}>
          <Text style={styles.signLine}>Doctor's Signature</Text>
        </View>

        <Text style={styles.disclaimer}>
          This prescription is digitally generated by HMS Pro. It is NOT a substitute for professional medical advice. Always consult a licensed physician.
        </Text>
      </Page>
    </Document>
  )
}

export default function PrescriptionPDF({ prescription }: { prescription: any }) {
  const [mounted, setMounted] = useState(false)
  const [patientName, setPatientName] = useState<string>('Patient')
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    const resolvePatientName = async () => {
      // 1. Try from prescription object
      if (prescription?.patients?.users?.full_name) {
        setPatientName(prescription.patients.users.full_name)
        return
      }
      if (prescription?.patient_name) {
        setPatientName(prescription.patient_name)
        return
      }

      // 2. Try fetching from users table via patient_id
      if (prescription?.patient_id) {
        const { data: user } = await supabase.from('users').select('full_name').eq('id', prescription.patient_id).single()
        if (user?.full_name) {
          setPatientName(user.full_name)
          return
        }
      }

      // 3. Fallback to logged-in user
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setPatientName(user.user_metadata.full_name)
      } else {
        const { data: u } = await supabase.from('users').select('full_name').eq('id', user?.id).single()
        if (u?.full_name) setPatientName(u.full_name)
      }
    }

    resolvePatientName()
  }, [prescription])

  const handlePrint = () => {
    window.print()
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Preparing prescription...
      </div>
    )
  }

  const medicines: any[] = prescription.medicines || []
  const date = prescription.created_at
    ? new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString()

  const doctorName = prescription.doctors?.users?.full_name ? `Dr. ${prescription.doctors.users.full_name}` : 'Dr. Attending Physician'

  return (
    <div className="space-y-4">
      {/* HTML Preview (Printable) */}
      <div id="printable-prescription" className="border rounded-lg p-6 bg-white text-slate-900 font-sans text-sm shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-blue-600 pb-4 mb-5 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-blue-600">HMS Pro Hospital</h2>
            <p className="text-slate-500 text-xs mt-1">123, Medical Avenue, Healthcare City - 600001</p>
            <p className="text-slate-500 text-xs">Tel: +91 98765 43210 | care@hmspro.com</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{doctorName}</p>
            <p className="text-slate-500 text-xs">MBBS, MD | Reg. No: 12345</p>
            <p className="text-slate-500 text-xs">General Medicine</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="mb-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Patient Information</p>
          <div className="flex flex-wrap gap-8 text-xs">
            <div><span className="text-slate-500">Patient: </span><strong>{patientName}</strong></div>
            <div><span className="text-slate-500">Date: </span><strong>{date}</strong></div>
            {prescription.diagnosis && <div><span className="text-slate-500">Diagnosis: </span><strong>{prescription.diagnosis}</strong></div>}
          </div>
        </div>

        {/* Medicines Table */}
        <div className="mb-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Rx — Medicines</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left p-2 rounded-tl">Medicine</th>
                <th className="text-left p-2">Dosage</th>
                <th className="text-left p-2">Frequency</th>
                <th className="text-left p-2 rounded-tr">Duration</th>
              </tr>
            </thead>
            <tbody>
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-slate-400">No medicines prescribed.</td>
                </tr>
              ) : medicines.map((med, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 font-medium">{med.name}</td>
                  <td className="p-2">{med.dosage}</td>
                  <td className="p-2">{med.frequency}</td>
                  <td className="p-2">{med.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <div className="mb-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Instructions / Notes</p>
            <div className="border-l-4 border-blue-600 bg-slate-50 p-3 text-xs text-slate-700">{prescription.notes}</div>
          </div>
        )}

        {/* Signature & Disclaimer */}
        <div className="flex justify-end mt-8 mb-4">
          <div className="text-center border-t border-slate-800 pt-1 w-40 text-xs">Doctor's Signature</div>
        </div>
        <p className="text-center text-[10px] text-slate-400 border-t pt-3 mt-2">
          This digital prescription is generated by HMS Pro Hospital Management System.
        </p>
      </div>

      {/* Action Buttons: PDF Download Link + Browser Print */}
      <div className="flex flex-col sm:flex-row gap-3">
        <PDFDownloadLink
          document={<PrescriptionDocument prescription={prescription} patientName={patientName} />}
          fileName={`prescription-${prescription.id?.slice(0, 8) ?? 'hms'}.pdf`}
          className="flex-1"
        >
          {({ loading }) => (
            <button
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <span>📄</span> {loading ? 'Generating PDF...' : 'Download Prescription PDF'}
            </button>
          )}
        </PDFDownloadLink>

        <button
          onClick={handlePrint}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>
    </div>
  )
}
