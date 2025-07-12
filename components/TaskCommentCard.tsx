import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants';
import { getTimeAgo } from '../utils/date';
import Button from './Button';
import UserAvatar from './UserAvatar';

export interface TaskCommentWithReplies {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: TaskCommentWithReplies[];
}

interface TaskCommentCardProps {
  comment: TaskCommentWithReplies;
  currentUserId?: string;
  onReply?: (parentCommentId: string, content: string) => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  onRefresh?: () => void;
}

function getDisplayName(user: any) {
  if (user.full_name) {
    return user.full_name;
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.username || user.email || 'Unknown';
}

const TaskCommentCard: React.FC<TaskCommentCardProps> = ({ 
  comment, 
  currentUserId, 
  onReply,
  onEdit,
  onDelete,
  onRefresh 
}) => {
  const { dark } = useTheme();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(comment.replies && comment.replies.length > 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

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
    if (!editContent.trim() || !onEdit) return;
    onEdit(comment.id, editContent.trim());
    setIsEditing(false);
    if (onRefresh) onRefresh();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(comment.id);
            if (onRefresh) onRefresh();
          }
        }
      ]
    );
  };

  const handleReply = () => {
    if (!replyContent.trim() || !onReply) return;
    onReply(comment.id, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
    setShowReplies(true);
    if (onRefresh) onRefresh();
  };

  return (
    <View style={styles.container}>
      {/* Main Comment */}
      <View style={styles.commentContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <UserAvatar size={40} userId={comment.user_id} style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{getDisplayName(comment.user)}</Text>
              <Text style={[styles.timestamp, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>{getTimeAgo(comment.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleMorePress} style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
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
              <Button
                title="Cancel"
                filled={false}
                onPress={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                style={[styles.editButton, { backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                textColor={dark ? COLORS.white : COLORS.greyscale900}
              />
              <Button
                title="Save"
                filled={true}
                onPress={handleEdit}
                style={[styles.editButton, { backgroundColor: COLORS.primary }]}
                textColor={COLORS.white}
              />
            </View>
          </View>
        ) : (
          <Text style={[styles.content, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{comment.content}</Text>
        )}
        {/* Comment Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setIsReplying(true)}
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={18} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
            <Text style={[styles.actionText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Reply</Text>
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
              <Text style={[styles.actionText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>{comment.replies?.length || 0} {comment.replies?.length === 1 ? 'reply' : 'replies'}</Text>
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
              onKeyPress={({ nativeEvent }) => {
                // @ts-ignore: shiftKey is only on web
                if (nativeEvent.key === 'Enter' && !(nativeEvent.shiftKey)) {
                  handleReply();
                }
              }}
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
            <TaskCommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
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
  content: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
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

export default TaskCommentCard; 