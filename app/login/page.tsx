import { Suspense } from 'react'
import { login } from './actions'
import ErrorMessage from './ErrorMessage'

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Elevate Remote Office
        </h1>
        
        {/* Suspense safely handles the dynamic URL reading without breaking the server build */}
        <Suspense fallback={null}>
          <ErrorMessage />
        </Suspense>

        <form className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              type="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            formAction={login}
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}