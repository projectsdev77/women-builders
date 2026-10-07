// Each account screen renders its own AuthShell so the art panel can change colour per screen.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
