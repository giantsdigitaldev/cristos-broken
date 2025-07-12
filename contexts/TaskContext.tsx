import { Project, Task } from '@/utils/projectTypes';
import { supabase } from '@/utils/supabase';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

interface TaskWithProject extends Task {
  project: Project | null;
}

interface TaskContextType {
  // Today's tasks for the current user
  todayTasks: TaskWithProject[];
  setTodayTasks: React.Dispatch<React.SetStateAction<TaskWithProject[]>>;
  
  // Project tasks (organized by project ID)
  projectTasks: { [projectId: string]: Task[] };
  setProjectTasks: React.Dispatch<React.SetStateAction<{ [projectId: string]: Task[] }>>;
  
  // Loading states
  todayTasksLoading: boolean;
  projectTasksLoading: { [projectId: string]: boolean };
  
  // Actions
  addTask: (task: TaskWithProject) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  refreshTodayTasks: () => Promise<void>;
  refreshProjectTasks: (projectId: string) => Promise<void>;
  forceRefreshTodaysTasks: () => Promise<void>;
  
  // Real-time subscription status
  isSubscribed: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: React.ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [todayTasks, setTodayTasks] = useState<TaskWithProject[]>([]);
  const [projectTasks, setProjectTasks] = useState<{ [projectId: string]: Task[] }>({});
  const [todayTasksLoading, setTodayTasksLoading] = useState(true);
  const [projectTasksLoading, setProjectTasksLoading] = useState<{ [projectId: string]: boolean }>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Refs for subscription management
  const subscriptionRef = useRef<any>(null);
  const projectsRef = useRef<{ [projectId: string]: Project }>({});
  const userProjectsRef = useRef<Set<string>>(new Set()); // Projects user has access to
  const hasInitiallyLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  // Initialize real-time subscription with enhanced reliability and polling fallback
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Setting up enhanced real-time task subscription for user:', user.id, 'with email:', user.email);

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Reduced from 3 to 2
    let reconnectTimeout: any;
    let pollingInterval: any;
    let isActive = true; // Track if component is still mounted
    let subscriptionActive = false; // Track if subscription is currently active
    let lastErrorTime = 0; // Track last error time to prevent rapid retries

    const setupSubscription = () => {
      if (!isActive || subscriptionActive) return;
      
      // Prevent rapid retries
      const now = Date.now();
      if (now - lastErrorTime < 5000) { // 5 second minimum between retries
        console.log('⏳ Skipping subscription setup - too soon after last error');
        return;
      }
      
      console.log(`🔄 Setting up task subscription (attempt ${reconnectAttempts + 1})`);
      
      // Clean up existing subscription first
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
        } catch (error) {
          console.warn('Error removing existing subscription:', error);
        }
        subscriptionRef.current = null;
      }
      
      // Add longer delay before creating new subscription to avoid conflicts
      setTimeout(() => {
        if (!isActive) return;
        
        try {
          // Subscribe to ALL task changes (we'll filter them in the handler)
          subscriptionRef.current = supabase
            .channel(`tasks-realtime-${user.id}-${Date.now()}`) // Add timestamp to avoid conflicts
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'tasks'
              },
              (payload) => {
                if (!isActive) return;
                
                console.log('📡 Real-time task update received for user:', user?.id, 'with email:', user?.email, 'payload:', payload);
                
                // Add more detailed logging for debugging
                if (payload?.new && typeof payload.new === 'object') {
                  const taskData = payload.new as any;
                  console.log('📡 Task details in real-time update:', {
                    taskId: taskData.id,
                    taskTitle: taskData.title,
                    assignedTo: taskData.assigned_to,
                    projectId: taskData.project_id,
                    eventType: payload.eventType,
                    currentUserId: user?.id,
                    currentUserEmail: user?.email
                  });
                }
                
                handleTaskChange(payload);
                
                // Force refresh today's tasks when we receive any task update
                // This ensures we catch any tasks that might have been missed
                setTimeout(() => {
                  if (isActive) {
                    console.log('🔄 Force refreshing today\'s tasks after real-time update');
                    forceRefreshTodaysTasks();
                  }
                }, 1000);
              }
            )
            .subscribe((status) => {
              if (!isActive) return;
              
              console.log('📡 Enhanced task subscription status:', status, 'for user:', user.id);
              setIsSubscribed(status === 'SUBSCRIBED');
              subscriptionActive = status === 'SUBSCRIBED';
              
              if (status === 'SUBSCRIBED') {
                console.log('✅ Tasks real-time subscription active for user:', user.id);
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                lastErrorTime = 0; // Reset error time
                
                // Start background polling as a fallback
                startBackgroundPolling();
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.error('❌ Tasks subscription error for user:', user.id, 'status:', status);
                subscriptionActive = false;
                lastErrorTime = Date.now();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000); // Increased delays
                  
                  console.log(`🔄 Attempting to reconnect tasks subscription in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                  
                  reconnectTimeout = setTimeout(() => {
                    if (isActive) {
                      setupSubscription();
                    }
                  }, delay);
                } else {
                  console.error('❌ Max reconnection attempts reached for tasks subscription, falling back to polling');
                  // Fall back to polling
                  startBackgroundPolling();
                }
              }
            });
        } catch (error) {
          console.error('❌ Error setting up task subscription:', error);
          subscriptionActive = false;
          lastErrorTime = Date.now();
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000); // Increased delays
            
            console.log(`🔄 Attempting to reconnect tasks subscription after error in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              if (isActive) {
                setupSubscription();
              }
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached for tasks subscription, falling back to polling');
            startBackgroundPolling();
          }
        }
      }, 2000); // Increased delay to 2 seconds to avoid subscription conflicts
    };

    // Background polling as fallback
    const startBackgroundPolling = () => {
      if (!isActive) return;
      
      console.log('🔄 Starting background polling for tasks');
      
      // Poll every 120 seconds as a fallback (increased from 60s)
      pollingInterval = setInterval(async () => {
        if (!isActive) return;
        
        console.log('🔄 Background polling: refreshing today\'s tasks');
        try {
          await forceRefreshTodaysTasks();
        } catch (error) {
          console.error('❌ Error in background polling:', error);
        }
      }, 120000); // 120 seconds
    };

    setupSubscription();

    return () => {
      console.log('🔌 Cleaning up enhanced task subscription for user:', user.id);
      isActive = false;
      subscriptionActive = false;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
        } catch (error) {
          console.warn('Error removing subscription during cleanup:', error);
        }
        subscriptionRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [user?.id]);

  // Check if user has access to a project
  const hasProjectAccess = useCallback(async (projectId: string): Promise<boolean> => {
    const currentUserId = user?.id;
    if (!currentUserId) return false;

    // Check if we already know about this project
    if (projectsRef.current[projectId]) {
      const project = projectsRef.current[projectId];
      // User owns the project
      if (project.user_id === currentUserId) {
        console.log('✅ User owns the project, has access');
        return true;
      }
      
      // Check if user is a team member using project_team_members table
      try {
        const { data: teamMemberships, error: teamError } = await supabase
          .from('project_team_members')
          .select('id, status, role')
          .eq('project_id', projectId)
          .eq('user_id', currentUserId);
        
        if (teamError) {
          console.error('❌ Error fetching team memberships:', teamError);
          return false;
        }
        
        console.log('🔍 Team memberships found for user:', currentUserId, 'in project:', projectId, ':', teamMemberships);
        
        // Check if user has any team membership (active, pending, or any other status)
        const hasMembership = teamMemberships && teamMemberships.length > 0;
        
        if (hasMembership) {
          console.log('✅ User has team membership, has access');
          return true;
        } else {
          console.log('❌ No team membership found for user:', currentUserId, 'in project:', projectId);
          return false;
        }
      } catch (error) {
        console.error('❌ Error checking team membership:', error);
        return false;
      }
    }

    // If project not in cache, check database
    try {
      const { ProjectService } = await import('@/utils/projectServiceWrapper');
      const project = await ProjectService.getProject(projectId);
      
      if (!project) return false;

      // Cache the project
      projectsRef.current[projectId] = project;

      // User owns the project
      if (project.user_id === currentUserId) {
        console.log('✅ User owns the project, has access');
        return true;
      }

      // Check if user is a team member using project_team_members table
      try {
        const { data: teamMemberships, error: teamError } = await supabase
          .from('project_team_members')
          .select('id, status, role')
          .eq('project_id', projectId)
          .eq('user_id', currentUserId);
        
        if (teamError) {
          console.error('❌ Error fetching team memberships:', teamError);
          return false;
        }
        
        console.log('🔍 Team memberships found for user:', currentUserId, 'in project:', projectId, ':', teamMemberships);
        
        // Check if user has any team membership (active, pending, or any other status)
        const hasMembership = teamMemberships && teamMemberships.length > 0;
        
        if (hasMembership) {
          console.log('✅ User has team membership, has access');
          return true;
        } else {
          console.log('❌ No team membership found for user:', currentUserId, 'in project:', projectId);
          return false;
        }
      } catch (error) {
        console.error('❌ Error checking team membership:', error);
        return false;
      }
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }, [user?.id]);

  // Handle real-time task changes with enhanced filtering
  const handleTaskChange = useCallback(async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log('🔍 Processing real-time task change:', {
      eventType,
      taskId: newRecord?.id || oldRecord?.id,
      taskTitle: newRecord?.title || oldRecord?.title,
      projectId: newRecord?.project_id || oldRecord?.project_id,
      assignedTo: newRecord?.assigned_to || oldRecord?.assigned_to,
      currentUserId: user?.id,
      currentUserEmail: user?.email
    });
    
      // Check if user has access to this task's project
  const projectId = newRecord?.project_id || oldRecord?.project_id;
  const hasAccess = await hasProjectAccess(projectId);
  console.log('🔍 Project access check:', {
    projectId,
    currentUserId: user?.id,
    currentUserEmail: user?.email,
    hasAccess,
    eventType,
    taskId: newRecord?.id || oldRecord?.id,
    taskTitle: newRecord?.title || oldRecord?.title
  });
  
  if (!hasAccess) {
    console.log('❌ User does not have access to project, ignoring task update');
    return;
  }

    switch (eventType) {
      case 'INSERT':
        handleTaskInsert(newRecord);
        break;
      case 'UPDATE':
        handleTaskUpdate(newRecord, oldRecord);
        break;
      case 'DELETE':
        handleTaskDelete(oldRecord);
        break;
    }
  }, [hasProjectAccess]);

  // Handle task insertion with enhanced logic
  const handleTaskInsert = useCallback(async (newTask: Task) => {
    console.log('➕ New task inserted:', newTask);
    
    const currentUserId = user?.id;
    if (!currentUserId) return;

    // Check if user is assigned to this task
    const assignedToIds = Array.isArray(newTask.assigned_to) ? newTask.assigned_to.map(String) : [];
    const currentUserIdString = String(currentUserId);
    const isAssigned = assignedToIds.includes(currentUserIdString);
    
    console.log('🔍 Task assignment check:', {
      taskId: newTask.id,
      taskTitle: newTask.title,
      assignedTo: newTask.assigned_to,
      assignedToRaw: JSON.stringify(newTask.assigned_to),
      assignedToIds,
      assignedToIdsRaw: JSON.stringify(assignedToIds),
      currentUserId,
      currentUserIdString,
      isAssigned,
      includesCheck: assignedToIds.includes(currentUserIdString),
      arrayLength: assignedToIds.length,
      shouldShowInTodayTasks: isAssigned,
      shouldShowInProjectTasks: true
    });
    
    if (isAssigned) {
      // User is assigned - add to today's tasks immediately
      const taskWithProject: TaskWithProject = {
        ...newTask,
        project: projectsRef.current[newTask.project_id] || null
      };
      
      setTodayTasks(prev => {
        // Check for duplicates
        const taskExists = prev.some(task => task.id === newTask.id);
        if (taskExists) {
          console.log('⚠️ Task already exists in today\'s tasks, skipping duplicate');
          return prev;
        }
        console.log('✅ Adding new task to today\'s tasks for current user (assigned)');
        return [taskWithProject, ...prev];
      });
    } else {
      console.log('ℹ️ Task not assigned to current user, not adding to today\'s tasks');
    }
    
    // Always add to project tasks (user has access to the project)
    setProjectTasks(prev => {
      const currentProjectTasks = prev[newTask.project_id] || [];
      
      // Check if task already exists to prevent duplicates
      const taskExists = currentProjectTasks.some(task => task.id === newTask.id);
      
      if (taskExists) {
        console.log('ℹ️ Task already exists in project tasks, updating with latest data');
        // Update existing task with latest data
        return {
          ...prev,
          [newTask.project_id]: currentProjectTasks.map(task =>
            task.id === newTask.id ? newTask : task
          )
        };
      }
      
      // Add new task
      return {
        ...prev,
        [newTask.project_id]: [...currentProjectTasks, newTask]
      };
    });
  }, [user?.id]);

  // Handle task update with enhanced reassignment logic
  const handleTaskUpdate = useCallback(async (newTask: Task, oldTask: Task) => {
    console.log('✏️ Task updated:', newTask);
    
    const currentUserId = user?.id;
    if (!currentUserId) return;

    // Check if this is a reassignment (assigned_to changed)
    const isReassignment = JSON.stringify(newTask.assigned_to) !== JSON.stringify(oldTask?.assigned_to);
    
    if (isReassignment) {
      console.log('🔄 Task reassignment detected');
      
      // Check if current user is still assigned to the task
      const newAssignedToIds = Array.isArray(newTask.assigned_to) ? newTask.assigned_to.map(String) : [];
      const oldAssignedToIds = Array.isArray(oldTask?.assigned_to) ? oldTask.assigned_to.map(String) : [];
      const currentUserIdString = String(currentUserId);
      const userStillAssigned = newAssignedToIds.includes(currentUserIdString);
      const userWasAssigned = oldAssignedToIds.includes(currentUserIdString);
      
      console.log('🔄 Reassignment details:', {
        taskId: newTask.id,
        newAssignedToIds,
        oldAssignedToIds,
        currentUserIdString,
        userStillAssigned,
        userWasAssigned
      });
      
      if (userWasAssigned && !userStillAssigned) {
        // User was removed from assignment - remove from today's tasks
        console.log('❌ User removed from task assignment, removing from today\'s tasks');
        setTodayTasks(prev => prev.filter(task => task.id !== newTask.id));
      } else if (!userWasAssigned && userStillAssigned) {
        // User was added to assignment - add to today's tasks immediately
        console.log('✅ User added to task assignment, adding to today\'s tasks');
        const taskWithProject: TaskWithProject = {
          ...newTask,
          project: projectsRef.current[newTask.project_id] || null
        };
        setTodayTasks(prev => [taskWithProject, ...prev]);
      } else if (userStillAssigned) {
        // User is still assigned - just update the task data
        console.log('✏️ User still assigned, updating task data');
        setTodayTasks(prev => prev.map(task => 
          task.id === newTask.id 
            ? { ...task, ...newTask }
            : task
        ));
      }
      // If user was not assigned and is still not assigned, do nothing
    } else {
      // Regular update (not reassignment) - update task data if user is assigned
      const assignedToIds = Array.isArray(newTask.assigned_to) ? newTask.assigned_to.map(String) : [];
      const currentUserIdString = String(currentUserId);
      const isUserAssigned = assignedToIds.includes(currentUserIdString);
      
      console.log('✏️ Regular update check:', {
        taskId: newTask.id,
        assignedToIds,
        currentUserIdString,
        isUserAssigned
      });
      
      if (isUserAssigned) {
        setTodayTasks(prev => prev.map(task => 
          task.id === newTask.id 
            ? { ...task, ...newTask }
            : task
        ));
      }
    }
    
    // Update project tasks (always update project tasks regardless of assignment)
    setProjectTasks(prev => ({
      ...prev,
      [newTask.project_id]: (prev[newTask.project_id] || []).map(task =>
        task.id === newTask.id ? newTask : task
      )
    }));
  }, [user?.id]);

  // Handle task deletion
  const handleTaskDelete = useCallback((deletedTask: Task) => {
    console.log('🗑️ Task deleted:', deletedTask);
    
    // Remove from today's tasks
    setTodayTasks(prev => prev.filter(task => task.id !== deletedTask.id));
    
    // Remove from project tasks
    setProjectTasks(prev => ({
      ...prev,
      [deletedTask.project_id]: (prev[deletedTask.project_id] || []).filter(
        task => task.id !== deletedTask.id
      )
    }));
  }, []);

  // Optimistic task addition
  const addTask = useCallback((task: TaskWithProject) => {
    console.log('➕ Optimistically adding task:', task);
    
    // Only add to today's tasks if assigned to current user
    const assignedToIds = Array.isArray(task.assigned_to) ? task.assigned_to.map(String) : [];
    const currentUserIdString = String(user?.id || '');
    const isUserAssigned = assignedToIds.includes(currentUserIdString);
    
    console.log('➕ Optimistic task assignment check:', {
      taskId: task.id,
      assignedTo: task.assigned_to,
      assignedToRaw: JSON.stringify(task.assigned_to),
      assignedToIds,
      assignedToIdsRaw: JSON.stringify(assignedToIds),
      currentUserIdString,
      isUserAssigned,
      arrayLength: assignedToIds.length
    });
    
    if (isUserAssigned) {
      console.log('✅ Adding task to today\'s tasks (user is assigned)');
      setTodayTasks(prev => {
        // Check if task already exists to prevent duplicates
        const taskExists = prev.some(existingTask => existingTask.id === task.id);
        if (taskExists) {
          console.log('⚠️ Task already exists in today\'s tasks, skipping duplicate');
          return prev;
        }
        return [task, ...prev];
      });
    } else {
      console.log('❌ Not adding task to today\'s tasks (user is not assigned)');
    }
    
    // Add to project tasks immediately (always add to project tasks regardless of assignment)
    setProjectTasks(prev => {
      const currentProjectTasks = prev[task.project_id] || [];
      
      // Check if task already exists to prevent duplicates
      const taskExists = currentProjectTasks.some(existingTask => existingTask.id === task.id);
      
      if (taskExists) {
        console.log('ℹ️ Task already exists in project tasks, updating with latest data');
        // Update existing task with latest data
        return {
          ...prev,
          [task.project_id]: currentProjectTasks.map(existingTask =>
            existingTask.id === task.id ? task : existingTask
          )
        };
      }
      
      // Add new task
      return {
        ...prev,
        [task.project_id]: [...currentProjectTasks, task]
      };
    });
  }, [user?.id]);

  // Optimistic task update
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    console.log('✏️ Optimistically updating task:', taskId, updates);
    
    // Check if this is a reassignment
    const isReassignment = updates.assigned_to !== undefined;
    const currentUserId = user?.id;
    
    if (isReassignment && currentUserId) {
      console.log('🔄 Optimistic task reassignment detected');
      
      // Get current task to check previous assignment
      setTodayTasks(prev => {
        const currentTask = prev.find(task => task.id === taskId);
        if (!currentTask) return prev;
        
        const userWasAssignedStr = (currentTask.assigned_to || []).map(String).includes(String(currentUserId));
        const userStillAssignedStr = (updates.assigned_to || []).map(String).includes(String(currentUserId));
        
        if (userWasAssignedStr && !userStillAssignedStr) {
          // User was removed from assignment - remove from today's tasks
          console.log('❌ User removed from task assignment, removing from today\'s tasks');
          return prev.filter(task => task.id !== taskId);
        } else if (!userWasAssignedStr && userStillAssignedStr) {
          // User was added to assignment - update task data
          console.log('✅ User added to task assignment, updating task data');
          return prev.map(task => 
            task.id === taskId 
              ? { ...task, ...updates }
              : task
          );
        } else if (userStillAssignedStr) {
          // User is still assigned - just update the task data
          console.log('✏️ User still assigned, updating task data');
          return prev.map(task => 
            task.id === taskId 
              ? { ...task, ...updates }
              : task
          );
        }
        // If user was not assigned and is still not assigned, do nothing
        return prev;
      });
    } else {
      // Regular update (not reassignment) - update task data if user is assigned
      setTodayTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updates }
          : task
      ));
    }
    
    // Update project tasks (always update project tasks regardless of assignment)
    setProjectTasks(prev => {
      const newProjectTasks = { ...prev };
      Object.keys(newProjectTasks).forEach(projectId => {
        newProjectTasks[projectId] = newProjectTasks[projectId].map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        );
      });
      return newProjectTasks;
    });
  }, [user?.id]);

  // Optimistic task deletion
  const deleteTask = useCallback((taskId: string) => {
    console.log('🗑️ Optimistically deleting task:', taskId);
    
    // Remove from today's tasks immediately
    setTodayTasks(prev => prev.filter(task => task.id !== taskId));
    
    // Remove from project tasks immediately
    setProjectTasks(prev => {
      const newProjectTasks = { ...prev };
      Object.keys(newProjectTasks).forEach(projectId => {
        newProjectTasks[projectId] = newProjectTasks[projectId].filter(
          task => task.id !== taskId
        );
      });
      return newProjectTasks;
    });
  }, []);

  // Refresh today's tasks with enhanced project access checking
  const refreshTodayTasks = useCallback(async () => {
    if (!user?.id) return;
    
    // Prevent multiple simultaneous calls
    if (isRefreshingRef.current) {
      console.log('🔄 Task refresh already in progress, skipping...');
      return;
    }
    
    try {
      isRefreshingRef.current = true;
      
      // Only set loading to true if we don't have any existing data and haven't loaded initially
      // This prevents the blinking effect when refreshing with existing data
      if (todayTasks.length === 0 && !hasInitiallyLoadedRef.current) {
        setTodayTasksLoading(true);
      }
      
      const { ProjectService } = await import('@/utils/projectServiceWrapper');
      const allTasks = await ProjectService.getAllTasksForUser(user.id);
      
      // Get projects for task mapping and cache them
      const projects = await ProjectService.getProjects(user.id);
      const projectsMap = Object.fromEntries(projects.map(p => [p.id, p]));
      projectsRef.current = projectsMap;
      
      // Update user projects set
      userProjectsRef.current = new Set(projects.map(p => p.id));
      
      const tasksWithProjects = allTasks.map(task => ({
        ...task,
        project: projectsMap[task.project_id] || null
      }));
      
      setTodayTasks(tasksWithProjects);
      hasInitiallyLoadedRef.current = true;
      console.log('✅ Today\'s tasks refreshed for user:', user?.id, 'with email:', user?.email, 'tasks count:', tasksWithProjects.length);
    } catch (error) {
      console.error('❌ Error refreshing today\'s tasks:', error);
    } finally {
      setTodayTasksLoading(false);
      isRefreshingRef.current = false;
    }
  }, [user?.id]);

  // Refresh project tasks with smart merging to avoid duplicates
  const refreshProjectTasks = useCallback(async (projectId: string) => {
    try {
      setProjectTasksLoading(prev => ({ ...prev, [projectId]: true }));
      const { ProjectService } = await import('@/utils/projectServiceWrapper');
      const freshProjectTasks = await ProjectService.getProjectTasks(projectId);
      
      setProjectTasks(prev => {
        const currentProjectTasks = prev[projectId] || [];
        
        // Create a map of existing tasks for quick lookup
        const existingTasksMap = new Map(currentProjectTasks.map(task => [task.id, task]));
        
        // Merge fresh tasks with existing ones, preferring fresh data
        const mergedTasks = freshProjectTasks.map(freshTask => {
          const existingTask = existingTasksMap.get(freshTask.id);
          if (existingTask) {
            // If task exists, use fresh data but preserve any optimistic updates
            return { ...existingTask, ...freshTask };
          }
          return freshTask;
        });
        
        // Add any existing tasks that weren't in the fresh data (optimistic updates)
        currentProjectTasks.forEach(existingTask => {
          const freshTaskExists = freshProjectTasks.some(freshTask => freshTask.id === existingTask.id);
          if (!freshTaskExists) {
            mergedTasks.push(existingTask);
          }
        });
        
        return {
          ...prev,
          [projectId]: mergedTasks
        };
      });
      
      console.log(`✅ Project tasks refreshed for ${projectId}:`, freshProjectTasks.length);
    } catch (error) {
      console.error(`❌ Error refreshing project tasks for ${projectId}:`, error);
    } finally {
      setProjectTasksLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }, []);

  // Force refresh today's tasks - useful when real-time updates are missed
  const forceRefreshTodaysTasks = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('🔄 Force refreshing today\'s tasks for user:', user.id, 'with email:', user.email);
    try {
      // Reset the initial load flag to force a fresh load
      hasInitiallyLoadedRef.current = false;
      isRefreshingRef.current = false;
      
      // Call the refresh function
      await refreshTodayTasks();
      
      console.log('✅ Force refresh completed for user:', user.id);
    } catch (error) {
      console.error('❌ Error in force refresh today\'s tasks:', error);
    }
  }, [user?.id, user?.email, refreshTodayTasks]);

  // Initial load of today's tasks
  useEffect(() => {
    if (user?.id) {
      hasInitiallyLoadedRef.current = false; // Reset for new user
      isRefreshingRef.current = false; // Reset refreshing flag for new user
      refreshTodayTasks();
    }
  }, [user?.id, refreshTodayTasks]);

  const value: TaskContextType = {
    todayTasks,
    setTodayTasks,
    projectTasks,
    setProjectTasks,
    todayTasksLoading,
    projectTasksLoading,
    addTask,
    updateTask,
    deleteTask,
    refreshTodayTasks,
    refreshProjectTasks,
    forceRefreshTodaysTasks,
    isSubscribed
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}; 