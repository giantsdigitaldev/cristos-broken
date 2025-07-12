export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  status: 'active' | 'completed' | 'archived' | 'draft';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  cover_image?: string;
  cover_image_url?: string;
  color?: string;
  is_public?: boolean;
  progress?: number;
  total_tasks?: number;
  completed_tasks?: number;
  metadata?: any;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  assigned_to: string[];
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  attachments?: string[];
  parent_task_id?: string;
  order_index?: number;
  metadata?: any;
}

export interface ProjectComment {
  id: string;
  project_id: string;
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
}

export interface PendingTaskAssignment {
  id: string;
  task_id: string;
  project_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

export interface TaskComment {
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
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assigned_to?: string;
  order_index?: number;
} 