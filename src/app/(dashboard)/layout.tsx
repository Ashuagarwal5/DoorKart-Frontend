import { AuthGate } from '@/features/auth/auth-gate';

/** Every page in this route group is behind the sign-in gate. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
