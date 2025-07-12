export interface ParsedWidget {
  type: string;
  id?: string;
  index?: number;
  data: Record<string, any>;
  rawContent: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedMessage {
  text: string;
  widgets: ParsedWidget[];
  hasWidgets: boolean;
}

export interface WidgetData {
  // Task widget data
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assignees?: string[];
  
  // Team member widget data
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  
  // Project widget data
  project_name?: string;
  project_description?: string;
  category?: string;
  status?: string;
  
  // Progress widget data
  progress?: number;
  completed?: number;
  total?: number;
  color?: string;
  
  // Date picker widget data
  date_value?: string;
  min_date?: string;
  max_date?: string;
  
  // Priority selector widget data
  priority_value?: string;
  options?: string[];

  // Fallback for unknown widget types
  content?: string;

  // Added for task/subtask association
  taskIndex?: number;
  subtaskIndex?: number;
  parentTaskIndex?: number;
}

export class HTMLParser {
  private static readonly WIDGET_TAGS = [
    'task', 'subtask', 'team_member', 'project_name', 'project_description',
    'progress_indicator', 'date_picker', 'priority_selector',
    // Add the actual tags the AI is returning
    'project_deadline', 'team_member1', 'team_member2', 'team_member3',
    'project_name', 'project_description', 'progress', 'priority',
    // Add new projectname tag for the updated AI prompt
    'projectname',
    // Add missing widget types that are causing "Unknown widget type" errors
    'category', 'status', 'edc_date', 'fud_date', 'project_owner', 'project_lead', 'team_members', 'tasks'
  ];

  private static readonly UPDATE_TAGS = [
    'update_task', 'update_subtask', 'update_team_member'
  ];

  /**
   * Parse AI response and extract widgets
   */
  static parseMessage(content: string): ParsedMessage {
    console.log('\ud83d\udfe6 [HTMLParser] parseMessage input:', content);
    let widgets: ParsedWidget[] = [];
    let processedText = content;

    // Parse all widget tags and accumulate widgets
    const allTags = [...this.WIDGET_TAGS, ...this.UPDATE_TAGS];
    console.log('\ud83d\udfe6 [HTMLParser] Searching for tags:', allTags);
    
    for (const tag of allTags) {
      const tagWidgets = this.parseTag(content, tag);
      if (tagWidgets && tagWidgets.length > 0) {
        console.log(`\ud83d\udfe6 [HTMLParser] Found widgets for <${tag}>:`, tagWidgets);
        widgets.push(...tagWidgets); // accumulate
      }
    }

    // Fallback: parse any <taskX> tags (e.g., <task1>, <task2>, ...)
    const taskXRegex = /<task(\d+)([^>]*)>([\s\S]*?)<\/task\d+>/gi;
    let match;
    while ((match = taskXRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[2] || '';
      const innerContent = match[3] || '';
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      const widget = this.createWidget('task', attributes, innerContent, startIndex, endIndex);
      if (widget) {
        widgets.push(widget);
      }
    }

    // Deduplicate widgets by type and content/title
    widgets = widgets.filter((widget, index, self) =>
      index === self.findIndex(w =>
        w.type === widget.type &&
        ((w.data && widget.data && w.data.title && widget.data.title && w.data.title === widget.data.title) ||
         (w.rawContent === widget.rawContent))
      )
    );

    console.log('\ud83d\udfe6 [HTMLParser] Total widgets found:', widgets.length, widgets);

    // Only remove widget tags if widgets were actually found
    if (widgets.length > 0) {
      processedText = this.removeWidgetTags(content);
      console.log('\ud83d\udfe6 [HTMLParser] Removed widget tags, processed text:', processedText);
    } else {
      console.log('\ud83d\udfe6 [HTMLParser] No widgets found, keeping original text');
    }

    // Final cleanup of the text
    processedText = processedText.replace(/\s+/g, ' ').trim();
    console.log('\ud83d\udfe6 [HTMLParser] Final cleaned text:', processedText);

    const result = {
      text: processedText,
      widgets,
      hasWidgets: widgets.length > 0
    };
    
    console.log('\ud83d\udfe6 [HTMLParser] Final result:', result);
    return result;
  }

  /**
   * Parse specific tag type - supports both opening/closing tags and self-closing tags, robust to whitespace/newlines
   */
  private static parseTag(content: string, tagName: string): ParsedWidget[] {
    const widgets: ParsedWidget[] = [];
    // Pattern for opening/closing tags: <tag>content</tag> (robust to whitespace)
    const openingClosingRegex = new RegExp(`<${tagName}(?:\s+[^>]*)?>[\s\S]*?<\/${tagName}>`, 'gi');
    let match;
    while ((match = openingClosingRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      // Extract attributes (if any) from opening tag
      const attrMatch = fullMatch.match(new RegExp(`<${tagName}(\s+[^>]*)?>`));
      const attributes = attrMatch && attrMatch[1] ? attrMatch[1] : '';
      // Extract inner content
      const innerContent = fullMatch.replace(new RegExp(`^<${tagName}(\s+[^>]*)?>`), '').replace(new RegExp(`<\/${tagName}>$`), '');
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      const widget = this.createWidget(tagName, attributes, innerContent, startIndex, endIndex);
      if (widget) {
        widgets.push(widget);
      }
    }
    // Pattern for self-closing tags: <tag attr="value" /> (robust to whitespace)
    const selfClosingRegex = new RegExp(`<${tagName}([^>]*)\s*/>`, 'gi');
    while ((match = selfClosingRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || '';
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      const widget = this.createWidget(tagName, attributes, '', startIndex, endIndex);
      if (widget) {
        widgets.push(widget);
      }
    }
    // Fallback: match any <tag ... /> or <tag>...</tag> for unknown widget types
    if (widgets.length === 0 && tagName === this.WIDGET_TAGS[this.WIDGET_TAGS.length - 1]) {
      // Only run fallback on last tag to avoid duplicates
      const genericSelfClosing = /<([a-zA-Z0-9_]+)([^>]*)\s*\/>(?![\s\S]*<\1)/g;
      while ((match = genericSelfClosing.exec(content)) !== null) {
        const tag = match[1];
        const attributes = match[2] || '';
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        const widget = this.createWidget(tag, attributes, '', startIndex, endIndex);
        if (widget) {
          widgets.push(widget);
          console.log('🟧 [HTMLParser] Fallback self-closing widget:', widget);
        }
      }
      const genericOpeningClosing = /<([a-zA-Z0-9_]+)(\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
      while ((match = genericOpeningClosing.exec(content)) !== null) {
        const tag = match[1];
        const attributes = match[2] || '';
        const innerContent = match[3] || '';
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        const widget = this.createWidget(tag, attributes, innerContent, startIndex, endIndex);
        if (widget) {
          widgets.push(widget);
          console.log('🟧 [HTMLParser] Fallback opening/closing widget:', widget);
        }
      }
    }
    if (widgets.length > 0) {
      console.log(`🟦 [HTMLParser] parseTag <${tagName}> found:`, widgets);
    }
    return widgets;
  }

  /**
   * Create widget from parsed tag
   */
  private static createWidget(
    tagName: string,
    attributes: string,
    content: string,
    startIndex: number,
    endIndex: number
  ): ParsedWidget | null {
    try {
      const parsedAttributes = this.parseAttributes(attributes);
      const widgetData = this.extractWidgetData(tagName, content, parsedAttributes);

      return {
        type: tagName,
        id: parsedAttributes.id,
        index: parsedAttributes.index,
        data: widgetData,
        rawContent: content,
        startIndex,
        endIndex
      };
    } catch (error) {
      console.error(`Failed to create widget for tag ${tagName}:`, error);
      return null;
    }
  }

  /**
   * Parse HTML attributes (robust to missing quotes, extra whitespace, boolean attributes)
   */
  private static parseAttributes(attributesString: string): Record<string, any> {
    const attributes: Record<string, any> = {};
    if (!attributesString.trim()) {
      return attributes;
    }
    // Match key="value", key='value', key=value, or key (boolean)
    const attributeRegex = /(\w+)(?:=(["']?)([^"'\s>]*)\2)?/g;
    let match;
    while ((match = attributeRegex.exec(attributesString)) !== null) {
      const key = match[1];
      const value = match[3] !== undefined ? match[3] : true;
      attributes[key] = value;
    }
    // Extract numeric index from tag name (e.g., team_member1 -> index: 1)
    const numericMatch = attributesString.match(/(\d+)/);
    if (numericMatch) {
      attributes.index = parseInt(numericMatch[1], 10);
    }
    console.log('🟦 [HTMLParser] Parsed attributes:', attributesString, attributes);
    return attributes;
  }

  /**
   * Extract widget data based on tag type
   */
  private static extractWidgetData(
    tagName: string,
    content: string,
    attributes: Record<string, any>
  ): WidgetData {
    const data: WidgetData = {};

    // Normalize numbered task/subtask tags
    if (/^task\d+$/.test(tagName)) {
      data.title = content.trim();
      // Optionally, store the index for future association
      data.taskIndex = parseInt(tagName.replace('task', ''), 10);
      return data;
    }
    if (/^subtask\d+$/.test(tagName)) {
      data.title = content.trim();
      // Optionally, store the index for future association
      data.subtaskIndex = parseInt(tagName.replace('subtask', ''), 10);
      // Try to associate with parent task by order
      if (attributes.parentTaskIndex) {
        data.parentTaskIndex = parseInt(attributes.parentTaskIndex, 10);
      }
      return data;
    }

    switch (tagName) {
      case 'task':
      case 'update_task':
        data.title = content.trim();
        data.priority = attributes.priority || 'medium';
        data.due_date = attributes.due_date;
        data.assignees = attributes.assignees ? attributes.assignees.split(',') : [];
        break;

      case 'subtask':
      case 'update_subtask':
        data.title = content.trim();
        data.priority = attributes.priority || 'medium';
        break;

      case 'team_member':
      case 'update_team_member':
      case 'team_member1':
      case 'team_member2':
      case 'team_member3':
        data.name = content.trim();
        data.email = attributes.email;
        data.role = attributes.role || 'Team Member';
        data.avatar_url = attributes.avatar_url;
        break;

      case 'project_name':
        data.project_name = content.trim();
        break;

      case 'projectname':
        data.project_name = content.trim();
        break;

      case 'project_description':
        data.project_description = content.trim();
        break;

      case 'progress_indicator':
      case 'progress':
        data.progress = parseFloat(attributes.progress || '0');
        data.completed = parseInt(attributes.completed || '0', 10);
        data.total = parseInt(attributes.total || '0', 10);
        data.color = attributes.color || '#3B82F6';
        break;

      case 'date_picker':
      case 'project_deadline':
        data.date_value = content.trim() || attributes.value;
        data.min_date = attributes.min_date;
        data.max_date = attributes.max_date;
        break;

      case 'priority_selector':
      case 'priority':
        data.priority_value = content.trim() || attributes.value;
        data.options = attributes.options ? attributes.options.split(',') : ['low', 'medium', 'high', 'urgent'];
        break;

      default:
        // For unknown tags, store all attributes and content as data fields
        Object.assign(data, attributes);
        data.content = content.trim();
        console.log('🟧 [HTMLParser] Fallback extractWidgetData:', tagName, data);
        break;
    }

    return data;
  }

  /**
   * Remove widget tags from text for clean display
   */
  private static removeWidgetTags(content: string): string {
    let processedText = content;

    // Remove all widget tags (both opening/closing and self-closing)
    const allTags = [...this.WIDGET_TAGS, ...this.UPDATE_TAGS];
    
    for (const tag of allTags) {
      // Remove opening/closing tags: <tag>content</tag>
      const regex1 = new RegExp(`<${tag}(?:\\s+[^>]*)?>.*?</${tag}>`, 'gi');
      processedText = processedText.replace(regex1, '');
      
      // Remove self-closing tags: <tag attr="value" />
      const regex2 = new RegExp(`<${tag}[^>]*\\s*/>`, 'gi');
      processedText = processedText.replace(regex2, '');
    }

    // Clean up extra whitespace, newlines, and ensure no orphaned text nodes
    processedText = processedText
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
      .replace(/\.\s*\.\s*\./g, '...') // Fix multiple dots
      .replace(/\s*\.\s*$/g, '.') // Fix trailing dots with spaces
      .trim();

    // Ensure we don't have empty or whitespace-only content
    if (processedText.length === 0 || processedText.trim().length === 0) {
      return '';
    }

    return processedText;
  }

  /**
   * Generate HTML for a widget
   */
  static generateWidgetHTML(widget: ParsedWidget): string {
    const { type, data, index } = widget;
    const attributes = this.generateAttributes(data, index);

    switch (type) {
      case 'task':
        return `<task${attributes}>${data.title || 'Untitled Task'}</task>`;

      case 'subtask':
        return `<subtask${attributes}>${data.title || 'Untitled Subtask'}</subtask>`;

      case 'team_member':
        return `<team_member${attributes}>${data.name || 'Unknown Member'}</team_member>`;

      case 'project_name':
        return `<project_name${attributes}>${data.project_name || 'Untitled Project'}</project_name>`;

      case 'projectname':
        return `<projectname${attributes}>${data.project_name || 'Untitled Project'}</projectname>`;

      case 'project_description':
        return `<project_description${attributes}>${data.project_description || 'No description'}</project_description>`;

      case 'progress_indicator':
        return `<progress_indicator${attributes}>${data.progress || 0}%</progress_indicator>`;

      case 'date_picker':
        return `<date_picker${attributes}>${data.date_value || 'Select date'}</date_picker>`;

      case 'priority_selector':
        return `<priority_selector${attributes}>${data.priority_value || 'medium'}</priority_selector>`;

      default:
        return `<${type}${attributes}>${data.title || data.name || data.project_name || ''}</${type}>`;
    }
  }

  /**
   * Generate HTML attributes from widget data
   */
  private static generateAttributes(data: WidgetData, index?: number): string {
    const attributes: string[] = [];

    if (index !== undefined) {
      attributes.push(`index="${index}"`);
    }

    // Add data-specific attributes
    if (data.priority) {
      attributes.push(`priority="${data.priority}"`);
    }

    if (data.due_date) {
      attributes.push(`due_date="${data.due_date}"`);
    }

    if (data.assignees && data.assignees.length > 0) {
      attributes.push(`assignees="${data.assignees.join(',')}"`);
    }

    if (data.email) {
      attributes.push(`email="${data.email}"`);
    }

    if (data.role) {
      attributes.push(`role="${data.role}"`);
    }

    if (data.avatar_url) {
      attributes.push(`avatar_url="${data.avatar_url}"`);
    }

    if (data.progress !== undefined) {
      attributes.push(`progress="${data.progress}"`);
    }

    if (data.completed !== undefined) {
      attributes.push(`completed="${data.completed}"`);
    }

    if (data.total !== undefined) {
      attributes.push(`total="${data.total}"`);
    }

    if (data.color) {
      attributes.push(`color="${data.color}"`);
    }

    if (data.min_date) {
      attributes.push(`min_date="${data.min_date}"`);
    }

    if (data.max_date) {
      attributes.push(`max_date="${data.max_date}"`);
    }

    if (data.options && data.options.length > 0) {
      attributes.push(`options="${data.options.join(',')}"`);
    }

    return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
  }

  /**
   * Validate widget data
   */
  static validateWidget(widget: ParsedWidget): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields based on widget type
    switch (widget.type) {
      case 'task':
        if (!widget.data.title) {
          errors.push('Task title is required');
        }
        break;

      case 'team_member':
        if (!widget.data.name) {
          errors.push('Team member name is required');
        }
        break;

      case 'project_name':
      case 'projectname':
        if (!widget.data.project_name) {
          errors.push('Project name is required');
        }
        break;

      case 'progress_indicator':
        if (widget.data.progress === undefined || widget.data.progress < 0 || widget.data.progress > 1) {
          errors.push('Progress must be between 0 and 1');
        }
        break;

      case 'date_picker':
        if (widget.data.value && !this.isValidDate(widget.data.value)) {
          errors.push('Invalid date format');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if string is a valid date
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Extract all widgets from a message
   */
  static extractWidgets(content: string): ParsedWidget[] {
    const parsed = this.parseMessage(content);
    return parsed.widgets;
  }

  /**
   * Check if content contains widgets
   */
  static hasWidgets(content: string): boolean {
    const parsed = this.parseMessage(content);
    return parsed.hasWidgets;
  }

  /**
   * Get widget count by type
   */
  static getWidgetCounts(content: string): Record<string, number> {
    const widgets = this.extractWidgets(content);
    const counts: Record<string, number> = {};

    for (const widget of widgets) {
      counts[widget.type] = (counts[widget.type] || 0) + 1;
    }

    return counts;
  }
} 