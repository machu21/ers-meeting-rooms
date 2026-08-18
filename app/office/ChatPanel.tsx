'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { XMarkIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/solid'

type Message = {
  id: string
  sender_id: string
  sender_name: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
            sessionStorage.setItem(`chat_cache_${currentUser.id}`, JSON.stringify(updated))
            return updated
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, supabase])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTab, selectedDmUser])

  // 3. Send Message Handler
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    if (activeTab === 'direct' && !selectedDmUser) return

    const newMessage = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
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

  return (
    <div className="flex h-[min(600px,70vh)] w-80 flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900/90 shadow-2xl backdrop-blur-md shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-900/60 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wide text-white">Office Chat</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700/60 hover:text-white"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700/50 bg-gray-900/40 px-2 pt-2">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg py-2 text-xs font-medium transition ${
            activeTab === 'group'
              ? 'bg-gray-800/80 text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <UserGroupIcon className="h-3.5 w-3.5" />
          Group
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg py-2 text-xs font-medium transition ${
            activeTab === 'direct'
              ? 'bg-gray-800/80 text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          Direct
        </button>
      </div>

      {/* DM User Selector */}
      {activeTab === 'direct' && (
        <div className="border-b border-gray-700/50 bg-gray-900/40 p-2">
          <select
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedDmUser || ''}
            onChange={(e) => setSelectedDmUser(e.target.value)}
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
      <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
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
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-gray-500">{msg.sender_name}</span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      isMe
                        ? 'rounded-br-sm bg-blue-600 text-white'
                        : 'rounded-bl-sm border border-gray-700/60 bg-gray-800 text-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="border-t border-gray-700/50 bg-gray-900/60 p-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={activeTab === 'direct' && !selectedDmUser}
          className="w-full rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
        />
      </form>
    </div>
  )
}