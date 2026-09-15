import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VirtualMap from '../office/VirtualMap' // Import from the office folder
import LiveKitRoomWrapper from '../office/LiveKitRoomWrapper'
import MapHeader from '@/components/MapHeader'



async function PrayerRoomContent() {
  const supabase = await createClient()

  // 1. Verify the user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch the full profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, avatar_url, camera_enabled, microphone_enabled, accessible_maps, display_name, gender, avatar_config')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Failed to fetch profile in /prayer-room:', profileError.message)
  }

  const userRole = profile?.role || 'employee'
  const DEFAULT_MAPS = ['office', 'meeting-room', 'prayer-room']
  const assignedMaps = profile?.accessible_maps ?? DEFAULT_MAPS

  // 3. MAP AUTHORIZATION CHECK: Specifically for 'prayer-room'
  if (userRole !== 'admin') {
    if (!assignedMaps.includes('prayer-room')) {
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
    gender: profile?.gender || null,
    avatar_config: profile?.avatar_config || null,
  }

  return (
    <div className="fixed inset-0 flex w-screen h-screen flex-col bg-gradient-to-br from-white via-purple-50 to-purple-100 overflow-hidden select-none">
      
      {/* --- ANIMATED AMBIENT BACKGROUND --- */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] animate-[spin_15s_linear_infinite] rounded-full bg-purple-300/30 blur-[120px] z-0" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-[spin_20s_linear_infinite_reverse] rounded-full bg-fuchsia-300/30 blur-[120px] z-0" />
      <MapHeader 
        userRole={userRole} 
        assignedMaps={assignedMaps} 
        currentMapId="prayer-room" 
      />

      <main className="relative z-10 flex flex-1 items-center justify-center overflow-hidden p-8">
          {/* ISOLATED MAP INSTANCE WITH AMBIENT AUDIO & DISABLED MIC */}
          <LiveKitRoomWrapper roomId="prayer_room_1" currentUser={currentUserData}>
            <VirtualMap 
              currentUser={currentUserData} 
              roomId="prayer_room_1" 
              mapBackground="/prayer-room.jfif" 
              ambientAudio="/prayer-music.mp3" 
              disableMic={true} // <-- ADD THIS
            />
          </LiveKitRoomWrapper>
       </main>
    </div>
  )
}

export default function PrayerRoomPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-gray-100 text-gray-600 font-medium">Loading prayer room...</div>}>
      <PrayerRoomContent />
    </Suspense>
  )
}