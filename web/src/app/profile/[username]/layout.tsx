import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, bio')
    .eq('username', username)
    .single()

  if (!profile) {
    return {
      title: 'User Not Found',
      description: 'This user does not exist on Sweaty.',
    }
  }

  // Get game count
  const { count } = await supabase
    .from('game_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', (await supabase.from('profiles').select('id').eq('username', username).single()).data?.id || '')

  const displayName = profile.display_name || profile.username
  const gameCount = count || 0
  const description = profile.bio
    ? `${profile.bio.slice(0, 100)}${profile.bio.length > 100 ? '...' : ''}`
    : `${displayName} has logged ${gameCount} game${gameCount !== 1 ? 's' : ''} on Sweaty.`

  return {
    title: `${displayName}'s Profile`,
    description,
    openGraph: {
      title: `${displayName}'s Profile | Sweaty`,
      description,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName}'s Profile | Sweaty`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default function ProfileLayout({ children }: LayoutProps) {
  return children
}
