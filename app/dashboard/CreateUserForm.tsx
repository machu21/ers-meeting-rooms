'use client'

import { useState } from 'react'
import { createEmployeeAccount } from './actions'
import { UserPlusIcon, CheckCircleIcon, ExclamationCircleIcon, KeyIcon, EnvelopeIcon } from '@heroicons/react/24/solid'

const MAP_OPTIONS = [
  { value: 'office', label: 'Main Office', defaultChecked: true },
  { value: 'prayer-room', label: 'Prayer Room', defaultChecked: false },
  { value: 'meeting-room', label: 'Meeting Room', defaultChecked: false }
]

export default function CreateUserForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    try {
      const response = await createEmployeeAccount(formData)

      if (response.success) {
        setMessage({ type: 'success', text: response.message })
      } else {
        setMessage({ type: 'error', text: response.message })
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:bg-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100/80 text-indigo-600 shadow-sm ring-1 ring-indigo-200 transition-transform hover:scale-110">
          <UserPlusIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Add New Member</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Generate team account</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold shadow-sm backdrop-blur-md ${message.type === 'success' ? 'bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50/80 text-red-700 ring-1 ring-red-200'}`}>
          {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 shrink-0" /> : <ExclamationCircleIcon className="h-5 w-5 shrink-0" />}
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-1 flex-col gap-6">
        
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors group-focus-within:text-indigo-500">
              <EnvelopeIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              className="peer w-full rounded-2xl border border-white/60 bg-white/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
              name="email"
              type="email"
              placeholder="Employee Email"
              required
            />
          </div>
          
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors group-focus-within:text-indigo-500">
              <KeyIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              className="peer w-full rounded-2xl border border-white/60 bg-white/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
              type="password"
              name="password"
              placeholder="Temp Password"
              required
              minLength={6}
            />
          </div>
        </div>

        {/* Role Select */}
        <div className="relative">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Assigned Role
          </label>
          <select
            name="role"
            required
            className="w-full appearance-none rounded-2xl border border-white/60 bg-white/50 px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <option value="employee">Employee</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin (IT Backend)</option>
          </select>
          <div className="pointer-events-none absolute bottom-0 right-0 flex h-[52px] items-center px-4 text-slate-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        {/* Map Permissions */}
        <div className="flex-1">
          <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Map Access Permissions
          </label>
          <div className="flex flex-wrap gap-3">
            {MAP_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="group relative flex cursor-pointer items-center justify-center rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 shadow-sm transition-all has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:checked]:shadow-md hover:bg-white/80"
              >
                <input type="checkbox" name="maps" value={opt.value} defaultChecked={opt.defaultChecked} className="peer sr-only" />
                <span className="text-sm font-bold text-slate-600 transition-colors peer-checked:text-indigo-700">{opt.label}</span>
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent transition-all peer-checked:ring-indigo-200"></div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-auto flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-sm font-black tracking-wide text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating Account...</span>
            </>
          ) : (
            'Generate Account'
          )}
        </button>
      </form>
    </div>
  )
}