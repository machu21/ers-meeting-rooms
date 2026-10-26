import Link from 'next/link'
import Image from 'next/image'
import MapNavigation from '@/app/office/MapNavigation'
import SignOutButton from '@/components/SignOutButton'

interface MapHeaderProps {
  userRole: string
  assignedMaps: string[]
  currentMapId: string
}

export default function MapHeader({ userRole, assignedMaps, currentMapId }: MapHeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/60 bg-white/50 px-4 py-3 shadow-[0_4px_30px_rgba(107,33,168,0.06)] backdrop-blur-xl">
      <div className="flex items-center gap-5">
        {/* Brand Logo & Name */}
        <Link href="/office" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/10 p-1 ring-1 ring-purple-600/20 shadow-sm">
            <Image
              src="/logo-icon.png"
              alt="ERS Office Emblem"
              width={28}
              height={28}
              className="object-contain drop-shadow transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black tracking-tight text-purple-950">ERS Office</span>
          </div>
        </Link>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-purple-100/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-800 border border-purple-200/80 shadow-xs">
            {userRole}
          </span>
          {userRole === 'admin' && (
            <span className="rounded-full bg-red-100/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700 border border-red-200/80 shadow-xs">
              Ghost Mode
            </span>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="hidden h-5 w-px bg-purple-200/80 sm:block"></div>

        {/* Map Navigation Dropdown */}
        <div className="hidden sm:block">
          <MapNavigation
            accessibleMaps={userRole === 'admin' ? ['office', 'prayer-room', 'meeting-room'] : assignedMaps}
            currentMapId={currentMapId}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile Map Switcher fallback */}
        <div className="block sm:hidden">
          <MapNavigation
            accessibleMaps={userRole === 'admin' ? ['office', 'prayer-room', 'meeting-room'] : assignedMaps}
            currentMapId={currentMapId}
          />
        </div>

        {(userRole === 'supervisor' || userRole === 'admin') && (
          <Link href="/dashboard" className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-purple-700 transition hover:text-purple-900">
            Dashboard
          </Link>
        )}

        {/* Settings Link */}
        <Link href="/settings" className="text-xs font-bold uppercase tracking-wider text-purple-700 transition hover:text-purple-900">
          Settings
        </Link>

        <SignOutButton variant="header" />
      </div>
    </header>
  )
}
