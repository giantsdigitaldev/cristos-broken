import { COLORS } from '@/constants';
import { ParsedWidget } from '@/utils/aiServices/htmlParser';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SubtaskCard from './SubtaskCard';
import TaskCard from './TaskCard';
import DatePicker from './widgets/DatePicker';
import PrioritySelector from './widgets/PrioritySelector';
import ProgressIndicator from './widgets/ProgressIndicator';
import ProjectSummaryCard from './widgets/ProjectSummaryCard';
import TeamMemberCard from './widgets/TeamMemberCard';

interface WidgetRendererProps {
  widgets: ParsedWidget[];
  projectId?: string;
  onWidgetUpdate?: (widgetId: string, updates: any) => void;
  onWidgetDelete?: (widgetId: string) => void;
  onWidgetPress?: (widget: ParsedWidget) => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widgets,
  projectId: propProjectId,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetPress
}) => {
  const navigation = useNavigation();
  console.log('🎨 WidgetRenderer called with:', {
    widgetsCount: widgets?.length || 0,
    widgets: widgets,
    projectId: propProjectId
  });
  
  // Safety check for widgets
  if (!widgets || !Array.isArray(widgets)) {
    console.warn('🎨 WidgetRenderer: Invalid widgets prop:', widgets);
    return null;
  }
  
  // Deduplicate tasks by title/content before rendering
  const dedupedWidgets = widgets.filter((widget, idx, arr) => {
    if (/^task\d*$/.test(widget.type) || widget.type === 'task') {
      return idx === arr.findIndex(w =>
        (/^task\d*$/.test(w.type) || w.type === 'task') &&
        ((w.data && widget.data && w.data.title && widget.data.title && w.data.title === widget.data.title) ||
         (w.rawContent === widget.rawContent))
      );
    }
    return true;
  });

  if (dedupedWidgets.length === 0) {
    return null;
  }

  // Filter and count tasks
  const taskWidgets = dedupedWidgets.filter(w => /^task\d*$/.test(w.type) || w.type === 'task');
  const totalTasks = taskWidgets.length;
  const completedTasks = taskWidgets.filter(w => w.data.status === 'completed').length;

  const renderTaskWidget = (widget: ParsedWidget, index: number) => {
    console.log('🎨 renderTaskWidget called with:', { widget, index, propProjectId });
    const task = {
      id: widget.id || `temp-task-${index}`,
      title: widget.data.title || widget.rawContent || 'Untitled Task',
      description: '', // Hide description in widget
      status: widget.data.status || 'todo',
      priority: widget.data.priority || 'medium',
      due_date: widget.data.due_date || undefined,
      project_id: propProjectId || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: widget.data.assignees || [],
      project: null,
    };
    console.log('🎨 Task data created:', task);
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <TaskCard
          task={task}
          index={index}
          totalTasks={totalTasks}
          onPress={() => onWidgetPress?.(widget)}
          onToggle={async (id: string, completed: boolean) => {
            onWidgetUpdate?.(id, { status: completed ? 'completed' : 'todo' });
          }}
          onRefresh={() => {}}
          hideDescription
          style={styles.taskCardWidget}
        />
      </View>
    );
  };

  const renderSubtaskWidget = (widget: ParsedWidget, index: number) => {
    const subtask = {
      id: widget.id || `temp-subtask-${index}`,
      title: widget.data.title || widget.rawContent || 'Untitled Subtask',
      description: widget.data.description || '',
      completed: false,
      order_index: index,
      task_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <SubtaskCard
          subtask={subtask}
          index={index}
          totalSubtasks={dedupedWidgets.filter(w => w.type === 'subtask').length}
          onToggle={(id: string, completed: boolean) => {
            onWidgetUpdate?.(id, { completed });
          }}
        />
      </View>
    );
  };

  const renderProjectWidget = (widget: ParsedWidget, index: number) => {
    const projectData = {
      id: widget.id || `temp-project-${index}`,
      name: widget.data.project_name || widget.rawContent || 'Untitled Project',
      description: widget.data.project_description || '',
      status: widget.data.status || 'active',
      numberOfTasks: 0,
      numberOfCompletedTasks: 0,
      numberOfDaysLeft: 0,
      endDate: widget.data.due_date || null,
    };
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <ProjectSummaryCard
          {...projectData}
          onPress={() => onWidgetPress?.(widget)}
          onEdit={() => {}}
        />
      </View>
    );
  };

  const renderTeamMemberWidget = (widget: ParsedWidget, index: number) => {
    const memberData = {
      id: widget.id || `temp-member-${index}`,
      name: widget.data.name || widget.rawContent || 'Unknown Member',
      email: widget.data.email || '',
                      role: widget.data.role || 'fyi',
      avatar_url: widget.data.avatar_url || '',
    };
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <TeamMemberCard
          id={memberData.id}
          name={memberData.name}
          email={memberData.email}
          role={memberData.role}
          avatar_url={memberData.avatar_url}
          onPress={() => onWidgetPress?.(widget)}
          onEdit={() => {}}
          onRemove={() => { onWidgetDelete?.(widget.id!); }}
        />
      </View>
    );
  };

  const renderProgressIndicatorWidget = (widget: ParsedWidget, index: number) => {
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <ProgressIndicator
          progress={widget.data.progress || 0}
          completed={widget.data.completed || 0}
          total={widget.data.total || 0}
          color={widget.data.color}
          title={widget.data.title}
          onPress={() => onWidgetPress?.(widget)}
        />
      </View>
    );
  };

  const renderDatePickerWidget = (widget: ParsedWidget, index: number) => {
    const isDeadlineWidget = widget.type === 'deadline';
    const dateValue = isDeadlineWidget 
      ? widget.rawContent || widget.data.content || ''
      : widget.data.date_value || '';
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <DatePicker
          dateValue={dateValue}
          minDate={widget.data.min_date}
          maxDate={widget.data.max_date}
          title={widget.data.title || (isDeadlineWidget ? 'Deadline' : 'Select Date')}
          onDateChange={(date) => {
            onWidgetUpdate?.(widget.id!, { date_value: date });
          }}
          onPress={() => onWidgetPress?.(widget)}
        />
      </View>
    );
  };

  const renderPrioritySelectorWidget = (widget: ParsedWidget, index: number) => {
    return (
      <View key={widget.id || index} style={styles.widgetContainer}>
        <PrioritySelector
          priorityValue={widget.data.priority_value || 'medium'}
          options={widget.data.options}
          title={widget.data.title}
          onPriorityChange={(priority: string) => {
            onWidgetUpdate?.(widget.id!, { priority_value: priority });
          }}
          onPress={() => onWidgetPress?.(widget)}
        />
      </View>
    );
  };
  
  const renderWidget = (widget: ParsedWidget, index: number) => {
    // Safety check for individual widget
    if (!widget || typeof widget !== 'object') {
      console.warn('🎨 WidgetRenderer: Invalid widget at index', index, widget);
      return null;
    }
    
    console.log('🎨 Rendering widget:', widget.type, widget);
    
    try {
      // Treat any widget type matching /^task\d*$/ as a task
      if (/^task\d*$/.test(widget.type)) {
        console.log('🎨 Rendering as task widget');
        return renderTaskWidget(widget, index);
      }
      switch (widget.type) {
        case 'task':
          console.log('🎨 Rendering as task widget');
          return renderTaskWidget(widget, index);
        case 'subtask':
          console.log('🎨 Rendering as subtask widget');
          return renderSubtaskWidget(widget, index);
        case 'project_name':
        case 'projectname':
        case 'project_description':
          console.log('🎨 Rendering as project widget');
          return renderProjectWidget(widget, index);
        case 'team_member':
        case 'team_member1':
        case 'team_member2':
        case 'team_member3':
          console.log('🎨 Rendering as team member widget');
          return renderTeamMemberWidget(widget, index);
        case 'progress_indicator':
        case 'progress':
          console.log('🎨 Rendering as progress indicator widget');
          return renderProgressIndicatorWidget(widget, index);
        case 'date_picker':
        case 'project_deadline':
        case 'deadline':
          console.log('🎨 Rendering as date picker widget');
          return renderDatePickerWidget(widget, index);
        case 'priority_selector':
        case 'priority':
          console.log('🎨 Rendering as priority selector widget');
          return renderPrioritySelectorWidget(widget, index);
        // Add support for missing widget types
        case 'category':
        case 'status':
        case 'edc_date':
        case 'fud_date':
        case 'project_owner':
        case 'project_lead':
        case 'team_members':
        case 'tasks':
          // These are metadata widgets that should be displayed as text
          console.log('🎨 Rendering as metadata widget:', widget.type);
          return (
            <View key={widget.id || index} style={styles.widgetContainer}>
              <View style={styles.metadataContainer}>
                <Text style={styles.metadataLabel}>{widget.type.replace(/_/g, ' ').toUpperCase()}:</Text>
                <Text style={styles.metadataValue}>
                  {widget.data.content || widget.rawContent || 'N/A'}
                </Text>
              </View>
            </View>
          );
        default:
          console.log('Unknown widget type:', widget.type, widget);
          return null;
      }
    } catch (error) {
      console.error('🎨 WidgetRenderer: Error rendering widget:', widget.type, error);
      return null;
    }
  };

  // Filter out null widgets and ensure we have valid widgets to render
  const validWidgets = dedupedWidgets
    .map((widget, index) => renderWidget(widget, index))
    .filter(widget => widget !== null);

  if (validWidgets.length === 0) {
    return null;
  }

  // Render header if there are tasks
  const renderHeader = () => (
    totalTasks > 0 && (
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Tasks {completedTasks}/{totalTasks} completed</Text>
      </View>
    )
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {validWidgets}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  headerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.grayscale100,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'flex-start',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  widgetContainer: {
    marginBottom: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  taskCardWidget: {
    width: '100%',
    alignSelf: 'stretch',
  },
  teamMemberContainer: {
    marginBottom: 8,
  },
  teamMemberCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.greyscale900,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.grayscale700,
  },
  metadataContainer: {
    backgroundColor: COLORS.grayscale100,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 16,
    color: COLORS.greyscale900,
  },
});

export default WidgetRenderer; 