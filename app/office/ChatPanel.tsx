'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { XMarkIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/solid'

type Message = {
  id: string
  sender_id: string
  receiver_id: string | null
  content: string
  type: 'group' | 'direct'
  created_at: string
}

interface ChatPanelProps {
  roomId: string
  currentUser: { id: string; name: string }
  allUsers: { id: string; name: string }[]
  onClose: () => void
}

export default function ChatPanel({ roomId, currentUser, allUsers, onClose }: ChatPanelProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'group' | 'direct'>('group')
  const [selectedDmUser, setSelectedDmUser] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // NEW: Notification States and Refs to track current view without re-triggering useEffects
  const [unreadGroup, setUnreadGroup] = useState(false)
  const [unreadDirect, setUnreadDirect] = useState(false)
  const activeTabRef = useRef(activeTab)
  const selectedDmUserRef = useRef(selectedDmUser)

  // Keep refs in sync with state
  useEffect(() => {
    activeTabRef.current = activeTab
    if (activeTab === 'group') setUnreadGroup(false)
    if (activeTab === 'direct') setUnreadDirect(false)
  }, [activeTab])

  useEffect(() => {
    selectedDmUserRef.current = selectedDmUser
  }, [selectedDmUser])

  // 1. Lightweight Caching Strategy
  useEffect(() => {
    const CACHE_KEY = `chat_cache_${currentUser.id}`
    const loadMessages = async () => {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        setMessages(JSON.parse(cached))
      } else {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100)

        if (data) {
          setMessages(data as Message[])
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
        }
      }
    }
    loadMessages()
  }, [currentUser.id, supabase])

  // 2. Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message
        
        if (newMessage.type === 'group' || newMessage.sender_id === currentUser.id || newMessage.receiver_id === currentUser.id) {
          setMessages((prev) => {
            const updated = [...prev, newMessage]
            try {
              sessionStorage.setItem(`chat_cache_${currentUser.id}`, JSON.stringify(updated.slice(-50)))
            } catch {}
            return updated
          })

          // NEW: Notification Logic
          // Only notify if the message is from someone else
          if (newMessage.sender_id !== currentUser.id) {
            
            // Trigger Group notification if they aren't on the Group tab
            if (newMessage.type === 'group' && activeTabRef.current !== 'group') {
              setUnreadGroup(true)
            }
            
            // Trigger Direct notification if it's meant for them, and they aren't looking at that specific DM
            if (newMessage.type === 'direct' && newMessage.receiver_id === currentUser.id) {
              if (activeTabRef.current !== 'direct' || selectedDmUserRef.current !== newMessage.sender_id) {
                setUnreadDirect(true)
              }
            }
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, supabase, currentUser.id]) // currentUser.id added to dependencies for safety

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, activeTab, selectedDmUser])

  // 3. Send Message Handler
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    if (activeTab === 'direct' && !selectedDmUser) return

    const newMessage = {
      sender_id: currentUser.id,
      receiver_id: activeTab === 'direct' ? selectedDmUser : null,
      content: inputValue.trim(),
      type: activeTab
    }

    setInputValue('')

    await supabase.from('messages').insert(newMessage)
  }

  const displayedMessages = messages.filter(m => {
    if (activeTab === 'group') return m.type === 'group'
    return m.type === 'direct' && (m.sender_id === selectedDmUser || m.receiver_id === selectedDmUser)
  })

  const otherUsers = allUsers.filter(u => u.id !== currentUser.id)

  const getSenderName = (id: string) => {
    if (id === currentUser.id) return currentUser.name
    const user = allUsers.find(u => u.id === id)
    return user ? user.name : 'Unknown User'
  }

  return (
    <div className="flex h-[min(600px,70vh)] w-80 flex-col overflow-hidden rounded-2xl border border-purple-100 bg-white/60 shadow-[0_8px_32px_rgba(107,33,168,0.05)] backdrop-blur-2xl shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-100 bg-white/40 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wide text-purple-900 drop-shadow-sm">Office Chat</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-purple-100/50 hover:text-purple-700 active:scale-95"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-purple-100 bg-white/40 px-2 pt-2">
        <button
          onClick={() => setActiveTab('group')}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-t-lg py-2 text-xs font-medium transition ${
            activeTab === 'group'
              ? 'bg-white text-purple-700 border-b-2 border-purple-500 shadow-sm drop-shadow-sm'
              : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50/50'
          }`}
        >
          <UserGroupIcon className="h-3.5 w-3.5" />
          Group
          
          {/* NEW: Group Notification Dot */}
          {unreadGroup && (
            <span className="absolute right-3 top-2.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('direct')}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-t-lg py-2 text-xs font-medium transition ${
            activeTab === 'direct'
              ? 'bg-white text-purple-700 border-b-2 border-purple-500 shadow-sm drop-shadow-sm'
              : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50/50'
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          Direct
          
          {/* NEW: Direct Notification Dot */}
          {unreadDirect && (
            <span className="absolute right-3 top-2.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* DM User Selector */}
      {activeTab === 'direct' && (
        <div className="border-b border-purple-100 bg-white/40 p-2">
          <select
            className="w-full rounded-lg border border-purple-100 bg-white/80 px-2 py-1.5 text-xs text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={selectedDmUser || ''}
            onChange={(e) => {
              setSelectedDmUser(e.target.value)
              setUnreadDirect(false) // Clear notification when they select a new user to read messages
            }}
          >
            <option value="" disabled>Select a colleague...</option>
            {otherUsers.length === 0 ? (
              <option disabled>No one else is here</option>
            ) : (
              otherUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Message List */}
      <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
        {activeTab === 'direct' && !selectedDmUser ? (
          <div className="mt-10 text-center text-xs text-gray-500">Select someone to start chatting.</div>
        ) : displayedMessages.length === 0 ? (
          <div className="mt-10 text-center text-xs text-gray-500">No messages yet.</div>
        ) : (
          <>
            {displayedMessages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && activeTab === 'group' && (
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-purple-600/70">{getSenderName(msg.sender_id)}</span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      isMe
                        ? 'rounded-br-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                        : 'rounded-bl-sm border border-purple-100 bg-white text-gray-800 shadow-sm backdrop-blur-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="border-t border-purple-100 bg-white/40 p-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={activeTab === 'direct' && !selectedDmUser}
          className="w-full rounded-full border border-purple-100 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-inner transition focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-40"
        />
      </form>
    </div>
  )
}