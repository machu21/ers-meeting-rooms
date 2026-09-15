'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PaperClipIcon, XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline'
import type { AttachmentItem } from '@/app/office/channel-actions'

interface AttachmentUploaderProps {
  onAttachmentUploaded: (attachment: AttachmentItem) => void
  onAttachmentRemoved: (storagePath: string) => void
  pendingAttachments: AttachmentItem[]
  disabled?: boolean
}

export default function AttachmentUploader({
  onAttachmentUploaded,
  onAttachmentRemoved,
  pendingAttachments,
  disabled = false,
}: AttachmentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setIsUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to upload files')

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 20MB limit
        if (file.size > 20 * 1024 * 1024) {
          setUploadError(`File "${file.name}" exceeds the 20MB size limit`)
          continue
        }

        // Clean filename and create unique storage path
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${user.id}/${Date.now()}_${cleanName}`

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (error) {
          console.error('Storage upload error:', error)
          setUploadError(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }

        // Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(data.path)

        const item: AttachmentItem = {
          url: publicUrl,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          storage_path: data.path,
        }

        onAttachmentUploaded(item)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Pending Attachments Strip */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 py-1">
          {pendingAttachments.map((att) => {
            const isImage = att.type.startsWith('image/')
            return (
              <div
                key={att.storage_path}
                className="group relative flex items-center gap-2 rounded-lg border border-purple-200/80 bg-purple-50/90 px-2.5 py-1 text-xs text-purple-900 shadow-sm backdrop-blur-sm"
              >
                {isImage ? (
                  <PhotoIcon className="h-4 w-4 text-purple-600 shrink-0" />
                ) : (
                  <DocumentIcon className="h-4 w-4 text-purple-600 shrink-0" />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                <span className="text-[10px] text-purple-600/70">({formatFileSize(att.size)})</span>
                <button
                  type="button"
                  onClick={() => onAttachmentRemoved(att.storage_path)}
                  className="ml-1 rounded p-0.5 text-purple-600/60 hover:bg-purple-200/60 hover:text-purple-900"
                  title="Remove attachment"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Error Notice */}
      {uploadError && (
        <div className="px-2 text-xs text-red-500">{uploadError}</div>
      )}

      {/* Trigger Button & Hidden Input */}
      <div className="flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="relative rounded-lg p-2 text-gray-500 transition hover:bg-purple-100/60 hover:text-purple-700 active:scale-95 disabled:opacity-40"
          title="Attach files or images (up to 20MB)"
        >
          {isUploading ? (
            <span className="flex h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          ) : (
            <PaperClipIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
