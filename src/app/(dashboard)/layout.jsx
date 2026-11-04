import { AuthGate } from '@/features/auth/auth-gate';

/** Every page in this route group is behind the sign-in gate. */
export default function DashboardLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}
