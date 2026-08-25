'use client'

import { useState, useTransition, useEffect } from 'react'
import { updateUser, toggleUserStatus } from './actions'
import { 
  PencilSquareIcon, 
  TrashIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid'

type User = {
  id: string
  email: string
  role: string
  accessible_maps: string[]
  is_active: boolean
}

// Extracted Row Component to handle individual editing state
function UserRow({ user }: { user: User }) {
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
      <tr className="border-b bg-blue-50/30">
        <td colSpan={4} className="p-4">
          <form action={handleUpdate} className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">{user.email}</span>
            </div>
            
            <div className="flex-1">
              <select name="role" defaultValue={user.role} className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex-[2] flex flex-wrap gap-3">
              {['office', 'prayer-room', 'meeting-room'].map(mapId => (
                <label key={mapId} className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" name="maps" value={mapId} defaultChecked={user.accessible_maps?.includes(mapId)} className="w-4 h-4 text-blue-600" />
                  {mapId.replace('-', ' ')}
                </label>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
              <button type="button" onClick={() => setIsEditing(false)} disabled={isPending} className="rounded bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b transition-colors ${!user.is_active ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
      <td className="p-4 text-sm font-medium text-gray-800">
        {user.email} 
        {!user.is_active && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase tracking-wide">Deactivated</span>}
      </td>
      <td className="p-4 text-sm text-gray-600 capitalize">{user.role}</td>
      <td className="p-4 text-sm text-gray-500">
        {user.accessible_maps?.join(', ') || 'None'}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => setIsEditing(true)} 
            disabled={isPending || !user.is_active} 
            title="Edit User"
            className="text-blue-500 hover:text-blue-700 disabled:opacity-30 transition"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button 
            onClick={handleToggleStatus} 
            disabled={isPending} 
            title={user.is_active ? "Soft Delete" : "Reactivate"}
            className={`transition ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}
          >
            {user.is_active ? <TrashIcon className="h-5 w-5" /> : <ArrowPathIcon className="h-5 w-5" />}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function UserManagementTable({ users }: { users: User[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 // Adjust this number to show more/less users per page

  // Filter users based on email or role
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Reset to page 1 whenever a search is typed
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // PAGINATION MATH
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm mt-8">
      
      {/* Header & Search Bar Area */}
      <div className="p-5 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">User Management</h2>
          <span className="text-sm text-gray-500">Total Users: {users.length}</span>
        </div>
        
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border py-2 pl-10 pr-4 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-white text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
            <tr>
              <th className="p-4 w-1/3">Email</th>
              <th className="p-4 w-1/6">Role</th>
              <th className="p-4 w-1/3">Accessible Maps</th>
              <th className="p-4 w-1/6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <UserRow key={user.id} user={user} />
            ))}
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  {searchQuery ? "No users match your search." : "No users found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
                <span className="font-medium">{filteredUsers.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page Indicators */}
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}