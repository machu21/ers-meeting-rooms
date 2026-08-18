'use client'

import { useState } from 'react'
import { createEmployeeAccount } from './actions'

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
    <div className="rounded-lg bg-white p-6 shadow-sm border">
      <h2 className="mb-1 text-xl font-semibold text-gray-800">Add New Team Member</h2>
      <p className="mb-6 text-sm text-gray-500">Generate an account and define access permissions.</p>

      {message && (
        <div className={`mb-4 rounded p-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-5">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              Employee Email
            </label>
            <input
              className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              name="email"
              type="email"
              placeholder="e.g., brian@yourcompany.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              Temporary Password
            </label>
            <input
              className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              type="password"
              name="password"
              placeholder="e.g., temp_password!"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="role">
            Assigned Role
          </label>
          <select 
            name="role" 
            required
            className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="employee">Employee</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin (IT Backend)</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Map Access Permissions
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" name="maps" value="office" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
              Main Office Map
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" name="maps" value="prayer-room" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
              Prayer Room
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" name="maps" value="meeting-room" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
              Meeting Room
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-md bg-gray-900 px-4 py-2 font-semibold text-white transition hover:bg-gray-800 disabled:bg-gray-400"
        >
          {loading ? 'Creating Account...' : 'Generate Account'}
        </button>
      </form>
    </div>
  )
}