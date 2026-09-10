import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VirtualMap from './VirtualMap'
import LiveKitRoomWrapper from './LiveKitRoomWrapper'
import MapHeader from '@/components/MapHeader'





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

      <MapHeader 
        userRole={userRole} 
        assignedMaps={assignedMaps} 
        currentMapId="office" 
      />

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