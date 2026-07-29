import { AppShell } from '@/components/layout/AppShell'

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="receptionist">{children}</AppShell>
}
