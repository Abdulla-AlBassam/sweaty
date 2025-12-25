import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ReviewComment } from '../types'
import CommentInput from './CommentInput'

interface ReviewCommentsProps {
  gameLogId: string
  initialCommentCount?: number
}

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Single comment item component
interface CommentItemProps {
  comment: ReviewComment
  onReply: (comment: ReviewComment) => void
  onDelete: (commentId: string) => void
  currentUserId?: string
  isReply?: boolean
}

function CommentItem({ comment, onReply, onDelete, currentUserId, isReply = false }: CommentItemProps) {
  const navigation = useNavigation()
  const isOwnComment = currentUserId === comment.user_id

  const handleProfilePress = () => {
    if (comment.user?.username) {
      navigation.navigate('UserProfile' as never, { username: comment.user.username } as never)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
      ]
    )
  }

  return (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      <TouchableOpacity onPress={handleProfilePress}>
        {comment.user?.avatar_url ? (
          <Image source={{ uri: comment.user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={isReply ? 12 : 14} color={Colors.textDim} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <TouchableOpacity onPress={handleProfilePress}>
            <Text style={styles.username}>
              {comment.user?.display_name || comment.user?.username || 'User'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.timestamp}>{formatRelativeTime(comment.created_at)}</Text>
        </View>

        <Text style={styles.commentText}>{comment.content}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onReply(comment)}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>

          {isOwnComment && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                currentUserId={currentUserId}
                isReply={true}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default function ReviewComments({ gameLogId, initialCommentCount = 0 }: ReviewCommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ReviewComment | null>(null)

  // Fetch comments when expanded
  const fetchComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('review_comments')
        .select(`
          id,
          user_id,
          game_log_id,
          parent_id,
          content,
          created_at,
          updated_at,
          user:profiles!user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('game_log_id', gameLogId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Organize into threaded structure
      const topLevelComments: ReviewComment[] = []
      const repliesMap: Record<string, ReviewComment[]> = {}

      // Type assertion for the data
      const typedData = data as unknown as Array<{
        id: string
        user_id: string
        game_log_id: string
        parent_id: string | null
        content: string
        created_at: string
        updated_at: string
        user: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
        }
      }>

      typedData?.forEach((comment) => {
        const formattedComment: ReviewComment = {
          ...comment,
          user: comment.user,
        }

        if (comment.parent_id) {
          if (!repliesMap[comment.parent_id]) {
            repliesMap[comment.parent_id] = []
          }
          repliesMap[comment.parent_id].push(formattedComment)
        } else {
          topLevelComments.push(formattedComment)
        }
      })

      // Attach replies to their parent comments
      topLevelComments.forEach((comment) => {
        comment.replies = repliesMap[comment.id] || []
      })

      setComments(topLevelComments)
      setCommentCount(typedData?.length || 0)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [gameLogId])

  useEffect(() => {
    if (isExpanded) {
      fetchComments()
    }
  }, [isExpanded, fetchComments])

  const handleAddComment = async (content: string) => {
    if (!user) return

    const newComment = {
      user_id: user.id,
      game_log_id: gameLogId,
      parent_id: replyingTo?.id || null,
      content,
    }

    const { data, error } = await supabase
      .from('review_comments')
      .insert(newComment)
      .select(`
        id,
        user_id,
        game_log_id,
        parent_id,
        content,
        created_at,
        updated_at
      `)
      .single()

    if (error) throw error

    // Add the new comment to the list with user info
    const fullComment: ReviewComment = {
      ...(data as ReviewComment),
      user: {
        id: user.id,
        username: user.user_metadata?.username || 'You',
        display_name: user.user_metadata?.display_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      replies: [],
    }

    if (replyingTo) {
      // Add as a reply
      setComments(prev => prev.map(comment => {
        if (comment.id === replyingTo.id) {
          return {
            ...comment,
            replies: [...(comment.replies || []), fullComment],
          }
        }
        return comment
      }))
    } else {
      // Add as top-level comment
      setComments(prev => [...prev, fullComment])
    }

    setCommentCount(prev => prev + 1)
    setReplyingTo(null)
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('review_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Failed to delete comment:', error)
      return
    }

    // Remove from state
    setComments(prev => {
      // Check if it's a top-level comment
      const filtered = prev.filter(c => c.id !== commentId)
      if (filtered.length !== prev.length) {
        setCommentCount(count => count - 1)
        return filtered
      }

      // Check if it's a reply
      return prev.map(comment => ({
        ...comment,
        replies: comment.replies?.filter(r => {
          if (r.id === commentId) {
            setCommentCount(count => count - 1)
            return false
          }
          return true
        }),
      }))
    })
  }

  const handleReply = (comment: ReviewComment) => {
    setReplyingTo(comment)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <View style={styles.container}>
      {/* Toggle button */}
      <TouchableOpacity style={styles.toggleButton} onPress={toggleExpanded}>
        <Ionicons
          name={isExpanded ? 'chatbubble' : 'chatbubble-outline'}
          size={18}
          color={Colors.textMuted}
        />
        <Text style={styles.toggleText}>
          {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : 'Comment'}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded comments section */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          ) : comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  currentUserId={user?.id}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          )}

          {/* Comment input */}
          {user && (
            <CommentInput
              onSubmit={handleAddComment}
              replyingTo={replyingTo?.user?.username}
              onCancelReply={() => setReplyingTo(null)}
            />
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  toggleText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  expandedSection: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  commentsList: {
    padding: Spacing.md,
  },
  noComments: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  replyItem: {
    marginLeft: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  username: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  commentText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionButton: {
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  deleteText: {
    color: Colors.error,
  },
  repliesContainer: {
    marginTop: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: Spacing.sm,
  },
})
