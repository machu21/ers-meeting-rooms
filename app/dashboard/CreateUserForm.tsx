'use client'

import { useState } from 'react'
import { createEmployeeAccount } from './actions'
import { UserPlusIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'

const MAP_OPTIONS = [
  { value: 'office', label: 'Main Office Map', defaultChecked: true },
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
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
          <UserPlusIcon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Add New Team Member</h2>
          <p className="text-sm text-slate-500">Generate an account and define access permissions.</p>
        </div>
      </div>

      {message && (
        <div className={`mb-5 flex items-center gap-2 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircleIcon className="h-4 w-4 shrink-0" /> : <ExclamationCircleIcon className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-5">

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
              Employee Email
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              name="email"
              type="email"
              placeholder="e.g., brian@yourcompany.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
              Temporary Password
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              type="password"
              name="password"
              placeholder="e.g., temp_password!"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="role">
            Assigned Role
          </label>
          <select
            name="role"
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="employee">Employee</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin (IT Backend)</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Map Access Permissions
          </label>
          <div className="flex flex-wrap gap-2">
            {MAP_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm text-slate-600 transition has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700"
              >
                <input type="checkbox" name="maps" value={opt.value} defaultChecked={opt.defaultChecked} className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
        >
          {loading ? 'Creating Account...' : 'Generate Account'}
        </button>
      </form>
    </div>
  )
}