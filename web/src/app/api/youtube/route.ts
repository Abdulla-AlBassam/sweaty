import { NextRequest, NextResponse } from 'next/server'

// YouTube channels - add new channels here
const YOUTUBE_CHANNELS = [
  { name: 'gameranx', channelId: 'UCNvzD7Z-g64bPXxGzaQaa4g' },
  { name: 'Jorraptor', channelId: 'UCzF5oxzeidHOZzy4KK5nxCQ' },
]

// Simple in-memory cache
let cachedVideos: YouTubeVideo[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

interface YouTubeVideo {
  id: string
  title: string
  channel: string
  thumbnail: string
  videoUrl: string
  publishedAt: string
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

function parseYouTubeFeed(xml: string, channelName: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    const videoId = extractTag(entry, 'yt:videoId')
    const title = extractTag(entry, 'title')
    const published = extractTag(entry, 'published')

    // YouTube RSS provides media:group with media:thumbnail
    const thumbMatch = entry.match(/media:thumbnail[^>]*url=["']([^"']+)["']/)
    const thumbnail = thumbMatch
      ? thumbMatch[1]
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    if (videoId && title) {
      videos.push({
        id: videoId,
        title: title
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
        channel: channelName,
        thumbnail,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
      })
    }
  }

  return videos
}

async function fetchAllVideos(): Promise<YouTubeVideo[]> {
  const allVideos: YouTubeVideo[] = []

  const feedPromises = YOUTUBE_CHANNELS.map(async (channel) => {
    try {
      const response = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,
        {
          headers: {
            'User-Agent': 'Sweaty Gaming App/1.0',
          },
          next: { revalidate: 900 },
        }
      )

      if (!response.ok) {
        console.warn(`Failed to fetch ${channel.name}: ${response.status}`)
        return []
      }

      const xml = await response.text()
      return parseYouTubeFeed(xml, channel.name)
    } catch (error) {
      console.error(`Error fetching ${channel.name}:`, error)
      return []
    }
  })

  const results = await Promise.all(feedPromises)

  for (const videos of results) {
    allVideos.push(...videos)
  }

  // Sort by date (newest first)
  return allVideos.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

// GET /api/youtube?limit=10
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')

  if (isNaN(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Limit must be between 1 and 50' },
      { status: 400 }
    )
  }

  try {
    const now = Date.now()

    // Check cache
    if (cachedVideos && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        videos: cachedVideos.slice(0, limit),
        cached: true,
        cacheAge: Math.round((now - cacheTimestamp) / 1000),
      })
    }

    const videos = await fetchAllVideos()

    cachedVideos = videos
    cacheTimestamp = now

    return NextResponse.json({
      videos: videos.slice(0, limit),
      cached: false,
    })
  } catch (error) {
    console.error('YouTube fetch error:', error)

    if (cachedVideos) {
      return NextResponse.json({
        videos: cachedVideos.slice(0, limit),
        cached: true,
        stale: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
