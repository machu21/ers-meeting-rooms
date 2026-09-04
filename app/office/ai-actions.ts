'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize the Gemini Engine
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateMeetingMinutes(zoneId: string) {
  const supabase = await createClient()

  // 1. Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  // 2. Fetch the raw transcripts for this zone (limit to the last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: transcripts, error: fetchError } = await supabase
    .from('transcripts')
    .select('user_name, content, created_at')
    .eq('zone_id', zoneId)
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: true })

  if (fetchError) return { success: false, message: 'Failed to fetch transcripts.' }
  if (!transcripts || transcripts.length === 0) {
    return { success: false, message: 'No conversation detected in this zone recently.' }
  }

  // 3. Format the raw data into a clean script for Gemini
  const conversationLog = transcripts.map(t => `${t.user_name}: ${t.content}`).join('\n')

  // 4. Prompt Gemini 1.5 Flash (Fast, cheap, and excellent at JSON formatting)
  const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" })

  const prompt = `
    You are an expert executive assistant. Below is a raw, unedited voice-to-text transcript of a meeting.
    It may contain typos, filler words, or repeated phrases due to speech recognition limitations.
    
    Please analyze the text and provide:
    1. A concise, professional Summary.
    2. A bulleted list of Action Items (what needs to be done and by whom).

    You must format your response STRICTLY as a valid JSON object with exactly two keys: "summary" and "action_items".
    Do not use markdown blocks like \`\`\`json. Return only the raw JSON string.

    Transcript:
    ${conversationLog}
  `

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()

    // Safety check: strip any accidental markdown formatting the LLM might have included
    const cleanJsonString = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim()
    const parsedData = JSON.parse(cleanJsonString)

    // 5. Save the final AI Minutes to the database
    const { error: insertError } = await supabase.from('meeting_minutes').insert({
      zone_id: zoneId,
      generated_by: user.id,
      summary: parsedData.summary,
      action_items: parsedData.action_items
    })

    if (insertError) throw insertError

    // 6. Housekeeping: Wipe the temporary raw transcripts for this zone so the next meeting starts fresh
    await supabase.from('transcripts').delete().eq('zone_id', zoneId)

    return { success: true, message: "Meeting minutes generated successfully!" }

  } catch (err: any) {
    console.error("Gemini Generation Error:", err)
    return { success: false, message: "AI processing failed. Please try again." }
  }
}

export async function getLatestMeetingMinutes(zoneId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meeting_minutes')
    .select('id, summary, action_items, created_at')
    .eq('zone_id', zoneId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

// Add this to the bottom of app/office/ai-actions.ts
export async function saveTranscript(zoneId: string, userName: string, content: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('transcripts').insert({
    zone_id: zoneId,
    user_name: userName,
    content: content
  })

  if (error) {
    console.error("Failed to save transcript line:", error)
    return { success: false, message: error.message }
  }

  return { success: true }
}