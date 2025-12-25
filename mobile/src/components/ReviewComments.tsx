import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ReviewComment } from '../types'

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
      <TouchableOpacity onPress={handleProfilePress} style={styles.avatarContainer}>
        {comment.user?.avatar_url ? (
          <Image source={{ uri: comment.user.avatar_url }} style={[styles.avatar, isReply && styles.replyAvatar]} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, isReply && styles.replyAvatar]}>
            <Ionicons name="person" size={isReply ? 10 : 12} color={Colors.textDim} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={handleProfilePress}>
              <Text style={styles.username}>
                {comment.user?.display_name || comment.user?.username || 'User'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timestamp}>{formatRelativeTime(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>

        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => onReply(comment)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          {isOwnComment && (
            <>
              <Text style={styles.actionDot}>·</Text>
              <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </>
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
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ReviewComment | null>(null)
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async () => {
    if (!user || !inputText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newComment = {
        user_id: user.id,
        game_log_id: gameLogId,
        parent_id: replyingTo?.id || null,
        content: inputText.trim(),
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

      const fullComment: ReviewComment = {
        ...(data as ReviewComment),
        user: {
          id: user.id,
          username: profile?.username || 'You',
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
        },
        replies: [],
      }

      if (replyingTo) {
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
        setComments(prev => [...prev, fullComment])
      }

      setCommentCount(prev => prev + 1)
      setReplyingTo(null)
      setInputText('')
      Keyboard.dismiss()
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
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

    setComments(prev => {
      const filtered = prev.filter(c => c.id !== commentId)
      if (filtered.length !== prev.length) {
        setCommentCount(count => count - 1)
        return filtered
      }

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
    <>
      {/* Comment toggle button - stays inline with like button */}
      <TouchableOpacity style={styles.toggleButton} onPress={toggleExpanded} activeOpacity={0.7}>
        <Ionicons
          name="chatbubble-outline"
          size={16}
          color={Colors.textMuted}
        />
        {commentCount > 0 && (
          <Text style={styles.countText}>{commentCount}</Text>
        )}
      </TouchableOpacity>

      {/* Expanded comments section - full width below */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          ) : (
            <>
              {/* Comments list */}
              {comments.length > 0 ? (
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
                <Text style={styles.noComments}>No comments yet</Text>
              )}

              {/* Comment input */}
              {user && (
                <View style={styles.inputSection}>
                  {replyingTo && (
                    <View style={styles.replyingTo}>
                      <Text style={styles.replyingToText}>
                        Replying to <Text style={styles.replyingToName}>@{replyingTo.user?.username}</Text>
                      </Text>
                      <TouchableOpacity onPress={() => setReplyingTo(null)}>
                        <Ionicons name="close" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.inputRow}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.inputAvatar} />
                    ) : (
                      <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={10} color={Colors.textDim} />
                      </View>
                    )}
                    <TextInput
                      style={styles.input}
                      placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                      placeholderTextColor={Colors.textDim}
                      value={inputText}
                      onChangeText={(text) => setInputText(text.slice(0, 500))}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, (!inputText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                      onPress={handleSubmit}
                      disabled={!inputText.trim() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={Colors.text} />
                      ) : (
                        <Ionicons name="arrow-up" size={16} color={inputText.trim() ? Colors.background : Colors.textDim} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  expandedSection: {
    width: '100%',
    marginTop: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  commentsList: {
    gap: Spacing.md,
  },
  noComments: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  replyItem: {
    marginTop: Spacing.sm,
  },
  avatarContainer: {},
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  username: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  dot: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
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
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: Spacing.sm,
  },
  actionText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  actionDot: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
  },
  deleteText: {
    color: Colors.error,
  },
  repliesContainer: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  inputSection: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  replyingToText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  replyingToName: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 80,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
})
