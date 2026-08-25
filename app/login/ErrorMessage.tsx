'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  if (!message) return null

  // Translates technical backend database errors into simple, user-friendly language
  const getFriendlyMessage = (rawMessage: string) => {
    const msg = rawMessage.toLowerCase()

    // NEW: Catch banned/deactivated users
    if (msg.includes('banned') || msg.includes('suspended')) {
      return "This user is no longer active. Please contact your administrator."
    }

    if (msg.includes('authenticate') || msg.includes('credentials') || msg.includes('invalid')) {
      return "We didn't recognize that email and password combination. Please check for typos and try again."
    }
    
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return "You've tried logging in a few too many times. Please wait a minute and try again."
    }

    if (msg.includes('network') || msg.includes('timeout')) {
      return "We're having trouble connecting right now. Please check your internet connection."
    }

    if (msg.includes('email not confirmed')) {
      return "Please check your inbox and verify your email address before logging in."
    }

    // Generic fallback so users never see weird database string errors
    return "Oops, we ran into an unexpected issue logging you in. Please try again."
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md bg-red-50 border border-red-200 p-4 shadow-sm">
      <svg 
        className="mt-0.5 h-5 w-5 shrink-0 text-red-500" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
          clipRule="evenodd" 
        />
      </svg>
      <p className="text-sm font-medium text-red-800">
        {getFriendlyMessage(message)}
      </p>
    </div>
  )
}