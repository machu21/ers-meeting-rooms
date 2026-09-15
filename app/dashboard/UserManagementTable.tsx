'use client'

import { useState, useTransition, useEffect } from 'react'
import { updateUser, toggleUserStatus, resetUserPassword, fetchUserLogs } from './actions'
import { 
  PencilSquareIcon, 
  TrashIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid'

type User = {
  id: string
  email: string
  role: string
  accessible_maps: string[]
  is_active: boolean
}

type LogEntry = {
  id: string
  created_at: string
  level: string
  source: string
  message: string
  metadata: Record<string, unknown>
}

function UserRow({ 
  user, 
  onResetPassword, 
  onViewLogs 
}: { 
  user: User, 
  onResetPassword: (id: string) => void,
  onViewLogs: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleUpdate = async (formData: FormData) => {
    startTransition(async () => {
      await updateUser(user.id, formData)
      setIsEditing(false)
    })
  }

  const handleToggleStatus = () => {
    if (user.is_active && !confirm('Are you sure you want to deactivate this user? They will be removed from the virtual office.')) return
    startTransition(async () => {
      await toggleUserStatus(user.id, user.is_active)
    })
  }

  if (isEditing) {
    return (
      <tr className="border-b border-white/50 bg-white/70 backdrop-blur-sm transition-all">
        <td colSpan={4} className="p-4">
          <form action={handleUpdate} className="flex flex-col gap-4 md:flex-row md:items-center rounded-2xl bg-white/50 p-4 ring-1 ring-indigo-200 shadow-sm">
            <div className="flex-[1.5]">
              <span className="text-sm font-bold text-slate-800">{user.email}</span>
            </div>
            
            <div className="flex-1">
              <select name="role" defaultValue={user.role} className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100">
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex-[2] flex flex-wrap gap-2">
              {['office', 'prayer-room', 'meeting-room'].map(mapId => (
                <label key={mapId} className="group relative flex cursor-pointer items-center justify-center rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 shadow-sm transition-all has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 hover:bg-white/80">
                  <input type="checkbox" name="maps" value={mapId} defaultChecked={user.accessible_maps?.includes(mapId)} className="peer sr-only" />
                  <span className="text-xs font-bold text-slate-600 transition-colors peer-checked:text-indigo-700">{mapId.replace('-', ' ')}</span>
                  <div className="absolute inset-0 rounded-lg ring-2 ring-transparent transition-all peer-checked:ring-indigo-200"></div>
                </label>
              ))}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/50 text-slate-500 transition-colors hover:bg-slate-300/50 hover:text-slate-700 disabled:opacity-50">
                <XMarkIcon className="h-5 w-5" />
              </button>
              <button type="submit" disabled={isPending} className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md transition-all hover:scale-105 hover:bg-indigo-700 disabled:opacity-50">
                {isPending ? (
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`group border-b border-white/40 transition-colors ${!user.is_active ? 'bg-red-50/30 text-slate-500' : 'hover:bg-white/60 text-slate-700'}`}>
      <td className="p-4 text-sm font-semibold">
        {user.email} 
        {!user.is_active && <span className="ml-3 inline-flex items-center rounded-full bg-red-100/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-700 ring-1 ring-red-200">Deactivated</span>}
      </td>
      <td className="p-4 text-xs font-black uppercase tracking-widest">{user.role}</td>
      <td className="p-4 text-sm font-medium">
        <div className="flex flex-wrap gap-1.5">
          {user.accessible_maps?.length ? user.accessible_maps.map(mapId => (
            <span key={mapId} className="rounded-md bg-white/50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/50">{mapId.replace('-', ' ')}</span>
          )) : <span className="text-slate-400">None</span>}
        </div>
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <button 
            onClick={() => onViewLogs(user.id)} 
            title="Activity Logs"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 text-sky-500 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-sky-700 hover:shadow disabled:opacity-30"
          >
            <DocumentTextIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onResetPassword(user.id)} 
            title="Reset Password"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 text-amber-500 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-amber-700 hover:shadow disabled:opacity-30"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsEditing(true)} 
            disabled={isPending || !user.is_active} 
            title="Edit User"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 text-indigo-500 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-indigo-700 hover:shadow disabled:opacity-30"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToggleStatus} 
            disabled={isPending} 
            title={user.is_active ? "Soft Delete" : "Reactivate"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:shadow disabled:opacity-30 ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'}`}
          >
            {isPending ? (
              <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : user.is_active ? (
              <TrashIcon className="h-4 w-4" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function UserManagementTable({ users }: { users: User[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  
  // Modal State
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [viewLogsUserId, setViewLogsUserId] = useState<string | null>(null)
  const [userLogs, setUserLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  const handleOpenLogs = async (userId: string) => {
    setViewLogsUserId(userId)
    setLogsLoading(true)
    const { success, logs } = await fetchUserLogs(userId)
    if (success) {
      setUserLogs(logs)
    }
    setLogsLoading(false)
  }

  const handleResetPasswordSubmit = async (formData: FormData) => {
    if (!resetUserId) return
    startTransition(async () => {
      const { success, message } = await resetUserPassword(resetUserId, formData)
      if (success) {
        alert(message)
        setResetUserId(null)
      } else {
        alert(message)
      }
    })
  }

  const selectedUserForReset = users.find(u => u.id === resetUserId)
  const selectedUserForLogs = users.find(u => u.id === viewLogsUserId)

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        
        {/* Header & Search Bar Area */}
        <div className="flex flex-col gap-4 border-b border-white/50 bg-white/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">User Management</h2>
            <span className="text-sm font-medium text-slate-500">Directory of {users.length} members</span>
          </div>
          
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-sm transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>
        
        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-white/40 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="p-4 w-1/3">Email</th>
                <th className="p-4 w-1/6">Role</th>
                <th className="p-4 w-1/3">Accessible Maps</th>
                <th className="p-4 w-1/6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {paginatedUsers.map(user => (
                <UserRow 
                  key={user.id} 
                  user={user} 
                  onResetPassword={setResetUserId} 
                  onViewLogs={handleOpenLogs} 
                />
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-sm font-semibold text-slate-500">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/50 ring-1 ring-black/5">
                      <MagnifyingGlassIcon className="h-6 w-6 text-slate-400" />
                    </div>
                    {searchQuery ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/50 bg-white/30 px-5 py-4">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Showing <span className="font-bold text-slate-700">{startIndex + 1}</span> to <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
                  <span className="font-bold text-slate-700">{filteredUsers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm ring-1 ring-black/5" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-xl bg-white/60 px-2 py-2 text-slate-400 transition hover:bg-white hover:text-slate-600 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  <span className="relative inline-flex items-center bg-white/60 px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-inset ring-slate-200/50">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-xl bg-white/60 px-2 py-2 text-slate-400 transition hover:bg-white hover:text-slate-600 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/70 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/50 bg-white/50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 shadow-inner">
                <KeyIcon className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800">Reset Password</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                For user <span className="font-bold text-slate-700">{selectedUserForReset?.email}</span>
              </p>
            </div>
            
            <form action={handleResetPasswordSubmit} className="p-6">
              <div className="mb-6">
                <label className="mb-2 block text-sm font-bold text-slate-700">New Password</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  minLength={6}
                  className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm font-semibold shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter at least 6 characters"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setResetUserId(null)}
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-slate-200/50 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-300/50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewLogsUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity">
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/70 shadow-2xl backdrop-blur-xl" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between border-b border-white/50 bg-white/50 px-6 py-4">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
                  <DocumentTextIcon className="h-6 w-6 text-sky-500" /> Activity Logs
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  <span className="font-bold text-slate-700">{selectedUserForLogs?.email}</span>
                </p>
              </div>
              <button 
                onClick={() => setViewLogsUserId(null)}
                className="rounded-full bg-slate-200/50 p-2 text-slate-500 transition hover:bg-slate-300/50 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {logsLoading ? (
                <div className="flex h-32 items-center justify-center text-sm font-bold text-slate-400">
                  Loading logs...
                </div>
              ) : userLogs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm font-bold text-slate-400">
                  No activity logs found for this user.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200/50 pl-6 ml-3 space-y-8">
                  {userLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className={`absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warn' ? 'bg-amber-500' :
                        log.level === 'debug' ? 'bg-slate-400' :
                        'bg-sky-500'
                      }`} />
                      
                      <div className="flex flex-col gap-1 rounded-2xl bg-white/50 p-4 ring-1 ring-black/5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{log.source}</span>
                          <time className="text-xs font-semibold text-slate-400">{new Date(log.created_at).toLocaleString()}</time>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{log.message}</p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="mt-2 rounded-xl bg-white/60 p-3 text-xs font-medium text-slate-600 shadow-inner overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}