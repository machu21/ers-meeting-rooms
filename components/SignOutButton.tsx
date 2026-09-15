'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/login/actions'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  variant?: 'header' | 'navbar' | 'subtle'
  className?: string
}

export default function SignOutButton({ variant = 'header', className = '' }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  if (variant === 'subtle') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className={`flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] font-medium text-xs transition-colors disabled:opacity-60 disabled:pointer-events-none ${className}`}
      >
        {isPending ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin text-slate-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Signing Out...</span>
          </>
        ) : (
          <>
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </>
        )}
      </button>
    )
  }

  if (variant === 'navbar') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className={`flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60 disabled:pointer-events-none ${className}`}
      >
        {isPending ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Signing Out...</span>
          </>
        ) : (
          <span>Sign Out</span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className={`flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white/50 px-4 py-2 text-sm font-semibold text-purple-900 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 disabled:opacity-60 disabled:pointer-events-none ${className}`}
    >
      {isPending ? (
        <>
          <svg className="h-4 w-4 animate-spin text-purple-700" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Signing Out...</span>
        </>
      ) : (
        <span>Sign Out</span>
      )}
    </button>
  )
}
