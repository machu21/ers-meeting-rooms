import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VirtualMap from './VirtualMap'
import MapNavigation from './MapNavigation' // <-- Import the new navigation

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
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex items-center justify-between bg-white p-4 shadow-sm border-b z-20">

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">Elevate Remote Office</h1>
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 uppercase tracking-wider">
              {userRole}
            </span>
            {userRole === 'admin' && (
              <span className="rounded bg-gray-800 px-2 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                Ghost Mode
              </span>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-gray-300"></div>

          {/* The New Map Navigation Dropdown */}
          <MapNavigation
            accessibleMaps={userRole === 'admin' ? ['office', 'prayer-room', 'meeting-room'] : assignedMaps}
            currentMapId="office"
          />
        </div>

        <div className="flex items-center gap-4">
          {(userRole === 'supervisor' || userRole === 'admin') && (
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Admin Dashboard
            </Link>
          )}

          {/* NEW: Settings Link for everyone */}
          <Link href="/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Settings
          </Link>

          <form action={signOut}>
            <button className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center bg-gray-800 overflow-hidden p-8">
        <VirtualMap
          currentUser={currentUserData}
          roomId="office_room_1"
          mapBackground="/office.jfif"
        />
      </main>
    </div>
  )
}

export default function OfficePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-gray-100 text-gray-600 font-medium">Loading office space...</div>}>
      <OfficeContent />
    </Suspense>
  )
}