'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/logger'

export async function getZones(roomId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('map_zones')
    .select('*')
    .eq('room_id', roomId)
  return data || []
}

export async function saveZone(roomId: string, name: string, x: number, y: number, width: number, height: number) {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: Admin access required to create zones' }
  }

  const { error } = await supabase.from('map_zones').insert([{ room_id: roomId, name, x, y, width, height }])
  if (error) return { success: false, message: error.message }

  await logActivity({
    userId: user.id,
    level: 'info',
    source: 'ROOM',
    message: `Created audio zone '${name}' in room '${roomId}'`,
    metadata: { roomId, name, x, y, width, height }
  })

  return { success: true }
}

export async function deleteZone(zoneId: string) {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: Admin access required to delete zones' }
  }

  const { error } = await supabase.from('map_zones').delete().eq('id', zoneId)
  if (error) return { success: false, message: error.message }

  await logActivity({
    userId: user.id,
    level: 'warn',
    source: 'ROOM',
    message: `Deleted audio zone '${zoneId}'`,
    metadata: { zoneId }
  })

  return { success: true }
}