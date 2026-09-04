import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VirtualMap from './VirtualMap'
import LiveKitRoomWrapper from './LiveKitRoomWrapper'
import MapNavigation from './MapNavigation'



async function signOut() {
  'use server'
  const supabaseClient = await createClient()
  await supabaseClient.auth.signOut()
  redirect('/login')
}

async function OfficeContent() {
  const supabase = await createClient()

  // 1. Verify the user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch the full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, avatar_url, camera_enabled, microphone_enabled, accessible_maps, display_name')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'employee'
  const assignedMaps = profile?.accessible_maps || []

  // 3. MAP AUTHORIZATION CHECK (Admins bypass this check)
  if (userRole !== 'admin') {
    if (!assignedMaps.includes('office')) {
      redirect('/unauthorized')
    }
  }

  // 4. Construct the currentUser object
  const currentUserData = {
    id: user.id,
    name: profile?.display_name || user.email?.split('@')[0] || 'Employee',
    avatar_url: profile?.avatar_url || null,
    camera_enabled: profile?.camera_enabled || false,
    microphone_enabled: profile?.microphone_enabled || false,
    role: userRole,
  }

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-white via-purple-50 to-purple-100 overflow-hidden">
      
      {/* --- ANIMATED AMBIENT BACKGROUND --- */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] animate-[spin_15s_linear_infinite] rounded-full bg-purple-300/30 blur-[120px] z-0" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-[spin_20s_linear_infinite_reverse] rounded-full bg-fuchsia-300/30 blur-[120px] z-0" />

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

          {/* The New Map Navigation Dropdown */}
          <MapNavigation
            accessibleMaps={userRole === 'admin' ? ['office', 'prayer-room', 'meeting-room'] : assignedMaps}
            currentMapId="office"
          />
        </div>

        <div className="flex items-center gap-4">
          {(userRole === 'supervisor' || userRole === 'admin') && (
            <Link href="/dashboard" className="text-sm font-medium text-purple-700 transition hover:text-purple-900">
              Admin Dashboard
            </Link>
          )}

          {/* NEW: Settings Link for everyone */}
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

      <main className="relative z-10 flex flex-1 items-center justify-center overflow-hidden">
        <LiveKitRoomWrapper roomId="office_room_1" currentUser={currentUserData}>
          <VirtualMap
            currentUser={currentUserData}
            roomId="office_room_1"
            mapBackground="/office.jfif"
          />
        </LiveKitRoomWrapper>
      </main>
    </div>
  )
}

export default function OfficePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#050914] text-gray-400 font-medium">Loading virtual space...</div>}>
      <OfficeContent />
    </Suspense>
  )
}