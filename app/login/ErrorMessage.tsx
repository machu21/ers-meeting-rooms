'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  // If there is no message in the URL, don't render anything
  if (!message) return null

  return (
    <p className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">
      {message}
    </p>
  )
}