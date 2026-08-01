'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PrescriptionPDF({ prescription }: { prescription: any }) {
  const [mounted, setMounted] = useState(false)
  const [patientName, setPatientName] = useState<string>('Patient')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    const resolve = async () => {
      if (prescription?.patients?.users?.full_name) {
        setPatientName(prescription.patients.users.full_name); return
      }
      if (prescription?.patient_name) {
        setPatientName(prescription.patient_name); return
      }
      if (prescription?.patient_id) {
        const { data } = await supabase.from('users').select('full_name').eq('id', prescription.patient_id).single()
        if (data?.full_name) { setPatientName(data.full_name); return }
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setPatientName(user.user_metadata.full_name)
      } else if (user?.id) {
        const { data: u } = await supabase.from('users').select('full_name').eq('id', user.id).single()
        if (u?.full_name) setPatientName(u.full_name)
      }
    }
    resolve()
  }, [prescription])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      const { default: jsPDF } = await import('jspdf')

      const medicines: any[] = prescription.medicines || []
      const date = prescription.created_at
        ? new Date(prescription.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString()
      const doctorName = prescription.doctors?.users?.full_name
        ? `Dr. ${prescription.doctors.users.full_name}` : 'Dr. Attending Physician'

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297, M = 15
      let y = M

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(29, 78, 216)
      doc.text('HMS Pro Hospital', M, y)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text(doctorName, W - M, y, { align: 'right' })

      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('123, Medical Avenue, Healthcare City - 600001', M, y)
      doc.text('MBBS, MD | Reg. No: 12345', W - M, y, { align: 'right' })

      y += 5
      doc.text('Tel: +91 98765 43210 | care@hmspro.com', M, y)
      doc.text('General Medicine', W - M, y, { align: 'right' })

      y += 6
      doc.setDrawColor(29, 78, 216)
      doc.setLineWidth(0.6)
      doc.line(M, y, W - M, y)
      y += 8

      // ── Patient Info ─────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(29, 78, 216)
      doc.text('PATIENT INFORMATION', M, y)
      y += 6

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.text('Patient:', M, y)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text(patientName, M + 22, y)

      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.text('Date:', M + 85, y)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text(date, M + 98, y)

      y += 6
      if (prescription.diagnosis) {
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'normal')
        doc.text('Diagnosis:', M, y)
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.text(prescription.diagnosis, M + 28, y)
        y += 6
      }

      y += 4
      // ── Medicines ─────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(29, 78, 216)
      doc.text('Rx — MEDICINES', M, y)
      y += 5

      // Table header
      doc.setFillColor(29, 78, 216)
      doc.rect(M, y, W - M * 2, 8, 'F')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      const cols = [M + 2, M + 56, M + 96, M + 138]
      doc.text('Medicine', cols[0], y + 5.5)
      doc.text('Dosage', cols[1], y + 5.5)
      doc.text('Frequency', cols[2], y + 5.5)
      doc.text('Duration', cols[3], y + 5.5)
      y += 10

      if (medicines.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(148, 163, 184)
        doc.text('No medicines prescribed.', W / 2, y + 5, { align: 'center' })
        y += 12
      } else {
        medicines.forEach((med, i) => {
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252)
            doc.rect(M, y - 1, W - M * 2, 8, 'F')
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(15, 23, 42)
          doc.text(String(med.name || '—'), cols[0], y + 4.5)
          doc.text(String(med.dosage || '—'), cols[1], y + 4.5)
          doc.text(String(med.frequency || '—'), cols[2], y + 4.5)
          doc.text(String(med.duration || '—'), cols[3], y + 4.5)
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.2)
          doc.line(M, y + 7, W - M, y + 7)
          y += 8
        })
      }

      y += 6
      // ── Notes ─────────────────────────────────────────────────────────────
      if (prescription.notes) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(29, 78, 216)
        doc.text('INSTRUCTIONS / NOTES', M, y)
        y += 5

        const noteLines = doc.splitTextToSize(prescription.notes, W - M * 2 - 8)
        const boxH = noteLines.length * 5 + 8
        doc.setFillColor(248, 250, 252)
        doc.rect(M, y, W - M * 2, boxH, 'F')
        doc.setFillColor(29, 78, 216)
        doc.rect(M, y, 1.5, boxH, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(51, 65, 85)
        doc.text(noteLines, M + 5, y + 5)
        y += boxH + 8
      }

      // ── Signature ─────────────────────────────────────────────────────────
      y = Math.max(y + 10, H - 45)
      doc.setDrawColor(15, 23, 42)
      doc.setLineWidth(0.3)
      doc.line(W - M - 42, y, W - M, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text("Doctor's Signature", W - M - 21, y, { align: 'center' })

      // ── Footer ────────────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(M, H - 18, W - M, H - 18)
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        'This digital prescription is generated by HMS Pro Hospital Management System.',
        W / 2, H - 12, { align: 'center' }
      )

      doc.save(`prescription-${prescription.id?.slice(0, 8) ?? 'hms'}.pdf`)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      setDownloadError('Could not generate PDF. Try Print / Save PDF instead.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => window.print()

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
  const doctorName = prescription.doctors?.users?.full_name
    ? `Dr. ${prescription.doctors.users.full_name}` : 'Dr. Attending Physician'

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div id="printable-prescription" className="border rounded-lg p-6 bg-white text-slate-900 font-sans text-sm shadow-sm">
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

        <div className="mb-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Patient Information</p>
          <div className="flex flex-wrap gap-8 text-xs">
            <div><span className="text-slate-500">Patient: </span><strong>{patientName}</strong></div>
            <div><span className="text-slate-500">Date: </span><strong>{date}</strong></div>
            {prescription.diagnosis && <div><span className="text-slate-500">Diagnosis: </span><strong>{prescription.diagnosis}</strong></div>}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Rx — Medicines</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left p-2">Medicine</th>
                <th className="text-left p-2">Dosage</th>
                <th className="text-left p-2">Frequency</th>
                <th className="text-left p-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {medicines.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-slate-400">No medicines prescribed.</td></tr>
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

        {prescription.notes && (
          <div className="mb-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Instructions / Notes</p>
            <div className="border-l-4 border-blue-600 bg-slate-50 p-3 text-xs text-slate-700">{prescription.notes}</div>
          </div>
        )}

        <div className="flex justify-end mt-8 mb-4">
          <div className="text-center border-t border-slate-800 pt-1 w-40 text-xs">Doctor's Signature</div>
        </div>
        <p className="text-center text-[10px] text-slate-400 border-t pt-3 mt-2">
          This digital prescription is generated by HMS Pro Hospital Management System.
        </p>
      </div>

      {downloadError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {downloadError}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>📄</span>
          {downloading ? 'Generating PDF… please wait' : 'Download Prescription PDF'}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>
    </div>
  )
}
