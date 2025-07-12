import { supabase } from './supabase';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  description?: string;
  project_id?: string; // Added for team sharing
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

export interface ProjectCategory {
  id: string;
  project_id: string;
  category_id: string;
  created_at: string;
  category?: Category;
}

export class CategoryService {
  // Get all categories for a user (including project categories they have access to)
  static async getUserCategories(userId: string, projectId?: string): Promise<Category[]> {
    try {
      let query = supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', userId);

      // If projectId is provided, also get categories for that project
      if (projectId) {
        // Get user's own categories + categories from the project they have access to
        const { data, error } = await supabase
          .from('user_categories')
          .select('*')
          .or(`user_id.eq.${userId},project_id.eq.${projectId}`)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching user categories:', error);
          return [];
        }

        return data || [];
      } else {
        // Just get user's own categories
        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
          console.error('Error fetching user categories:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error in getUserCategories:', error);
      return [];
    }
  }

  // Create a new category
  static async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .insert([{
          ...category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createCategory:', error);
      return null;
    }
  }

  // Update a category
  static async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error updating category:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateCategory:', error);
      return null;
    }
  }

  // Delete a category
  static async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      return false;
    }
  }

  // Get categories for a specific project (including team member access)
  static async getProjectCategories(projectId: string): Promise<Category[]> {
    try {
      // Get categories that are either:
      // 1. Directly linked to the project (project_id = projectId)
      // 2. Created by team members of the project
      const { data, error } = await supabase
        .from('user_categories')
        .select(`
          *,
          project_categories!inner(project_id)
        `)
        .eq('project_categories.project_id', projectId);

      if (error) {
        console.error('Error fetching project categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectCategories:', error);
      return [];
    }
  }

  // Link categories to a project (for team sharing)
  static async linkCategoriesToProject(projectId: string, categoryIds: string[]): Promise<boolean> {
    try {
      const projectCategories = categoryIds.map(categoryId => ({
        project_id: projectId,
        category_id: categoryId
      }));

      const { error } = await supabase
        .from('project_categories')
        .insert(projectCategories);

      if (error) {
        console.error('Error linking categories to project:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in linkCategoriesToProject:', error);
      return false;
    }
  }

  // Unlink categories from a project
  static async unlinkCategoriesFromProject(projectId: string, categoryIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_categories')
        .delete()
        .eq('project_id', projectId)
        .in('category_id', categoryIds);

      if (error) {
        console.error('Error unlinking categories from project:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in unlinkCategoriesFromProject:', error);
      return false;
    }
  }

  // Get default categories (for new users)
  static getDefaultCategories(): { name: string; color: string; description: string }[] {
    return [
      {
        name: 'Development',
        color: '#3B82F6',
        description: 'Software development tasks'
      },
      {
        name: 'Design',
        color: '#10B981',
        description: 'UI/UX design work'
      },
      {
        name: 'Marketing',
        color: '#F59E0B',
        description: 'Marketing and promotion'
      },
      {
        name: 'Bug Fixes',
        color: '#EF4444',
        description: 'Bug fixes and maintenance'
      },
      {
        name: 'Research',
        color: '#8B5CF6',
        description: 'Research and planning'
      }
    ];
  }

  // Search categories
  static async searchCategories(userId: string, query: string): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchCategories:', error);
      return [];
    }
  }

  // Get category usage statistics
  static async getCategoryUsageStats(userId: string): Promise<{ [key: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('id, usage_count')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching category usage stats:', error);
        return {};
      }

      const stats: { [key: string]: number } = {};
      data?.forEach(category => {
        stats[category.id] = category.usage_count || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error in getCategoryUsageStats:', error);
      return {};
    }
  }

  // Increment usage count for a category
  static async incrementUsageCount(categoryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_categories')
        .update({ 
          usage_count: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId);

      if (error) {
        console.error('Error incrementing usage count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in incrementUsageCount:', error);
      return false;
    }
  }
} 