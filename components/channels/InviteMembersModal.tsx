'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, UserPlusIcon, CheckIcon, HashtagIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import {
  inviteMembersAction,
  fetchChannelMembersAction,
  type EmployeeProfile,
  type Channel,
  type ChannelMember,
} from '@/app/office/channel-actions'

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  channel: Channel | null
  employees: EmployeeProfile[]
  onMembersInvited?: () => void
}

export default function InviteMembersModal({
  isOpen,
  onClose,
  channel,
  employees,
  onMembersInvited,
}: InviteMembersModalProps) {
  const [currentMembers, setCurrentMembers] = useState<ChannelMember[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && channel) {
      setIsLoadingMembers(true)
      setSelectedUserIds([])
      setError(null)
      setSuccessMsg(null)
      fetchChannelMembersAction(channel.id).then((res) => {
        setIsLoadingMembers(false)
        if (res.success) {
          setCurrentMembers(res.members)
        }
      })
    }
  }, [isOpen, channel])

  if (!isOpen || !channel) return null

  const existingMemberIds = new Set(currentMembers.map((m) => m.user_id))

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) return
    setIsSubmitting(true)
    setError(null)

    const res = await inviteMembersAction(channel.id, selectedUserIds)
    setIsSubmitting(false)

    if (!res.success) {
      setError(res.error || 'Failed to invite members')
      return
    }

    setSuccessMsg(`Successfully invited ${res.addedCount} team members!`)
    if (onMembersInvited) onMembersInvited()

    setTimeout(() => {
      onClose()
    }, 900)
  }

  const filteredEmployees = employees.filter((emp) => {
    const term = search.toLowerCase()
    return (
      (emp.display_name && emp.display_name.toLowerCase().includes(term)) ||
      emp.email.toLowerCase().includes(term)
    )
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-purple-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
              <UserPlusIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                Add people to{' '}
                <span className="text-purple-700 inline-flex items-center gap-0.5">
                  {channel.is_private ? (
                    <LockClosedIcon className="h-3.5 w-3.5" />
                  ) : (
                    <HashtagIcon className="h-3.5 w-3.5" />
                  )}
                  {channel.name}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                {channel.is_private ? 'Private channel — members can read all messages' : 'Public channel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              {successMsg}
            </div>
          )}

          {!channel.is_private && (
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-800 space-y-0.5">
              <p className="font-semibold text-blue-900">Public Channel</p>
              <p className="text-[11px] text-blue-700">
                All organization members are automatically enrolled in public channels.
              </p>
            </div>
          )}

          {/* Search Box */}
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search colleagues by name or email..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {/* Employee List */}
          <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-gray-100 p-1">
            {isLoadingMembers ? (
              <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                Loading members...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No colleagues found</p>
            ) : (
              filteredEmployees.map((emp) => {
                const isAlreadyMember = existingMemberIds.has(emp.id)
                const isSelected = selectedUserIds.includes(emp.id)

                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isAlreadyMember}
                    onClick={() => toggleSelectUser(emp.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      isAlreadyMember
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                        : isSelected
                        ? 'bg-purple-100 text-purple-900 font-medium'
                        : 'hover:bg-purple-50/60 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.display_name || emp.email}
                          className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-purple-200"
                        />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-200 text-xs font-bold text-purple-700">
                          {((emp.display_name || emp.email)[0] || 'U').toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="truncate font-medium text-gray-800">{emp.display_name || emp.email}</p>
                        <p className="truncate text-[10px] text-gray-400">{emp.email}</p>
                      </div>
                    </div>

                    <div>
                      {isAlreadyMember ? (
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Joined
                        </span>
                      ) : isSelected ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-purple-600">Select</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">
              {selectedUserIds.length} person(s) selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={isSubmitting || selectedUserIds.length === 0}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-purple-700 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  'Add to Channel'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
