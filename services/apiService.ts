import { API_BASE_URL } from '../constants';
import { Column, Task } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const handleResponse = async <T,>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    // Prefer JSON error bodies, but fall back to text (HTML) when returned.
    if (contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || JSON.stringify(errorData) || 'Something went wrong');
      } catch (e) {
        throw new Error('Something went wrong');
      }
    }

    const text = await response.text();
    // If server returned HTML (starts with '<'), return a concise message instead
    if (text && text.trim().startsWith('<')) {
      throw new Error('Server returned HTML instead of JSON (possible wrong endpoint or dev server directory listing)');
    }
    throw new Error(text || 'Something went wrong');
  }

  // No content
  if (response.status === 204) return { success: true, data: undefined as unknown as T };

  // Try to parse JSON when possible
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { success: true, data };
  }

  // Fallback: attempt to parse text as JSON, otherwise return undefined data
  const text = await response.text();
  try {
    const parsed = text ? JSON.parse(text) : undefined;
    return { success: true, data: parsed as T };
  } catch (e) {
    return { success: true, data: undefined as unknown as T };
  }
};

export const apiService = {
  getBoard: async (): Promise<ApiResponse<Column[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/boards`);
      return await handleResponse<Column[]>(response);
    } catch (error: unknown) {
      console.error('Error fetching board:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  addColumn: async (title: string): Promise<ApiResponse<Column>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      return await handleResponse<Column>(response);
    } catch (error: unknown) {
      console.error('Error adding column:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  updateColumnTitle: async (columnId: string, title: string): Promise<ApiResponse<Column>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      return await handleResponse<Column>(response);
    } catch (error: unknown) {
      console.error('Error updating column title:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  deleteColumn: async (columnId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/columns/${columnId}`, {
        method: 'DELETE',
      });
      return await handleResponse<void>(response);
    } catch (error: unknown) {
      console.error('Error deleting column:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  addTask: async (columnId: string, title: string, description?: string): Promise<ApiResponse<Task>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, title, description }),
      });
      return await handleResponse<Task>(response);
    } catch (error: unknown) {
      console.error('Error adding task:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  updateTask: async (taskId: string, title: string, description?: string): Promise<ApiResponse<Task>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      return await handleResponse<Task>(response);
    } catch (error: unknown) {
      console.error('Error updating task:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  deleteTask: async (taskId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return await handleResponse<void>(response);
    } catch (error: unknown) {
      console.error('Error deleting task:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  reorderColumns: async (columnIds: string[]): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/boards/reorder-columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnIds }),
      });
      return await handleResponse<void>(response);
    } catch (error: unknown) {
      console.error('Error reordering columns:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  reorderTasks: async (
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    newIndex: number,
  ): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/boards/reorder-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sourceColumnId,
          destinationColumnId,
          newIndex,
        }),
      });
      return await handleResponse<void>(response);
    } catch (error: unknown) {
      console.error('Error reordering tasks:', error);
      return { success: false, error: (error as Error).message };
    }
  },
};
