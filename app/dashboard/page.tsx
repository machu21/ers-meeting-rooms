import React, { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
  admin: 'bg-purple-50 text-purple-700',
  supervisor: 'bg-blue-50 text-blue-700',
  employee: 'bg-slate-100 text-slate-600'
}

function MapAssignmentCard({ title, users, isUnassigned = false }: { title: string, users: { id: string; email: string; role: string }[], isUnassigned?: boolean }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isUnassigned ? 'bg-amber-50' : 'bg-indigo-50'}`}>
          {isUnassigned ? (
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
          ) : (
            <UserGroupIcon className="h-4 w-4 text-indigo-600" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
          {users.length}
        </span>
      </div>

      <div className="max-h-60 flex-1 overflow-y-auto pr-1">
        {users.length === 0 ? (
          <p className="mt-6 text-center text-xs text-slate-400">No users currently assigned.</p>
        ) : (
          <ul className="space-y-2.5">
            {users.map(u => (
              <li key={u.id} className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                  {initials(u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ROLE_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              {profile.role === 'admin' ? 'Admin' : 'Supervisor'} Access
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {profile.role === 'admin' ? 'Admin Dashboard' : 'Supervisor Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Manage your team and virtual office settings.</p>
          </div>
          <Link
            href="/office"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Office
          </Link>
        </header>

        {/* Stat Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatPill icon={UsersIcon} label="Total Users" value={allUsers?.length || 0} tone="bg-indigo-50 text-indigo-600" />
          <StatPill icon={CheckCircleIcon} label="Active Users" value={activeUsers.length} tone="bg-emerald-50 text-emerald-600" />
          <StatPill icon={MapIcon} label="Maps In Use" value={3} tone="bg-blue-50 text-blue-600" />
          <StatPill icon={ExclamationTriangleIcon} label="Unassigned" value={unassignedUsers.length} tone="bg-amber-50 text-amber-600" />
        </div>

        {/* Forms */}
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          <CreateUserForm />
          <AdminSettings initialData={initialSettingsData} />
        </div>

        {/* Map Directory */}
        <div className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Map Directory</h2>
            <span className="text-xs font-medium text-slate-400">{activeUsers.length} active across all maps</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <MapAssignmentCard title="Main Office" users={officeUsers} />
            <MapAssignmentCard title="Meeting Room" users={meetingRoomUsers} />
            <MapAssignmentCard title="Prayer Room" users={prayerRoomUsers} />
            <MapAssignmentCard title="Unassigned Users" users={unassignedUsers} isUnassigned={true} />
          </div>
        </div>

        <UserManagementTable users={allUsers || []} />

      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
            <p className="text-sm font-medium">Loading dashboard and settings...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}