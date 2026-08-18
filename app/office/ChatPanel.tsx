'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { XMarkIcon } from '@heroicons/react/24/solid'

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

  return (
    <div className="flex h-[600px] w-80 flex-col overflow-hidden rounded-xl border-4 border-gray-300 bg-white shadow-2xl shrink-0">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
        <h3 className="font-semibold text-gray-800">Office Chat</h3>
        <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white text-sm">
        <button 
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-2 font-medium transition ${activeTab === 'group' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Group
        </button>
        <button 
          onClick={() => setActiveTab('direct')}
          className={`flex-1 py-2 font-medium transition ${activeTab === 'direct' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Direct
        </button>
      </div>

      {/* DM User Selector */}
      {activeTab === 'direct' && (
        <div className="border-b bg-gray-50 p-2">
          <select 
            className="w-full rounded border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedDmUser || ''}
            onChange={(e) => setSelectedDmUser(e.target.value)}
          >
            <option value="" disabled>Select a colleague...</option>
            {allUsers.filter(u => u.id !== currentUser.id).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === 'direct' && !selectedDmUser ? (
          <div className="text-center text-sm text-gray-400 mt-10">Select someone to start chatting.</div>
        ) : displayedMessages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 mt-10">No messages yet.</div>
        ) : (
          <div className="space-y-3">
            {displayedMessages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && activeTab === 'group' && <span className="mb-0.5 text-[10px] font-medium text-gray-500">{msg.sender_name}</span>}
                  <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="border-t bg-white p-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={activeTab === 'direct' && !selectedDmUser}
          className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
      </form>
    </div>
  )
}