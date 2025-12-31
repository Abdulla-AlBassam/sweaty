import { NextRequest, NextResponse } from 'next/server'

// RSS Feed sources for gaming news
const RSS_FEEDS = [
  { name: 'IGN', url: 'https://feeds.feedburner.com/ign/games-all', icon: 'ign' },
  { name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/', icon: 'gamespot' },
  { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', icon: 'polygon' },
  { name: 'Kotaku', url: 'https://kotaku.com/rss', icon: 'kotaku' },
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', icon: 'pcgamer' },
]

// Simple in-memory cache
let cachedNews: NewsArticle[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

interface NewsArticle {
  id: string
  title: string
  source: string
  sourceIcon: string
  url: string
  thumbnail: string | null
  publishedAt: string
}

// Simple XML parsing helpers
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

function extractCDATA(content: string): string {
  const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return cdataMatch ? cdataMatch[1] : content
}

function extractThumbnail(item: string): string | null {
  // Try media:content
  const mediaMatch = item.match(/media:content[^>]*url=["']([^"']+)["']/)
  if (mediaMatch) return mediaMatch[1]

  // Try media:thumbnail
  const thumbMatch = item.match(/media:thumbnail[^>]*url=["']([^"']+)["']/)
  if (thumbMatch) return thumbMatch[1]

  // Try enclosure
  const enclosureMatch = item.match(/enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/)
  if (enclosureMatch) return enclosureMatch[1]

  // Try to find image in description/content
  const imgMatch = item.match(/<img[^>]*src=["']([^"']+)["']/)
  if (imgMatch) return imgMatch[1]

  return null
}

function parseRSSFeed(xml: string, source: string, sourceIcon: string): NewsArticle[] {
  const articles: NewsArticle[] = []

  // Split by item tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title = extractCDATA(extractTag(item, 'title'))
    const link = extractTag(item, 'link') || extractTag(item, 'guid')
    const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'dc:date') || extractTag(item, 'published')
    const thumbnail = extractThumbnail(item)

    if (title && link) {
      // Create a simple hash for ID
      const id = Buffer.from(link).toString('base64').slice(0, 16)

      articles.push({
        id,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
        source,
        sourceIcon,
        url: link.trim(),
        thumbnail,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  }

  // Also try Atom format (entry tags)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    const title = extractCDATA(extractTag(entry, 'title'))
    const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["']/)
    const link = linkMatch ? linkMatch[1] : extractTag(entry, 'id')
    const pubDate = extractTag(entry, 'published') || extractTag(entry, 'updated')
    const thumbnail = extractThumbnail(entry)

    if (title && link) {
      const id = Buffer.from(link).toString('base64').slice(0, 16)

      articles.push({
        id,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
        source,
        sourceIcon,
        url: link.trim(),
        thumbnail,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  }

  return articles
}

async function fetchAllNews(): Promise<NewsArticle[]> {
  const allArticles: NewsArticle[] = []

  // Fetch all feeds in parallel
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Sweaty Gaming News Reader/1.0',
        },
        next: { revalidate: 900 }, // 15 min cache at fetch level
      })

      if (!response.ok) {
        console.warn(`Failed to fetch ${feed.name}: ${response.status}`)
        return []
      }

      const xml = await response.text()
      return parseRSSFeed(xml, feed.name, feed.icon)
    } catch (error) {
      console.error(`Error fetching ${feed.name}:`, error)
      return []
    }
  })

  const results = await Promise.all(feedPromises)

  for (const articles of results) {
    allArticles.push(...articles)
  }

  // Sort by date (newest first) and dedupe by URL
  const seen = new Set<string>()
  const sortedArticles = allArticles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((article) => {
      if (seen.has(article.url)) return false
      seen.add(article.url)
      return true
    })

  return sortedArticles
}

// GET /api/news?limit=10
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Limit must be between 1 and 50' },
      { status: 400 }
    )
  }

  try {
    const now = Date.now()

    // Check cache
    if (cachedNews && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        articles: cachedNews.slice(0, limit),
        cached: true,
        cacheAge: Math.round((now - cacheTimestamp) / 1000),
      })
    }

    // Fetch fresh news
    const articles = await fetchAllNews()

    // Update cache
    cachedNews = articles
    cacheTimestamp = now

    return NextResponse.json({
      articles: articles.slice(0, limit),
      cached: false,
    })
  } catch (error) {
    console.error('News fetch error:', error)

    // Return cached data if available, even if stale
    if (cachedNews) {
      return NextResponse.json({
        articles: cachedNews.slice(0, limit),
        cached: true,
        stale: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}
