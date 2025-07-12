import { COLORS, icons } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { getTimeAgo } from '@/utils/date';
import { ProjectComment, ProjectService } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from './Button';
import UserAvatar from './UserAvatar';

// Extend ProjectComment for UI tree rendering and like state
export interface ProjectCommentWithExtras extends ProjectComment {
  replies?: ProjectCommentWithExtras[];
  is_liked?: boolean;
  likes_count?: number;
}

interface ProjectCommentCardProps {
  comment: ProjectCommentWithExtras;
  currentUserId?: string;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (parentCommentId: string, content: string) => void;
  onLike?: (commentId: string) => void;
  onRefresh?: () => void;
}

function getDisplayName(user: any) {
  if (user.full_name) {
    return user.full_name;
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.username || user.email || 'Fetching name...';
}

const ProjectCommentCard: React.FC<ProjectCommentCardProps> = ({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  onLike,
  onRefresh
}) => {
  const { dark } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(comment.replies && comment.replies.length > 0);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = comment.user_id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleMorePress = () => {
    const options = [];
    
    if (isOwner) {
      options.push(
        { text: 'Edit', onPress: () => setIsEditing(true) },
        { text: 'Delete', onPress: handleDelete, style: 'destructive' as const }
      );
    }
    
    options.push(
      { text: 'Reply', onPress: () => setIsReplying(true) },
      { text: 'Cancel', style: 'cancel' as const }
    );

    Alert.alert('Comment Options', 'What would you like to do?', options);
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      const updatedComment = await ProjectService.updateProjectComment(comment.id, editContent.trim());
      if (updatedComment && onEdit) {
        onEdit(comment.id, editContent.trim());
        setIsEditing(false);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await ProjectService.deleteProjectComment(comment.id);
              if (success && onDelete) {
                onDelete(comment.id);
                if (onRefresh) onRefresh();
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    
    try {
      if (onReply) {
        await onReply(comment.id, replyContent.trim());
        setReplyContent('');
        setIsReplying(false);
        setShowReplies(true);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
      Alert.alert('Error', 'Failed to reply. Please try again.');
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const result = await ProjectService.toggleProjectCommentLike(comment.id);
      if (result && onLike) {
        onLike(comment.id);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Comment */}
      <View style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <View style={styles.commentHeaderLeft}>
            <UserAvatar
              size={40}
              userId={comment.user_id}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                {getDisplayName(comment.user)}
              </Text>
              <Text style={[styles.timestamp, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                {getTimeAgo(comment.created_at)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleMorePress} style={styles.moreButton}>
            <Image
              source={icons.moreCircle}
              style={[styles.moreIcon, { tintColor: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}
            />
          </TouchableOpacity>
        </View>

        {/* Comment Content */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, {
                backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                color: dark ? COLORS.white : COLORS.greyscale900,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              onSubmitEditing={handleEdit}
              blurOnSubmit={false}
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                onPress={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                style={[styles.editButton, { backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
              >
                <Text style={[styles.editButtonText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEdit}
                style={[styles.editButton, { backgroundColor: COLORS.primary }]}
              >
                <Text style={[styles.editButtonText, { color: COLORS.white }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.commentContent, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {comment.content}
          </Text>
        )}

        {/* Comment Actions */}
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={handleLike}
            disabled={isLiking}
            style={styles.actionButton}
          >
            <Ionicons
              name={comment.is_liked ? "heart" : "heart-outline"}
              size={18}
              color={comment.is_liked ? COLORS.error : (dark ? COLORS.grayscale400 : COLORS.grayscale700)}
            />
            <Text style={[styles.actionText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
              {comment.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsReplying(true)}
            style={styles.actionButton}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={dark ? COLORS.grayscale400 : COLORS.grayscale700}
            />
            <Text style={[styles.actionText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
              Reply
            </Text>
          </TouchableOpacity>

          {hasReplies && (
            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              style={styles.actionButton}
            >
              <Ionicons
                name={showReplies ? "chevron-up" : "chevron-down"}
                size={18}
                color={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              />
              <Text style={[styles.actionText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                {comment.replies?.length || 0} {comment.replies?.length === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reply Input */}
        {isReplying && (
          <View style={styles.replyContainer}>
            <TextInput
              style={[styles.replyInput, {
                backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                color: dark ? COLORS.white : COLORS.greyscale900,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              }]}
              placeholder="Write a reply..."
              placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              value={replyContent}
              onChangeText={setReplyContent}
              multiline
              autoFocus
              blurOnSubmit={false}
              // Web: Enter to send, Shift+Enter for newline
              onKeyPress={({ nativeEvent }) => {
                // @ts-ignore: shiftKey is only on web
                if (nativeEvent.key === 'Enter' && !(nativeEvent.shiftKey)) {
                  handleReply();
                }
              }}
              // Mobile: Enter to send
              onSubmitEditing={() => {
                handleReply();
              }}
            />
            <View style={styles.replyButtons}>
              <Button
                title="Cancel"
                filled={false}
                onPress={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
                style={[styles.replyButton, { backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                textColor={dark ? COLORS.white : COLORS.greyscale900}
              />
              <Button
                title="Reply"
                filled={true}
                onPress={handleReply}
                style={[styles.replyButton, { backgroundColor: COLORS.primary }]}
                textColor={COLORS.white}
              />
            </View>
          </View>
        )}
      </View>

      {/* Replies */}
      {showReplies && hasReplies && (
        <View style={styles.repliesContainer}>
          {comment.replies?.map((reply) => (
            <ProjectCommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              onLike={onLike}
              onRefresh={onRefresh}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  commentContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  moreButton: {
    padding: 4,
  },
  moreIcon: {
    width: 20,
    height: 20,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  editContainer: {
    marginBottom: 12,
  },
  editInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  replyContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  replyInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  replyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  repliesContainer: {
    marginLeft: 32,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.grayscale200,
  },
});

export default ProjectCommentCard; 