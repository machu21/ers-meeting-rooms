import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'

export const metadata = {
  title: 'Access Restricted | ERS Office',
  description: 'You do not have permission to access this virtual workspace.',
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#050914] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
        {/* Brand Emblem */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo-icon.png" alt="ERS Office Emblem" width={28} height={28} className="object-contain drop-shadow" />
          <span className="text-base font-black tracking-tight text-white">ERS Office</span>
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading & Text */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Room Access Restricted
        </h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Your account does not currently have permission to enter this virtual room.
          If you believe this is a mistake, please reach out to your administrator to request map access.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/office"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Main Office
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 font-medium text-sm transition-all duration-200 active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            Go to Dashboard
          </Link>

          <SignOutButton variant="subtle" className="mt-2" />
        </div>
      </div>
    </div>
  )
}
