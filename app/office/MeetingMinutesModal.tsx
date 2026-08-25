'use client'

import { XMarkIcon, SparklesIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/solid'

interface MeetingMinutesModalProps {
  zoneName: string
  minutes: {
    summary: string
    action_items: string
    created_at?: string
  } | null
  onClose: () => void
}

export default function MeetingMinutesModal({ zoneName, minutes, onClose }: MeetingMinutesModalProps) {
  if (!minutes) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Meeting Minutes</h3>
              <p className="text-xs text-gray-400">{zoneName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700">
          
          {/* Summary Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <DocumentTextIcon className="h-4 w-4" />
              Executive Summary
            </div>
            <p className="rounded-xl border border-gray-800 bg-gray-800/40 p-3.5 text-sm leading-relaxed text-gray-200">
              {minutes.summary}
            </p>
          </div>

          {/* Action Items Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <CheckCircleIcon className="h-4 w-4" />
              Action Items
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-3.5 text-sm text-gray-200 whitespace-pre-line leading-relaxed">
              {minutes.action_items}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-gray-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}