'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HashtagIcon,
  LockClosedIcon,
  UserPlusIcon,
  UsersIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  FaceSmileIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Bars3BottomLeftIcon,
  StarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import AttachmentUploader from '@/components/channels/AttachmentUploader'
import {
  fetchChannelMessagesAction,
  sendChannelMessageAction,
  deleteChannelMessageAction,
  fetchChannelMembersAction,
  type Channel,
  type ChannelMessage,
  type ChannelMember,
  type AttachmentItem,
} from '@/app/office/channel-actions'

interface ChannelChatViewProps {
  channel: Channel
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  currentUserAvatarUrl?: string | null
  onOpenInvite?: () => void
  onOpenEdit?: () => void
  onClose?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onToggleSidebar?: () => void
  isSidebarCollapsed?: boolean
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '🙌']

export default function ChannelChatView({
  channel,
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserAvatarUrl,
  onOpenInvite,
  onOpenEdit,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  onToggleSidebar,
  isSidebarCollapsed,
}: ChannelChatViewProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [inputValue, setInputValue] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showMembersDrawer, setShowMembersDrawer] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Realtime optimistic reactions: messageId -> { emoji: userIds[] }
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({})

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'supervisor'

  // 1. Fetch initial messages & members
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    Promise.all([
      fetchChannelMessagesAction(channel.id),
      fetchChannelMembersAction(channel.id),
    ]).then(([msgRes, memRes]) => {
      if (!isMounted) return
      setIsLoading(false)
      if (msgRes.success) setMessages(msgRes.messages)
      if (memRes.success) setMembers(memRes.members)
    })

    return () => {
      isMounted = false
    }
  }, [channel.id])

  // 2. Realtime listener for channel messages & live reactions
  useEffect(() => {
    interface RealtimeMessagePayload {
      id: string
      channel_id: string
      sender_id: string
      content: string
      attachments?: AttachmentItem[] | null
      created_at: string
      updated_at: string
    }

    const realtimeChannel = supabase
      .channel(`channel_stream_${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as RealtimeMessagePayload

          if (newMsg.sender_id !== currentUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, display_name, email, avatar_url, role')
              .eq('id', newMsg.sender_id)
              .single()

            const formatted: ChannelMessage = {
              id: newMsg.id,
              channel_id: newMsg.channel_id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              attachments: Array.isArray(newMsg.attachments) ? newMsg.attachments : [],
              created_at: newMsg.created_at,
              updated_at: newMsg.updated_at,
              sender: profile || undefined,
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === formatted.id)) return prev
              return [...prev, formatted]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        }
      )
      .on('broadcast', { event: 'reaction-toggle' }, (payload) => {
        const { messageId, emoji, userId } = payload.payload as {
          messageId: string
          emoji: string
          userId: string
        }
        setReactions((prev) => {
          const msgReactions = { ...(prev[messageId] || {}) }
          const currentUsers = msgReactions[emoji] || []
          const hasReacted = currentUsers.includes(userId)

          if (hasReacted) {
            msgReactions[emoji] = currentUsers.filter((id) => id !== userId)
            if (msgReactions[emoji].length === 0) delete msgReactions[emoji]
          } else {
            msgReactions[emoji] = [...currentUsers, userId]
          }

          return { ...prev, [messageId]: msgReactions }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [channel.id, currentUserId, supabase])

  // 3. Auto-scroll strictly inside message container
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  // 4. Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue, adjustTextareaHeight])

  // 5. Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed && pendingAttachments.length === 0) return
    if (isSending) return

    setIsSending(true)
    const attachmentsToSend = [...pendingAttachments]

    setInputValue('')
    setPendingAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const res = await sendChannelMessageAction(channel.id, trimmed, attachmentsToSend)
    setIsSending(false)

    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev
        return [...prev, res.message!]
      })
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
      }, 50)
    } else {
      setInputValue(trimmed)
      setPendingAttachments(attachmentsToSend)
      alert(res.error || 'Failed to send message')
    }
  }

  // 6. Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message for everyone in this channel?')) return
    const res = await deleteChannelMessageAction(messageId)
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
  }

  // 7. Toggle emoji reaction (with Realtime broadcast)
  const handleToggleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) }
      const currentUsers = msgReactions[emoji] || []
      const hasReacted = currentUsers.includes(currentUserId)

      if (hasReacted) {
        msgReactions[emoji] = currentUsers.filter((id) => id !== currentUserId)
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji]
      } else {
        msgReactions[emoji] = [...currentUsers, currentUserId]
      }

      return { ...prev, [messageId]: msgReactions }
    })

    // Broadcast reaction
    const channelBroadcast = supabase.channel(`channel_stream_${channel.id}`)
    channelBroadcast.send({
      type: 'broadcast',
      event: 'reaction-toggle',
      payload: { messageId, emoji, userId: currentUserId, userName: currentUserName },
    })
  }

  // 8. Copy message text
  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  // Formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = el.value.substring(start, end)
    const replacement = `${prefix}${selected || 'text'}${suffix || prefix}`
    const newValue = el.value.substring(0, start) + replacement + el.value.substring(end)
    setInputValue(newValue)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4))
    }, 10)
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filteredMessages = searchFilter.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchFilter.trim().toLowerCase())
      )
    : messages

  return (
    <div
      className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#1E2024] text-zinc-100 select-text overscroll-contain"
      style={{ overscrollBehavior: 'contain' }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* ============================================================ */}
      {/* 1. CHANNEL HEADER BAR                                        */}
      {/* ============================================================ */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/90 bg-[#1A1D21] px-4 py-2.5 shadow-sm select-none">
        <div className="flex items-center gap-3 truncate">
          {/* Sidebar Toggle for Desktop */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden sm:flex rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
              title={isSidebarCollapsed ? 'Expand channel list' : 'Collapse channel list'}
            >
              <Bars3BottomLeftIcon className="h-4 w-4" />
            </button>
          )}

          {/* Channel Name & Star */}
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-zinc-400 font-bold text-base">
              {channel.is_private ? (
                <LockClosedIcon className="h-4 w-4 text-amber-400" />
              ) : (
                <HashtagIcon className="h-4 w-4 text-purple-400" />
              )}
            </span>
            <h2 className="truncate text-sm font-bold text-white tracking-wide">
              {channel.name}
            </h2>
            <button
              onClick={() => setIsStarred(!isStarred)}
              className="p-1 text-zinc-400 hover:text-amber-400 transition"
              title={isStarred ? 'Unstar channel' : 'Star channel'}
            >
              {isStarred ? (
                <StarIconSolid className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <StarIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Channel Description / Topic */}
          {channel.description && (
            <div className="hidden lg:flex items-center gap-2 border-l border-zinc-800 pl-3">
              <p className="truncate text-xs text-zinc-400 max-w-sm">
                {channel.description}
              </p>
            </div>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Channel Search Toggle */}
          <button
            onClick={() => setShowSearchBox(!showSearchBox)}
            className={`rounded-lg p-1.5 transition ${
              showSearchBox
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            title="Search in this channel"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </button>

          {/* Members Count & Avatar Stack */}
          <button
            onClick={() => setShowMembersDrawer(!showMembersDrawer)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#222529] px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-95"
            title="View channel members"
          >
            <UsersIcon className="h-3.5 w-3.5 text-purple-400" />
            <span>{members.length || 1}</span>
          </button>

          {/* Admin Invite Button */}
          {isAdmin && onOpenInvite && (
            <button
              onClick={onOpenInvite}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-purple-500 active:scale-95"
              title="Add colleagues to channel"
            >
              <UserPlusIcon className="h-3.5 w-3.5" />
              <span>Invite</span>
            </button>
          )}

          {/* Admin Edit Channel Settings Button */}
          {isAdmin && onOpenEdit && (
            <button
              onClick={onOpenEdit}
              className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#222529] p-1.5 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition"
              title="Edit Channel Settings & Privacy (Admin)"
            >
              <Cog6ToothIcon className="h-4 w-4 text-purple-400" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="hidden sm:flex rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-4 w-4" />
              ) : (
                <ArrowsPointingOutIcon className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              title="Close (Esc)"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* In-Channel Search Filter Box */}
      {showSearchBox && (
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-[#16181C] px-4 py-2">
          <MagnifyingGlassIcon className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={`Search messages in #${channel.name}...`}
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          {searchFilter && (
            <span className="text-[10px] text-purple-400 font-semibold">
              {filteredMessages.length} found
            </span>
          )}
          <button
            onClick={() => {
              setSearchFilter('')
              setShowSearchBox(false)
            }}
            className="text-zinc-400 hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MEMBERS DRAWER OVERLAY                                    */}
      {/* ============================================================ */}
      {showMembersDrawer && (
        <div
          className="absolute right-0 top-14 bottom-0 z-30 w-72 border-l border-zinc-800 bg-[#1A1D21] p-4 shadow-2xl backdrop-blur-2xl overscroll-contain"
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Members ({members.length})
            </h4>
            <button
              onClick={() => setShowMembersDrawer(false)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100%-40px)] overflow-y-auto overscroll-contain space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {members.map((mem) => {
              const memName = mem.profile?.display_name || mem.profile?.email || 'Colleague'
              const memAvatar = mem.profile?.avatar_url
              return (
                <div
                  key={mem.id}
                  className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-zinc-800/60 transition"
                >
                  {memAvatar ? (
                    <img
                      src={memAvatar}
                      alt={memName}
                      className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-zinc-700"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-900 font-bold text-xs text-purple-200">
                      {(memName[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <p className="truncate text-xs font-semibold text-zinc-200">{memName}</p>
                    <span className="text-[10px] text-zinc-400 capitalize">
                      {mem.role}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MESSAGE STREAM                                            */}
      {/* ============================================================ */}
      <div
        ref={scrollContainerRef}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 select-text"
        style={{ overscrollBehavior: 'contain' }}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-purple-400 mb-3 shadow-inner">
              {channel.is_private ? (
                <LockClosedIcon className="h-7 w-7" />
              ) : (
                <HashtagIcon className="h-7 w-7" />
              )}
            </div>
            <h3 className="text-base font-bold text-zinc-200">
              Welcome to #{channel.name}!
            </h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {channel.description ||
                `This is the start of the #${channel.name} channel. Send a message, react, or share files!`}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId
            const senderName =
              msg.sender?.display_name || msg.sender?.email?.split('@')[0] || 'Colleague'
            const senderRole = msg.sender?.role || 'employee'
            const senderAvatarUrl =
              msg.sender?.avatar_url || (isMe ? currentUserAvatarUrl : null)
            const prevMsg = filteredMessages[index - 1]

            // Day divider
            const showDate =
              !prevMsg || formatDate(prevMsg.created_at) !== formatDate(msg.created_at)

            // Consecutive message grouping (messages by same user within 5 minutes)
            const isGrouped =
              !showDate &&
              prevMsg &&
              prevMsg.sender_id === msg.sender_id &&
              new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() <
                5 * 60 * 1000

            const msgReactions = reactions[msg.id] || {}

            return (
              <div key={msg.id} className="space-y-1">
                {/* Date Divider */}
                {showDate && (
                  <div className="relative my-4 flex items-center justify-center select-none">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <span className="relative rounded-full border border-zinc-800 bg-[#16181C] px-3.5 py-0.5 text-[10px] font-semibold text-zinc-400 shadow-xs">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Item */}
                <div
                  className={`group relative flex rounded-xl px-3 py-1 transition-colors hover:bg-zinc-800/50 ${
                    isGrouped ? 'mt-0.5' : 'mt-2.5'
                  }`}
                >
                  {/* Left Gutter: Avatar or Hover Timestamp */}
                  <div className="w-10 shrink-0 mr-3">
                    {!isGrouped ? (
                      senderAvatarUrl ? (
                        <img
                          src={senderAvatarUrl}
                          alt={senderName}
                          className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-zinc-700/80"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                          {(senderName[0] || 'U').toUpperCase()}
                        </div>
                      )
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 block pt-0.5 select-none font-mono">
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Message Content Area */}
                  <div className="flex-1 min-w-0">
                    {!isGrouped && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {senderName}
                        </span>
                        {senderRole === 'admin' && (
                          <span className="rounded bg-red-950/80 border border-red-800/60 px-1.5 py-0.2 text-[9px] font-bold uppercase text-red-300">
                            Admin
                          </span>
                        )}
                        {senderRole === 'supervisor' && (
                          <span className="rounded bg-indigo-950/80 border border-indigo-800/60 px-1.5 py-0.2 text-[9px] font-bold uppercase text-indigo-300">
                            Supervisor
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 select-none">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Text Body */}
                    {msg.content && (
                      <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}

                    {/* Attachments Section */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => {
                          const isImage = att.type.startsWith('image/')

                          if (isImage) {
                            return (
                              <div
                                key={i}
                                onClick={() => setLightboxUrl(att.url)}
                                className="group/img relative cursor-pointer overflow-hidden rounded-xl border border-zinc-700 shadow-sm transition hover:shadow-md"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="h-36 w-auto max-w-xs object-cover rounded-xl transition duration-200 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 transition group-hover/img:opacity-100 flex items-center justify-center">
                                  <ArrowTopRightOnSquareIcon className="h-5 w-5 text-white drop-shadow-md" />
                                </div>
                              </div>
                            )
                          }

                          return (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.name}
                              className="flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800/70 p-2.5 shadow-xs transition hover:border-purple-500 hover:bg-zinc-800"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-900/60 text-purple-300">
                                <DocumentIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 pr-2">
                                <p className="truncate text-xs font-semibold text-zinc-200 max-w-[180px]">
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-zinc-400">
                                  {formatFileSize(att.size)}
                                </p>
                              </div>
                              <ArrowDownTrayIcon className="h-4 w-4 text-zinc-400 hover:text-purple-400" />
                            </a>
                          )
                        })}
                      </div>
                    )}

                    {/* Emoji Reactions List */}
                    {Object.keys(msgReactions).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 select-none">
                        {Object.entries(msgReactions).map(([emoji, uids]) => {
                          const reactedByMe = uids.includes(currentUserId)
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                                reactedByMe
                                  ? 'bg-purple-900/70 border border-purple-500/70 text-purple-200'
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{uids.length}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Floating Message Hover Action Bar */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-3.5 right-3 z-10 flex items-center rounded-xl border border-zinc-700 bg-[#16181C] shadow-lg backdrop-blur-md transition-opacity select-none p-0.5">
                    {/* Quick Reactions */}
                    {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="rounded-lg p-1 text-xs hover:bg-zinc-700 transition hover:scale-125"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="mx-1 h-3 w-px bg-zinc-700" />

                    {/* Copy Text */}
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                      title="Copy message text"
                    >
                      {copiedMessageId === msg.id ? (
                        <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Delete Message */}
                    {(isMe || isAdmin) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400 transition"
                        title="Delete message"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. LIGHTBOX MODAL FOR IMAGES                                 */}
      {/* ============================================================ */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MESSAGE COMPOSER INPUT AREA                               */}
      {/* ============================================================ */}
      <footer className="border-t border-zinc-800/90 bg-[#16181C] p-3 backdrop-blur-md select-none">
        <form onSubmit={handleSendMessage} className="space-y-2">
          {/* Uploader Preview */}
          <AttachmentUploader
            pendingAttachments={pendingAttachments}
            onAttachmentUploaded={(att) => setPendingAttachments((prev) => [...prev, att])}
            onAttachmentRemoved={(path) =>
              setPendingAttachments((prev) => prev.filter((p) => p.storage_path !== path))
            }
            disabled={isSending}
          />

          {/* Message Composer Card */}
          <div className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-[#222529] shadow-sm transition focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/50">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 border-b border-zinc-800/80 px-3 py-1.5 text-zinc-400 bg-[#1B1D21]">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white font-bold text-xs"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white italic font-serif text-xs"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white line-through text-xs"
                title="Strikethrough"
              >
                S
              </button>
              <div className="h-3.5 w-px bg-zinc-700 mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('`', '`')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white font-mono text-xs"
                title="Inline Code"
              >
                {'</>'}
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ', '')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white text-xs"
                title="Quote"
              >
                {'"'}
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ', '')}
                className="rounded p-1 hover:bg-zinc-700 hover:text-white text-xs"
                title="Bullet List"
              >
                •
              </button>

              <div className="ml-auto flex items-center gap-1">
                {/* Quick Emoji Bar Toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="rounded p-1 hover:bg-zinc-700 hover:text-white text-xs"
                  title="Insert emoji"
                >
                  <FaceSmileIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Emoji Strip */}
            {showEmojiPicker && (
              <div className="flex items-center gap-1 border-b border-zinc-800 bg-[#16181C] px-3 py-1 text-sm overflow-x-auto">
                {['😄', '👍', '🎉', '🚀', '🔥', '❤️', '🙌', '👀', '💡', '👏', '🎯', '💯'].map(
                  (em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setInputValue((prev) => `${prev} ${em}`)
                        setShowEmojiPicker(false)
                      }}
                      className="rounded p-1 hover:bg-zinc-700 transition hover:scale-125"
                    >
                      {em}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Textarea Input */}
            <div className="p-3">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={`Message #${channel.name}...`}
                rows={1}
                className="w-full resize-none border-0 bg-transparent p-0 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-0 leading-relaxed overscroll-contain"
                style={{ overscrollBehavior: 'contain' }}
              />

              {/* Bottom Helpers & Send Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-zinc-500">
                  <span className="font-semibold text-zinc-400">Return</span> to send ·{' '}
                  <span className="font-semibold text-zinc-400">Shift + Return</span> for new line
                </span>

                <button
                  type="submit"
                  disabled={isSending || (!inputValue.trim() && pendingAttachments.length === 0)}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-purple-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  title="Send message"
                >
                  {isSending ? (
                    <span className="flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Send</span>
                      <PaperAirplaneIcon className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </footer>
    </div>
  )
}
