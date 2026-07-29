import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Stethoscope, ShieldCheck, Clock } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="px-6 py-4 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">HMS Pro</span>
        </div>
        <nav>
          <Link href="/login">
            <Button variant="default">Sign In / Register</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Modern Healthcare, <span className="text-blue-600">Simplified.</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            A comprehensive, real-time hospital management system designed for doctors, patients, and administrators. 
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">Get Started</Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 pt-16">
            <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-950 rounded-xl shadow-sm border">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real-time Booking</h3>
              <p className="text-slate-500 text-sm">Book appointments instantly without any double-booking.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-950 rounded-xl shadow-sm border">
              <div className="p-3 bg-green-100 text-green-600 rounded-full mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Digital Prescriptions</h3>
              <p className="text-slate-500 text-sm">Generate and download secure digital prescriptions anytime.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-950 rounded-xl shadow-sm border">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Secure Records</h3>
              <p className="text-slate-500 text-sm">Role-based access ensures your medical data remains private.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
