import { LandingNavbar } from "@/components/layout/landing-navbar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingNavbar />
      <div className="flex flex-1 items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
