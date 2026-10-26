'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
  HashtagIcon,
  LockClosedIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import ChannelChatView from '@/components/channels/ChannelChatView'
import CreateChannelModal from '@/components/channels/CreateChannelModal'
import InviteMembersModal from '@/components/channels/InviteMembersModal'
import EditChannelModal from '@/components/channels/EditChannelModal'
import {
  fetchChannelsAction,
  fetchAllEmployeesAction,
  type Channel,
  type EmployeeProfile,
} from '@/app/office/channel-actions'

interface OfficeChannelsSidebarProps {
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  currentUserAvatarUrl?: string | null
  onlineUserIds?: string[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export default function OfficeChannelsSidebar({
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserAvatarUrl,
  onlineUserIds = [],
  isOpen,
  onToggle,
  onClose,
}: OfficeChannelsSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [searchChannel, setSearchChannel] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isMobileChatActive, setIsMobileChatActive] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [channelFilterTab, setChannelFilterTab] = useState<'all' | 'public' | 'private'>('all')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [mounted, setMounted] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'supervisor'

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Initial Load of Channels and Employees
  const loadData = useCallback(async () => {
    const [chRes, empRes] = await Promise.all([
      fetchChannelsAction(),
      fetchAllEmployeesAction(),
    ])

    if (chRes.success) {
      setChannels(chRes.channels)
      setSelectedChannel((prev) => {
        if (!prev && chRes.channels.length > 0) {
          return chRes.channels.find((c) => c.slug === 'general') || chRes.channels[0]
        }
        return prev
      })
    }

    if (empRes.success) {
      setEmployees(empRes.employees)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 2. Realtime listener for newly created channels or messages
  useEffect(() => {
    interface RealtimeMsgRow {
      id: string
      channel_id: string
      sender_id: string
    }

    const channelListener = supabase
      .channel('office_channels_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        () => {
          loadData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_members' },
        () => {
          loadData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        (payload) => {
          const newMsg = payload.new as RealtimeMsgRow
          if (newMsg.channel_id !== selectedChannel?.id && newMsg.sender_id !== currentUserId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelListener)
    }
  }, [selectedChannel?.id, currentUserId, supabase, loadData])

  // 3. Escape key listener to close or exit fullscreen
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFullscreen, onClose])

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel)
    setIsMobileChatActive(true)
    setUnreadCounts((prev) => ({
      ...prev,
      [channel.id]: 0,
    }))
  }

  const handleChannelUpdated = (updated: Channel) => {
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    if (selectedChannel?.id === updated.id) {
      setSelectedChannel(updated)
    }
  }

  const handleChannelDeleted = (deletedId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== deletedId))
    if (selectedChannel?.id === deletedId) {
      const general = channels.find((c) => c.slug === 'general')
      const remaining = channels.filter((c) => c.id !== deletedId)
      setSelectedChannel(general || remaining[0] || null)
    }
  }

  const totalUnreads = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0)

  const filteredChannels = channels
    .filter((ch) => ch.name.toLowerCase().includes(searchChannel.toLowerCase()))
    .filter((ch) => {
      if (channelFilterTab === 'public') return !ch.is_private
      if (channelFilterTab === 'private') return ch.is_private
      return true
    })

  const publicChannels = filteredChannels.filter((c) => !c.is_private)
  const privateChannels = filteredChannels.filter((c) => c.is_private)

  // Sort employees: online users first, then offline users
  const onlineSet = new Set(onlineUserIds)
  const onlineEmployees = employees.filter(
    (emp) => emp.id === currentUserId || onlineSet.has(emp.id)
  )
  const offlineEmployees = employees.filter(
    (emp) => emp.id !== currentUserId && !onlineSet.has(emp.id)
  )

  return (
    <>
      {/* ============================================================ */}
      {/* COLLAPSED MINI LAUNCHER PILL (Zero canvas obstruction)       */}
      {/* ============================================================ */}
      {!isOpen && (
        <div className="absolute left-6 top-6 z-30 flex items-center">
          <button
            onClick={onToggle}
            className="group relative flex items-center gap-2.5 rounded-2xl border border-purple-400/40 bg-gray-900/90 px-4 py-2.5 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:bg-purple-900/90 active:scale-95"
            title="Open Team Channels & Office Chat"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm font-bold text-xs">
              #
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-wide">Office Channels</span>
              <span className="text-[10px] text-purple-300 font-medium">
                {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
              </span>
            </div>

            {/* Unread Notification Badge */}
            {totalUnreads > 0 && (
              <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-gray-900 animate-pulse">
                {totalUnreads > 99 ? '99+' : totalUnreads}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* EXPANDED ELEVATE WORKSPACE MODAL / WORKSTATION               */}
      {/* ============================================================ */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <>
          <div
            ref={containerRef}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className={`fixed flex items-center justify-center transition-all duration-300 ${
              isFullscreen
                ? 'inset-0 z-50 p-0 sm:p-3 bg-black/80 backdrop-blur-md'
                : 'inset-x-2 sm:inset-x-auto sm:left-6 md:left-8 top-[72px] sm:top-[76px] md:top-[80px] bottom-20 sm:bottom-24 w-auto sm:w-[92vw] md:w-[88vw] lg:w-[84vw] xl:w-[80vw] max-w-6xl z-40'
            }`}
          >
            {/* Main Office Window Card */}
            <aside
              aria-label="Elevate Remote Office Channels"
              className={`relative flex h-full w-full overflow-hidden border border-zinc-700/80 bg-[#1A1D21] text-zinc-100 shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-all duration-200 ${
                isFullscreen
                  ? 'rounded-none sm:rounded-2xl'
                  : 'rounded-2xl sm:rounded-3xl'
              }`}
            >
            {/* ------------------------------------------------------------ */}
            {/* COLUMN 1: OFFICE CHANNELS & WORKSPACE NAVIGATION             */}
            {/* ------------------------------------------------------------ */}
            <div
              className={`flex flex-col border-r border-zinc-800 bg-[#19171D] shrink-0 transition-all duration-300 overscroll-contain select-none ${
                isMobileChatActive ? 'hidden sm:flex' : 'flex'
              } ${isSidebarCollapsed ? 'w-16' : 'w-full sm:w-64 md:w-72 lg:w-80'}`}
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Workspace Header */}
              <div className="flex h-14 items-center justify-between border-b border-zinc-800/90 px-4 py-2.5 bg-[#121016]">
                {!isSidebarCollapsed ? (
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600/15 p-1 ring-1 ring-purple-500/25 shadow-md">
                      <Image
                        src="/logo-icon.png"
                        alt="ERS Emblem"
                        width={24}
                        height={24}
                        className="object-contain drop-shadow"
                      />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-xs font-bold text-white tracking-wide">
                          ERS Office
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span>Team Workspace</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/15 p-1 ring-1 ring-purple-500/25">
                    <Image
                      src="/logo-icon.png"
                      alt="ERS Emblem"
                      width={22}
                      height={22}
                      className="object-contain drop-shadow"
                    />
                  </div>
                )}

                {/* Sidebar Collapse Toggle (Desktop only) */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden sm:flex rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 transition"
                    title={isSidebarCollapsed ? 'Expand channel sidebar' : 'Collapse channel sidebar'}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRightIcon className="h-4 w-4" />
                    ) : (
                      <ChevronLeftIcon className="h-4 w-4" />
                    )}
                  </button>

                  {/* Close button for mobile */}
                  <button
                    onClick={onClose}
                    className="sm:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                    title="Close"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Collapsed State Quick Rail */}
              {isSidebarCollapsed ? (
                <div className="flex flex-1 flex-col items-center gap-2 p-2 overflow-y-auto overscroll-contain">
                  {publicChannels.slice(0, 6).map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                        selectedChannel?.id === ch.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                      title={`#${ch.name}`}
                    >
                      <HashtagIcon className="h-5 w-5" />
                      {(unreadCounts[ch.id] || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#19171D]" />
                      )}
                    </button>
                  ))}
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:border-purple-400 hover:text-purple-400 transition"
                      title="Add Channel"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                /* Full Sidebar Content */
                <>
                  {/* Search & Channel Filters */}
                  <div className="p-3 border-b border-zinc-800/70 space-y-2">
                    <div className="relative flex items-center">
                      <MagnifyingGlassIcon className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={searchChannel}
                        onChange={(e) => setSearchChannel(e.target.value)}
                        placeholder="Search channels..."
                        className="w-full rounded-xl border border-zinc-800 bg-[#121016] py-1.5 pl-8 pr-7 text-xs text-zinc-200 placeholder-zinc-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      />
                      {searchChannel && (
                        <button
                          onClick={() => setSearchChannel('')}
                          className="absolute right-2 text-zinc-400 hover:text-zinc-200"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => setChannelFilterTab('all')}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                          channelFilterTab === 'all'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All ({channels.length})
                      </button>
                      <button
                        onClick={() => setChannelFilterTab('public')}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                          channelFilterTab === 'public'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Public
                      </button>
                      <button
                        onClick={() => setChannelFilterTab('private')}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition ${
                          channelFilterTab === 'private'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Private
                      </button>
                    </div>

                    {/* Admin Create Channel Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-purple-900/20 transition hover:from-purple-500 hover:to-indigo-500 active:scale-95"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span>Create Channel</span>
                      </button>
                    )}
                  </div>

                  {/* Scrollable Channels & Online List */}
                  <div
                    className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800"
                    style={{ overscrollBehavior: 'contain' }}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* --- PUBLIC CHANNELS --- */}
                    {(channelFilterTab === 'all' || channelFilterTab === 'public') && (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <HashtagIcon className="h-3 w-3 text-purple-400" />
                            Public Channels ({publicChannels.length})
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                              title="Add Channel"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {publicChannels.length === 0 ? (
                          <p className="px-2.5 py-1 text-xs text-zinc-500 italic">No channels found</p>
                        ) : (
                          publicChannels.map((ch) => {
                            const isSelected = selectedChannel?.id === ch.id
                            const unread = unreadCounts[ch.id] || 0

                            return (
                              <div
                                key={ch.id}
                                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 transition-all ${
                                  isSelected
                                    ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-950/40'
                                    : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectChannel(ch)}
                                  className="flex items-center gap-2 truncate flex-1 text-left py-0.5 focus:outline-none"
                                >
                                  <span
                                    className={`text-sm font-bold ${
                                      isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'
                                    }`}
                                  >
                                    #
                                  </span>
                                  <span className="truncate text-xs">{ch.name}</span>
                                </button>

                                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                  {unread > 0 && (
                                    <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
                                      {unread > 9 ? '9+' : unread}
                                    </span>
                                  )}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingChannel(ch)
                                        setIsEditModalOpen(true)
                                      }}
                                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition ${
                                        isSelected
                                          ? 'text-white/80 hover:text-white hover:bg-purple-700'
                                          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                      }`}
                                      title="Edit Channel (Admin)"
                                    >
                                      <Cog6ToothIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}

                    {/* --- PRIVATE CHANNELS --- */}
                    {(channelFilterTab === 'all' || channelFilterTab === 'private') && (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <LockClosedIcon className="h-3 w-3 text-amber-400" />
                            Private Channels ({privateChannels.length})
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                              title="Add Private Channel"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {privateChannels.length === 0 ? (
                          <p className="px-2.5 py-1 text-xs text-zinc-500 italic">No private channels</p>
                        ) : (
                          privateChannels.map((ch) => {
                            const isSelected = selectedChannel?.id === ch.id
                            const unread = unreadCounts[ch.id] || 0

                            return (
                              <div
                                key={ch.id}
                                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 transition-all ${
                                  isSelected
                                    ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-950/40'
                                    : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectChannel(ch)}
                                  className="flex items-center gap-2 truncate flex-1 text-left py-0.5 focus:outline-none"
                                >
                                  <LockClosedIcon
                                    className={`h-3.5 w-3.5 shrink-0 ${
                                      isSelected ? 'text-white' : 'text-amber-400/90'
                                    }`}
                                  />
                                  <span className="truncate text-xs">{ch.name}</span>
                                </button>

                                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                  {unread > 0 && (
                                    <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs">
                                      {unread > 9 ? '9+' : unread}
                                    </span>
                                  )}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingChannel(ch)
                                        setIsEditModalOpen(true)
                                      }}
                                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition ${
                                        isSelected
                                          ? 'text-white/80 hover:text-white hover:bg-purple-700'
                                          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                      }`}
                                      title="Edit Channel (Admin)"
                                    >
                                      <Cog6ToothIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}

                    {/* --- ONLINE TEAM MEMBERS --- */}
                    <div className="space-y-1 pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between px-2.5 py-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          Online Team ({onlineEmployees.length})
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        {onlineEmployees.map((emp) => {
                          const isMe = emp.id === currentUserId
                          const avatarSrc = isMe ? (currentUserAvatarUrl || emp.avatar_url) : emp.avatar_url
                          const displayName = emp.display_name || emp.email

                          return (
                            <div
                              key={emp.id}
                              className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="relative shrink-0">
                                  {avatarSrc ? (
                                    <img
                                      src={avatarSrc}
                                      alt={displayName}
                                      className="h-5 w-5 rounded-full object-cover ring-1 ring-zinc-700"
                                    />
                                  ) : (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-900 text-[9px] font-bold text-purple-200">
                                      {displayName[0]?.toUpperCase() || 'U'}
                                    </div>
                                  )}
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#19171D]" />
                                </div>
                                <span className="truncate">{displayName}</span>
                                {isMe && <span className="text-[10px] text-purple-400 font-semibold">(You)</span>}
                              </div>
                              <span className="rounded bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300 shrink-0">
                                Active
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* --- OFFLINE TEAM MEMBERS --- */}
                    {offlineEmployees.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between px-2.5 py-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-zinc-600" />
                            Offline ({offlineEmployees.length})
                          </span>
                        </div>

                        <div className="max-h-28 overflow-y-auto overscroll-contain space-y-0.5">
                          {offlineEmployees.map((emp) => {
                            const displayName = emp.display_name || emp.email
                            return (
                              <div
                                key={emp.id}
                                className="flex items-center justify-between rounded-xl px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-800/40 transition"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className="relative shrink-0">
                                    {emp.avatar_url ? (
                                      <img
                                        src={emp.avatar_url}
                                        alt={displayName}
                                        className="h-5 w-5 rounded-full object-cover opacity-60 ring-1 ring-zinc-800"
                                      />
                                    ) : (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-400">
                                        {displayName[0]?.toUpperCase() || 'U'}
                                      </div>
                                    )}
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-zinc-600 ring-1 ring-[#19171D]" />
                                  </div>
                                  <span className="truncate">{displayName}</span>
                                </div>
                                <span className="text-[9px] text-zinc-600 shrink-0">Away</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Footer */}
                  <div className="flex items-center justify-between border-t border-zinc-800/90 bg-[#121016] p-3">
                    <div className="flex items-center gap-2.5 truncate flex-1">
                      <div className="relative shrink-0">
                        {currentUserAvatarUrl ? (
                          <img
                            src={currentUserAvatarUrl}
                            alt={currentUserName}
                            className="h-8 w-8 rounded-xl object-cover shadow-sm ring-1 ring-purple-400/40"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                            {currentUserName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#121016]" />
                      </div>
                      <div className="truncate flex-1">
                        <p className="truncate text-xs font-bold text-zinc-200">{currentUserName}</p>
                        <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                          {currentUserRole}
                        </p>
                      </div>
                    </div>

                    {/* Fullscreen Toggle in Sidebar */}
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                      title={isFullscreen ? 'Restore window size' : 'Expand full screen'}
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="h-4 w-4" />
                      ) : (
                        <ArrowsPointingOutIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* COLUMN 2: ACTIVE CHANNEL CHAT STREAM                         */}
            {/* ------------------------------------------------------------ */}
            <div
              className={`flex-1 flex flex-col min-w-0 bg-[#222529] text-zinc-100 overscroll-contain ${
                !isMobileChatActive ? 'hidden sm:flex' : 'flex'
              }`}
              style={{ overscrollBehavior: 'contain' }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Mobile Back Button to Channels */}
              <div className="sm:hidden flex items-center justify-between border-b border-zinc-800 bg-[#1A1D21] px-3 py-2">
                <button
                  onClick={() => setIsMobileChatActive(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>Channels</span>
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-zinc-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {selectedChannel ? (
                <ChannelChatView
                  channel={selectedChannel}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  currentUserRole={currentUserRole}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  onOpenInvite={() => setIsInviteModalOpen(true)}
                  onOpenEdit={() => {
                    setEditingChannel(selectedChannel)
                    setIsEditModalOpen(true)
                  }}
                  onClose={onClose}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  isSidebarCollapsed={isSidebarCollapsed}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-purple-400 mb-3">
                    <ChatBubbleLeftRightIcon className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-300">Welcome to Elevate Channels</h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                    Select a channel from the left sidebar to read discussion threads, upload files, and collaborate.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ============================================================ */}
        {/* ADMIN MODALS                                                  */}
        {/* ============================================================ */}
        <CreateChannelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onChannelCreated={(newChan: Channel) => {
            setChannels((prev) => [...prev, newChan])
            setSelectedChannel(newChan)
          }}
          employees={employees}
          currentUserId={currentUserId}
        />

        <InviteMembersModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          channel={selectedChannel}
          employees={employees}
          onMembersInvited={loadData}
        />

        <EditChannelModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingChannel(null)
          }}
          channel={editingChannel || selectedChannel}
          onChannelUpdated={handleChannelUpdated}
          onChannelDeleted={handleChannelDeleted}
          employees={employees}
          currentUserId={currentUserId}
        />
      </>,
      document.body
    )}
  </>
)
}
