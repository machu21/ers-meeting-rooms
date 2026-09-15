import { supabaseAdmin } from '@/lib/supabase/admin'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogSource = 'AUTH' | 'USER_MANAGEMENT' | 'ROOM' | 'AI_AGENT' | 'SYSTEM'

export interface LogEntry {
  userId?: string | null
  level?: LogLevel
  source: LogSource
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Safely writes a structured audit log entry to public.app_logs.
 * Utilizes the server-side supabaseAdmin client to ensure logs are persisted reliably
 * without being blocked by client RLS permissions.
 *
 * Wrapped in try/catch to ensure logging never interrupts critical business operations.
 */
export async function logActivity({
  userId = null,
  level = 'info',
  source,
  message,
  metadata = {}
}: LogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('app_logs')
      .insert({
        user_id: userId,
        level,
        source,
        message,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })

    if (error) {
      console.error('[logActivity] Failed to insert app_log:', error.message)
    }
  } catch (err) {
    console.error('[logActivity] Unexpected exception logging activity:', err)
  }
}
