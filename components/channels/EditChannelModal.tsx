'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  HashtagIcon,
  LockClosedIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  updateChannelAction,
  deleteChannelAction,
  fetchChannelMembersAction,
  type EmployeeProfile,
  type Channel,
} from '@/app/office/channel-actions'

interface EditChannelModalProps {
  isOpen: boolean
  onClose: () => void
  channel: Channel | null
  onChannelUpdated: (channel: Channel) => void
  onChannelDeleted: (channelId: string) => void
  employees: EmployeeProfile[]
  currentUserId: string
}

export default function EditChannelModal({
  isOpen,
  onClose,
  channel,
  onChannelUpdated,
  onChannelDeleted,
  employees,
  currentUserId,
}: EditChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [searchMember, setSearchMember] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGeneral = channel?.slug === 'general'

  useEffect(() => {
    if (channel) {
      setName(channel.name)
      setDescription(channel.description || '')
      setIsPrivate(channel.is_private)
      setError(null)
      setShowDeleteConfirm(false)

      // Fetch existing members if private
      fetchChannelMembersAction(channel.id).then((res) => {
        if (res.success) {
          setSelectedMemberIds(res.members.map((m) => m.user_id))
        }
      })
    }
  }, [channel])

  if (!isOpen || !channel) return null

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

    const res = await updateChannelAction(channel.id, {
      name,
      description,
      is_private: isPrivate,
      newMemberIds: isPrivate ? selectedMemberIds : [],
    })

    setIsSubmitting(false)

    if (!res.success || !res.channel) {
      setError(res.error || 'Failed to update channel')
      return
    }

    onChannelUpdated(res.channel)
    onClose()
  }

  const handleDelete = async () => {
    if (isGeneral) return
    setIsDeleting(true)
    setError(null)

    const res = await deleteChannelAction(channel.id)
    setIsDeleting(false)

    if (!res.success) {
      setError(res.error || 'Failed to delete channel')
      return
    }

    onChannelDeleted(channel.id)
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md select-none"
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-700 bg-[#1A1D21] text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-[#16181C] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 font-bold text-white shadow-sm">
              {isPrivate ? <LockClosedIcon className="h-4 w-4" /> : <HashtagIcon className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit #{channel.name}</h3>
              <p className="text-xs text-zinc-400">Manage channel settings, privacy, and members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-zinc-800">
          {error && (
            <div className="rounded-xl bg-red-950/80 border border-red-800/80 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-500 font-mono text-sm">#</span>
              <input
                type="text"
                value={name}
                disabled={isGeneral}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                placeholder="e.g. general"
                required
                className="w-full rounded-xl border border-zinc-800 bg-[#121016] py-2.5 pl-8 pr-4 text-xs text-white placeholder-zinc-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {isGeneral ? (
              <p className="mt-1 text-[11px] text-amber-400">
                The name of the #general channel cannot be changed.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-zinc-500">
                Lowercase letters, numbers, and dashes only.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Description <span className="text-zinc-500 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-[#121016] p-3 text-xs text-white placeholder-zinc-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
            />
          </div>

          {/* Privacy Toggle (Public vs Private) */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121016] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200">
                  {isPrivate ? 'Private Channel' : 'Public Channel'}
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isPrivate
                    ? 'Only explicitly invited colleagues can view or join this channel.'
                    : 'Anyone in the organization can view, join, and post in this channel.'}
                </p>
              </div>

              <button
                type="button"
                disabled={isGeneral}
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isGeneral
                    ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                    : isPrivate
                    ? 'bg-purple-600'
                    : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {isGeneral && (
              <p className="mt-2 text-[10px] text-amber-400">
                #general must always remain a public channel.
              </p>
            )}
          </div>

          {/* Member Selection if Private */}
          {isPrivate ? (
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Channel Members <span className="text-purple-400">({selectedMemberIds.length})</span>
                </label>
                <span className="text-[10px] text-zinc-500">Restricted access</span>
              </div>
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search colleagues to add..."
                className="w-full rounded-xl border border-zinc-800 bg-[#121016] px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
              <div className="max-h-36 overflow-y-auto overscroll-contain space-y-1 rounded-xl border border-zinc-800 p-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                {filteredEmployees.length === 0 ? (
                  <p className="py-3 text-center text-xs text-zinc-500">No matching colleagues found</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedMemberIds.includes(emp.id)
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => handleToggleMember(emp.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                          isSelected
                            ? 'bg-purple-900/60 text-purple-200 font-semibold'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {emp.avatar_url ? (
                            <img
                              src={emp.avatar_url}
                              alt={emp.display_name || emp.email}
                              className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                            />
                          ) : (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-900 text-[9px] font-bold text-purple-200">
                              {((emp.display_name || emp.email)[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{emp.display_name || emp.email}</span>
                        </div>
                        {isSelected && <CheckIcon className="h-4 w-4 text-purple-400" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400 mb-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Automatic Membership
              </span>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                All team members have access to this channel automatically.
              </p>
            </div>
          )}

          {/* Delete Channel Zone */}
          {!isGeneral && (
            <div className="border-t border-zinc-800 pt-4">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete Channel</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-red-900/80 bg-red-950/60 p-4 space-y-3">
                  <div className="flex items-start gap-2 text-red-300">
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-200">Permanently Delete #{channel.name}?</h4>
                      <p className="text-[11px] text-red-300/80 mt-0.5 leading-relaxed">
                        This action cannot be undone. All messages and attachments in this channel will be permanently removed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Channel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-purple-500 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
