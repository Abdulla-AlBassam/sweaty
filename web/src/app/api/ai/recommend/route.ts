import { NextRequest, NextResponse } from 'next/server'
import { searchGames, Game } from '@/lib/igdb'

// POST /api/ai/recommend
// AI-powered game recommendations using OpenAI + IGDB

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
}

// System prompt for the AI - crafted for game recommendations
const SYSTEM_PROMPT = `You are Sweaty AI, a friendly and knowledgeable video game recommendation assistant. Your job is to recommend games based on what users describe they want.

IMPORTANT RULES:
1. Always respond with EXACTLY this JSON format, no exceptions:
{
  "message": "Your friendly response explaining the recommendations",
  "games": ["Game Name 1", "Game Name 2", "Game Name 3", ...]
}

2. Recommend 5-8 games that best match what the user is looking for
3. Use EXACT official game names (e.g., "The Legend of Zelda: Breath of the Wild" not "Zelda BOTW")
4. Be conversational and helpful in your message - explain WHY these games match their request
5. If the user asks for something impossible or unclear, still provide your best recommendations with an explanation
6. Consider game length, difficulty, multiplayer options, platform, and vibes when matching
7. Include a mix of well-known and hidden gems when appropriate
8. If user references a previous recommendation (like "tell me more about #3"), respond about that specific game

NEVER include anything outside the JSON format. Your entire response must be valid JSON.`

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Build messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ]

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', openaiResponse.status, errorData)
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 500 }
      )
    }

    const openaiData = await openaiResponse.json()
    const aiContent = openaiData.choices?.[0]?.message?.content

    if (!aiContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the AI response as JSON
    let parsedResponse: { message: string; games: string[] }
    try {
      // Clean up the response in case there's markdown code blocks
      let cleanContent = aiContent.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()

      parsedResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent)
      // If parsing fails, return a generic response
      return NextResponse.json({
        message: aiContent,
        games: [],
        error: 'Failed to parse game recommendations'
      })
    }

    // Search IGDB for each game name
    const gamePromises = parsedResponse.games.slice(0, 8).map(async (gameName: string) => {
      try {
        const results = await searchGames(gameName, 1)
        return results[0] || null
      } catch (err) {
        console.error(`Failed to search for game: ${gameName}`, err)
        return null
      }
    })

    const gameResults = await Promise.all(gamePromises)
    const games: Game[] = gameResults.filter((g): g is Game => g !== null)

    return NextResponse.json({
      message: parsedResponse.message,
      games,
    })

  } catch (error) {
    console.error('AI recommend error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
