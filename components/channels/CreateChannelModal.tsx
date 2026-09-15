'use client'

import { useState } from 'react'
import { XMarkIcon, HashtagIcon, LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { createChannelAction, type EmployeeProfile, type Channel } from '@/app/office/channel-actions'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onChannelCreated: (channel: Channel) => void
  employees: EmployeeProfile[]
  currentUserId: string
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onChannelCreated,
  employees,
  currentUserId,
}: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [searchMember, setSearchMember] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a channel name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const res = await createChannelAction({
      name,
      description,
      is_private: isPrivate,
      initialMemberIds: isPrivate ? selectedMemberIds : [],
    })

    setIsSubmitting(false)

    if (!res.success || !res.channel) {
      setError(res.error || 'Failed to create channel')
      return
    }

    onChannelCreated(res.channel)
    onClose()
  }

  const otherEmployees = employees.filter((emp) => emp.id !== currentUserId)
  const filteredEmployees = otherEmployees.filter((emp) => {
    const term = searchMember.toLowerCase()
    return (
      (emp.display_name && emp.display_name.toLowerCase().includes(term)) ||
      emp.email.toLowerCase().includes(term)
    )
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-purple-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
              {isPrivate ? <LockClosedIcon className="h-4 w-4" /> : <HashtagIcon className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Create a Channel</h3>
              <p className="text-xs text-gray-500">Channels are where team members communicate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-gray-400 font-mono text-sm">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                placeholder="e.g. design-updates"
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Lowercase letters, numbers, and dashes only.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900">Make Private</span>
                <p className="text-xs text-gray-500">
                  {isPrivate
                    ? 'Only invited members can view or join this channel'
                    : 'Anyone in the organization can view and join this channel'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  isPrivate ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Member Selection: Only for Private Channels; Public channels automatically include everyone */}
          {isPrivate ? (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Invite Initial Members <span className="text-purple-600">({selectedMemberIds.length} selected)</span>
                </label>
                <span className="text-[11px] text-gray-400">Manual invite only</span>
              </div>
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search colleagues by name or email..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:bg-white focus:outline-none"
              />
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-gray-100 p-1">
                {filteredEmployees.length === 0 ? (
                  <p className="py-3 text-center text-xs text-gray-400">No matching colleagues found</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedMemberIds.includes(emp.id)
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => handleToggleMember(emp.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                          isSelected ? 'bg-purple-100/70 text-purple-900 font-medium' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {emp.avatar_url ? (
                            <img
                              src={emp.avatar_url}
                              alt={emp.display_name || emp.email}
                              className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-purple-200"
                            />
                          ) : (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-[10px] font-bold text-purple-700">
                              {((emp.display_name || emp.email)[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{emp.display_name || emp.email}</span>
                        </div>
                        {isSelected && <CheckIcon className="h-4 w-4 text-purple-700" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Automatic Membership Active
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                All {employees.length} current team members (and any future colleagues) will be automatically added to this public channel.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-purple-700 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
