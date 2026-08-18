'use server'

import { createClient } from '@/lib/supabase/server'

export async function getZones(roomId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('map_zones').select('*').eq('room_id', roomId)
  return data || []
}

export async function saveZone(roomId: string, name: string, x: number, y: number, width: number, height: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('map_zones').insert([{ room_id: roomId, name, x, y, width, height }])
  if (error) throw new Error(error.message)
}

export async function deleteZone(zoneId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('map_zones').delete().eq('id', zoneId)
  if (error) throw new Error(error.message)
}