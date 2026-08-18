import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateUserForm from './CreateUserForm'
import AdminSettings from './AdminSettings'
import UserManagementTable from './UserManagementTable' // <-- Import the new table
import { UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

function MapAssignmentCard({ title, users, isUnassigned = false }: { title: string, users: any[], isUnassigned?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm border flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 border-b pb-3">
        {isUnassigned ? (
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        ) : (
          <UserGroupIcon className="h-5 w-5 text-blue-500" />
        )}
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
          {users.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-60 pr-2">
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No users currently assigned.</p>
        ) : (
          <ul className="space-y-3">
            {users.map(u => (
              <li key={u.id} className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 truncate">{u.email}</span>
                <span className="text-xs text-gray-400 capitalize">{u.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

async function DashboardContent() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, avatar_url, camera_enabled, microphone_enabled')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supervisor' && profile?.role !== 'admin') {
    redirect('/office') 
  }

  // 1. Fetch ALL users, including the new 'is_active' column
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, role, accessible_maps, is_active')
    .order('email')
    
  // 2. Filter ONLY ACTIVE users for the Map Directory cards
  const activeUsers = allUsers?.filter(u => u.is_active) || []
  
  const unassignedUsers = activeUsers.filter(u => !u.accessible_maps || u.accessible_maps.length === 0)
  const officeUsers = activeUsers.filter(u => u.accessible_maps?.includes('office'))
  const prayerRoomUsers = activeUsers.filter(u => u.accessible_maps?.includes('prayer-room'))
  const meetingRoomUsers = activeUsers.filter(u => u.accessible_maps?.includes('meeting-room'))

  const initialSettingsData = {
    avatar_url: profile.avatar_url,
    camera_enabled: profile.camera_enabled,
    microphone_enabled: profile.microphone_enabled
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.role === 'admin' ? 'Admin Dashboard' : 'Supervisor Dashboard'}
            </h1>
            <p className="text-gray-600">Manage your team and virtual office settings.</p>
          </div>
          <Link href="/office" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Back to Office
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-2 mb-10">
          <CreateUserForm />
          <AdminSettings initialData={initialSettingsData} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Active Map Directory</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MapAssignmentCard title="Main Office" users={officeUsers} />
            <MapAssignmentCard title="Meeting Room" users={meetingRoomUsers} />
            <MapAssignmentCard title="Prayer Room" users={prayerRoomUsers} />
            <MapAssignmentCard title="Unassigned Users" users={unassignedUsers} isUnassigned={true} />
          </div>
        </div>

        {/* 3. Render the new User Management Table, passing ALL users (active & inactive) */}
        <UserManagementTable users={allUsers || []} />

      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <p className="text-gray-500 font-medium">Loading dashboard and settings...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}