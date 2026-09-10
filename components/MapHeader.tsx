import Link from 'next/link'
import MapNavigation from '@/app/office/MapNavigation'
import { signOut } from '@/app/login/actions'

interface MapHeaderProps {
  userRole: string
  assignedMaps: string[]
  currentMapId: string
}

export default function MapHeader({ userRole, assignedMaps, currentMapId }: MapHeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/60 bg-white/40 p-4 shadow-[0_4px_30px_rgba(107,33,168,0.05)] backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-purple-900 drop-shadow-sm">Elevate Remote Office</h1>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700 border border-purple-200">
            {userRole}
          </span>
          {userRole === 'admin' && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700 border border-red-200">
              Ghost Mode
            </span>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-purple-200"></div>

        {/* Map Navigation Dropdown */}
        <MapNavigation
          accessibleMaps={userRole === 'admin' ? ['office', 'prayer-room', 'meeting-room'] : assignedMaps}
          currentMapId={currentMapId}
        />
      </div>

      <div className="flex items-center gap-4">
        {(userRole === 'supervisor' || userRole === 'admin') && (
          <Link href="/dashboard" className="text-sm font-medium text-purple-700 transition hover:text-purple-900">
            Admin Dashboard
          </Link>
        )}

        {/* Settings Link */}
        <Link href="/settings" className="text-sm font-medium text-purple-600 transition hover:text-purple-900">
          Settings
        </Link>

        <form action={signOut}>
          <button className="rounded-xl border border-purple-200 bg-white/50 px-4 py-2 text-sm font-semibold text-purple-900 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95">
            Sign Out
          </button>
        </form>
      </div>
    </header>
  )
}
