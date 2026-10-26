import React, { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CreateUserForm from './CreateUserForm'
import AdminSettings from './AdminSettings'
import UserManagementTable from './UserManagementTable'
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  UsersIcon,
  CheckCircleIcon,
  MapIcon
} from '@heroicons/react/24/solid'

function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  supervisor: 'bg-blue-100 text-blue-700 border border-blue-200',
  employee: 'bg-slate-100 text-slate-700 border border-slate-200'
}

function MapAssignmentCard({ title, users, isUnassigned = false }: { title: string, users: { id: string; email: string; role: string }[], isUnassigned?: boolean }) {
  return (
    <div className="group flex h-full flex-col rounded-3xl border border-white/60 bg-white/40 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="mb-4 flex items-center gap-3 border-b border-white/50 pb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110 ${isUnassigned ? 'bg-amber-100/80 text-amber-600' : 'bg-indigo-100/80 text-indigo-600'}`}>
          {isUnassigned ? (
            <ExclamationTriangleIcon className="h-5 w-5" />
          ) : (
            <UserGroupIcon className="h-5 w-5" />
          )}
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="ml-auto rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-black tracking-tight text-slate-700 shadow-sm ring-1 ring-black/5">
          {users.length}
        </span>
      </div>

      <div className="max-h-60 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {users.length === 0 ? (
          <p className="mt-6 text-center text-xs font-medium text-slate-400">No users currently assigned.</p>
        ) : (
          <ul className="space-y-3">
            {users.map(u => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-white">
                  {initials(u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${ROLE_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>, label: string, value: number, tone: string }) {
  return (
    <div className="group flex items-center gap-4 rounded-3xl border border-white/60 bg-white/40 px-6 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
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

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, role, accessible_maps, is_active')
    .order('email')

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 p-6 lg:p-10 relative overflow-hidden">
      {/* Decorative blurred blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px]"></div>
      <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-purple-400/10 blur-[100px]"></div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-400/10 blur-[100px]"></div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 p-2.5 shadow-md shadow-purple-500/10 ring-1 ring-purple-600/15 backdrop-blur-md">
              <Image src="/logo-icon.png" alt="ERS Office Emblem" width={48} height={48} className="object-contain drop-shadow transition-transform hover:scale-105" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-600">
                ERS Office • {profile.role === 'admin' ? 'Admin' : 'Supervisor'} Portal
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {profile.role === 'admin' ? 'Admin Dashboard' : 'Supervisor Dashboard'}
              </h1>
            </div>
          </div>
          <Link
            href="/office"
            className="group flex items-center gap-2 rounded-xl border border-white/60 bg-white/40 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md"
          >
            <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Office
          </Link>
        </header>

        {/* Stat Summary */}
        <div className="mb-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatPill icon={UsersIcon} label="Total Users" value={allUsers?.length || 0} tone="bg-indigo-100/80 text-indigo-600 border border-indigo-200" />
          <StatPill icon={CheckCircleIcon} label="Active Users" value={activeUsers.length} tone="bg-emerald-100/80 text-emerald-600 border border-emerald-200" />
          <StatPill icon={MapIcon} label="Maps In Use" value={3} tone="bg-blue-100/80 text-blue-600 border border-blue-200" />
          <StatPill icon={ExclamationTriangleIcon} label="Unassigned" value={unassignedUsers.length} tone="bg-amber-100/80 text-amber-600 border border-amber-200" />
        </div>

        {/* Forms */}
        <div className="mb-12 grid gap-6 lg:grid-cols-2">
          <CreateUserForm />
          <AdminSettings initialData={initialSettingsData} />
        </div>

        {/* Map Directory */}
        <div className="mb-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Active Map Directory</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Live distribution of active team members</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MapAssignmentCard title="Main Office" users={officeUsers} />
            <MapAssignmentCard title="Meeting Room" users={meetingRoomUsers} />
            <MapAssignmentCard title="Prayer Room" users={prayerRoomUsers} />
            <MapAssignmentCard title="Unassigned Users" users={unassignedUsers} isUnassigned={true} />
          </div>
        </div>

        <UserManagementTable users={allUsers || []} />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            <p className="text-sm font-bold animate-pulse">Loading dashboard environment...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}