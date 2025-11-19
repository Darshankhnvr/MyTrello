import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { UndoRedoContext } from '../context/UndoRedoContext';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'; // Using @hello-pangea/dnd for React 18+ compatibility
import { Column as ColumnType, Task as TaskType } from '../types';
import { apiService } from '../services/apiService';
import Column from './Column';
import ProgressChart from './ProgressChart';
import AddColumnModal from './Modals/AddColumnModal';
import EditTaskModal from './Modals/EditTaskModal';
import ClientSideOnly from './ClientSideOnly'; // Import the client-side only wrapper

interface BoardProps {
  searchQuery?: string;
}

const Board: React.FC<BoardProps> = ({ searchQuery = '' }) => {
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskType | null>(null);

  const fetchBoard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try load from localStorage first
      const raw = window.localStorage.getItem('kanban_board_state_v1');
      const rawHistory = window.localStorage.getItem('kanban_board_history_v1');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.columns)) {
            setColumns(ensureMandatoryColumns(parsed.columns));
            if (rawHistory) {
              try {
                const h = JSON.parse(rawHistory);
                setHistory(h || []);
                setHistoryIndex((h || []).length - 1);
              } catch {}
            }
            setIsLoading(false);
            return;
          }
        } catch {}
      }

      const response = await apiService.getBoard();
      if (response.success && response.data) {
        // Sort columns by order and tasks within columns by order
        const sortedColumns = response.data.sort((a, b) => a.order - b.order).map(col => ({
          ...col,
          tasks: col.tasks.sort((a, b) => a.order - b.order)
        }));
        setColumns(ensureMandatoryColumns(sortedColumns));
      } else {
        setError(response.error || 'Failed to fetch board');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Ensure required columns exist in the board
  const ensureMandatoryColumns = (cols: ColumnType[]) : ColumnType[] => {
    const titles = cols.map(c => (c.title || '').toLowerCase());
    const required = [
      { key: 'to do', title: 'To Do' },
      { key: 'in progress', title: 'In Progress' },
      { key: 'complete', title: 'Complete' },
    ];

    const missing = required.filter(r => !titles.includes(r.key));
    let next = [...cols];
    if (missing.length > 0) {
      missing.forEach((m) => {
        next.push({ _id: Math.random().toString(36).slice(2,9), title: m.title, tasks: [], order: next.length });
      });
      // normalize order
      next = next.map((c, i) => ({ ...c, order: i }));
    }
    return next;
  };

  useEffect(() => {
    fetchBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddColumn = async (title: string) => {
    pushHistory();
    setIsLoading(true);
    try {
      const response = await apiService.addColumn(title);
      if (response.success && response.data) {
        setColumns((prevColumns) => {
          const newColumns = [...prevColumns, { ...response.data!, tasks: [] }];
          return newColumns.sort((a, b) => a.order - b.order); // Ensure new column is sorted
        });
        setIsAddColumnModalOpen(false);
      } else {
        setError(response.error || 'Failed to add column.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameColumn = async (columnId: string, newTitle: string) => {
    pushHistory();
    setIsLoading(true);
    try {
      const response = await apiService.updateColumnTitle(columnId, newTitle);
      if (response.success && response.data) {
        setColumns((prevColumns) =>
          prevColumns.map((col) => (col._id === columnId ? { ...col, title: response.data!.title } : col))
        );
      } else {
        setError(response.error || 'Failed to rename column.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('Are you sure you want to delete this column and all its tasks?')) return;
    pushHistory();
    setIsLoading(true);
    try {
      const response = await apiService.deleteColumn(columnId);
      if (response.success) {
        setColumns((prevColumns) => prevColumns.filter((col) => col._id !== columnId));
      } else {
        setError(response.error || 'Failed to delete column.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (columnId: string, title: string, description: string, tags: string[] = [], dueDate?: string | null) => {
    pushHistory();
    setIsLoading(true);
    try {
      // If api is available, use it; otherwise update locally
      let createdTask: TaskType = {
        _id: Math.random().toString(36).slice(2, 9),
        title,
        description,
        columnId,
        order: 0,
        tags,
        dueDate: dueDate ?? null,
      };
      try {
        const response = await apiService.addTask(columnId, title, description);
        if (response.success && response.data) {
          createdTask = { ...response.data!, tags, dueDate: dueDate ?? null };
        }
      } catch (err) {
        // ignore and use local task
      }
      setColumns((prevColumns) =>
        prevColumns.map((col) =>
          col._id === columnId
            ? { ...col, tasks: [...col.tasks, { ...createdTask, order: col.tasks.length }] }
            : col
        )
      );
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTask = (task: TaskType) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
  };

  const handleSaveTask = async (taskId: string, title: string, description: string) => {
    pushHistory();
    setIsLoading(true);
    try {
      // We accept that the modal now passes tags and dueDate as well — handle via overloaded function
      // This function will be replaced below by a wrapper when modal calls with tags/dueDate
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // New save wrapper that handles tags & dueDate
  const handleSaveTaskWithMeta = async (taskId: string, title: string, description: string, tags: string[], dueDate?: string | null) => {
    pushHistory();
    setIsLoading(true);
    try {
      try {
        const response = await apiService.updateTask(taskId, title, description);
        if (response.success && response.data) {
          setColumns((prevColumns) =>
            prevColumns.map((col) => ({
              ...col,
              tasks: col.tasks.map((task) => (task._id === taskId ? { ...response.data!, tags, dueDate: dueDate ?? null } : task)),
            }))
          );
        } else {
          // fallback local
          setColumns((prev) => prev.map(col => ({...col, tasks: col.tasks.map(t => t._id===taskId ? {...t, title, description, tags, dueDate: dueDate ?? null} : t)})));
        }
      } catch (err) {
        setColumns((prev) => prev.map(col => ({...col, tasks: col.tasks.map(t => t._id===taskId ? {...t, title, description, tags, dueDate: dueDate ?? null} : t)})));
      }
      setIsEditTaskModalOpen(false);
      setTaskToEdit(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string, columnId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    pushHistory();
    setIsLoading(true);
    // Optimistically remove the task locally so users can continue working offline
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col._id === columnId ? { ...col, tasks: col.tasks.filter((task) => task._id !== taskId) } : col
      )
    );
    try {
      const response = await apiService.deleteTask(taskId);
      if (!response.success) {
        // log warning but keep optimistic removal
        console.warn('deleteTask failed on server, kept optimistic deletion:', response.error);
      }
    } catch (err: unknown) {
      console.warn('deleteTask threw an error, kept optimistic deletion:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Completion is handled by dragging tasks into/out of the 'Done' column.

  // Undo / Redo history
  const [history, setHistory] = useState<ColumnType[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = () => {
    setHistory((h) => {
      const next = h.slice(0, historyIndex + 1);
      next.push(columns.map(c => ({...c, tasks: c.tasks.map(t => ({...t}))})));
      const newIndex = next.length - 1;
      setHistoryIndex(newIndex);
      // persist history snapshot
      try {
        window.localStorage.setItem('kanban_board_history_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    const prev = history[prevIndex];
    setColumns(prev.map(c => ({...c, tasks: c.tasks.map(t => ({...t}))})));
    setHistoryIndex(prevIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const next = history[nextIndex];
    setColumns(next.map(c => ({...c, tasks: c.tasks.map(t => ({...t}))})));
    setHistoryIndex(nextIndex);
  };

  // Save board state to localStorage whenever columns or history change (debounced)
  const saveTimer = React.useRef<number | null>(null);
  useEffect(() => {
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem('kanban_board_state_v1', JSON.stringify({ columns }));
          window.localStorage.setItem('kanban_board_history_v1', JSON.stringify(history));
        } catch {}
      }, 250) as unknown as number;
    } catch {}
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, history]);

  // Auto-clear any non-persistent error when board changes (e.g., after successful drag/import)
  useEffect(() => {
    if (error) {
      setError(null);
    }
    // only run when columns change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  // Handle import event triggered from header (after file read)
  useEffect(() => {
    const onImport = (e: any) => {
      try {
        const payload = e?.detail?.data;
        if (payload && Array.isArray(payload.columns)) {
          setColumns(payload.columns);
          if (Array.isArray(payload.history)) {
            setHistory(payload.history);
            setHistoryIndex((payload.history || []).length - 1);
          } else {
            setHistory([]);
            setHistoryIndex(-1);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('kanban:import', onImport as EventListener);
    return () => window.removeEventListener('kanban:import', onImport as EventListener);
  }, []);

  const undoRedoContext = useContext(UndoRedoContext);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    // Register the handlers with the provider so header can call them
    undoRedoContext.register({
      undo: () => undo(),
      redo: () => redo(),
      canUndo: () => historyIndex > 0,
      canRedo: () => historyIndex < history.length - 1,
    });
    return () => {
      undoRedoContext.unregister();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history.length]);

  // Filter columns and tasks based on search query (match title, description, tags, dueDate)
  const filteredColumns = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return columns;
    return columns
      .map((col) => {
        const tasks = col.tasks.filter((task) => {
          const inTitle = task.title?.toLowerCase().includes(q);
          const inDesc = (task.description || '').toLowerCase().includes(q);
          const inTags = (task.tags || []).some((t) => t.toLowerCase().includes(q));
          const inDue = task.dueDate ? task.dueDate.toLowerCase().includes(q) : false;
          return inTitle || inDesc || inTags || inDue;
        });
        const colMatches = col.title?.toLowerCase().includes(q);
        return { col, tasks, colMatches };
      })
      .filter(({ colMatches, tasks }) => colMatches || tasks.length > 0)
      .map(({ col, tasks }) => ({ ...col, tasks } as ColumnType));
  }, [columns, searchQuery]);

  const onDragEnd = async (result: DropResult) => {
    try {
      const { destination, source, type } = result;

      // Debugging logs to capture drag details
      // eslint-disable-next-line no-console
      console.debug('onDragEnd called', { source, destination, type });

      pushHistory();

      if (!destination) {
        // eslint-disable-next-line no-console
        console.debug('onDragEnd: no destination, abort');
        return;
      }

      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        // eslint-disable-next-line no-console
        console.debug('onDragEnd: same position, abort');
        return;
      }

      setIsLoading(true); // Indicate loading for drag-and-drop operations
      setError(null);

      // Handle column reordering
      if (type === 'column') {
        const newColumnOrder = Array.from(columns);
        const [movedColumn] = newColumnOrder.splice(source.index, 1);
        newColumnOrder.splice(destination.index, 0, movedColumn);

        // Optimistic update
        setColumns(newColumnOrder);
        const columnIds = newColumnOrder.map((col) => col._id);

        try {
          const response = await apiService.reorderColumns(columnIds);
          if (!response.success) {
            // Backend unavailable or returned error — log but keep optimistic update
            // eslint-disable-next-line no-console
            console.warn('reorderColumns failed, keeping optimistic order:', response.error);
          }
        } catch (err: unknown) {
          // Network or other error — log and keep optimistic update
          // eslint-disable-next-line no-console
          console.warn('reorderColumns threw an error, keeping optimistic order:', err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle task reordering
      if (type === 'task') {
        const sourceColumn = columns.find((col) => col._id === source.droppableId);
        const destinationColumn = columns.find((col) => col._id === destination.droppableId);

        if (!sourceColumn || !destinationColumn) {
          setIsLoading(false);
          return;
        }

        // Optimistic update
        const newColumns = Array.from(columns);
        const startColIndex = newColumns.findIndex(col => col._id === source.droppableId);
        const finishColIndex = newColumns.findIndex(col => col._id === destination.droppableId);

        // additional guards with logging
        if (startColIndex === -1 || finishColIndex === -1) {
          // eslint-disable-next-line no-console
          console.error('onDragEnd: invalid column indices', { startColIndex, finishColIndex, source, destination });
          setIsLoading(false);
          setError('Drag target not found. Try refreshing the page.');
          return;
        }

        // Deep copy to ensure immutability before modification
        const startColumnTasks = Array.from(newColumns[startColIndex].tasks);
        const finishColumnTasks = startColIndex === finishColIndex ? startColumnTasks : Array.from(newColumns[finishColIndex].tasks);

        const [movedTask] = startColumnTasks.splice(source.index, 1);
        // log moved task info
        // eslint-disable-next-line no-console
        console.debug('onDragEnd: movedTask', { movedTask, sourceIndex: source.index, destIndex: destination.index, startColIndex, finishColIndex });

        // Determine done/complete status based on source/destination column titles
        const normalizeTitle = (t?: string) => (t || '').trim().toLowerCase();
        const isDoneTitle = (t?: string) => {
          const v = normalizeTitle(t);
          return v === 'done' || v === 'complete' || v === 'completed' || v.includes('done') || v.includes('complete');
        };
        const srcIsDone = isDoneTitle(sourceColumn.title);
        const destIsDone = isDoneTitle(destinationColumn.title);

        if (!srcIsDone && destIsDone) {
          // moving into Done -> mark completed
          movedTask.completed = true;
          movedTask.completedAt = new Date().toISOString();
          movedTask.previousColumnId = sourceColumn._id;
        } else if (srcIsDone && !destIsDone) {
          // moving out of Done -> unmark
          movedTask.completed = false;
          movedTask.completedAt = null;
          movedTask.previousColumnId = null;
        }

        movedTask.columnId = destination.droppableId; // Update task's columnId
        finishColumnTasks.splice(destination.index, 0, movedTask);

        // Update the tasks in the local state
        newColumns[startColIndex] = { ...newColumns[startColIndex], tasks: startColumnTasks };
        if (startColIndex !== finishColIndex) {
          newColumns[finishColIndex] = { ...newColumns[finishColIndex], tasks: finishColumnTasks };
        }
        // eslint-disable-next-line no-console
        console.debug('onDragEnd: updating columns', { startColTasksLength: startColumnTasks.length, finishColTasksLength: finishColumnTasks.length });
        setColumns(newColumns);

        try {
          const response = await apiService.reorderTasks(
            movedTask._id,
            source.droppableId,
            destination.droppableId,
            destination.index,
          );
          if (!response.success) {
            // Backend unavailable or returned error — log but keep optimistic update
            // eslint-disable-next-line no-console
            console.warn('reorderTasks failed, keeping optimistic move:', response.error);
          } else {
            // If backend succeeded, re-fetch to ensure server ordering matches
            fetchBoard();
          }
        } catch (err: unknown) {
          // Network or other error — log and keep optimistic update
          // eslint-disable-next-line no-console
          console.warn('reorderTasks threw an error, keeping optimistic move:', err);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err: unknown) {
      console.error('Error in onDragEnd:', err);
      try { setError((err as Error).message || String(err)); } catch {}
    } finally {
      // End dragging state after processing so overlay isn't shown during drag
      setIsDragging(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow p-4 overflow-hidden">
      {/* Page title removed per request */}

      <ProgressChart columns={columns} onDayClick={(d) => setSelectedDay(d)} />

      {error && (
        <div className="bg-red-100 dark:bg-red-800 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4 flex items-start justify-between" role="alert">
          <div>
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
          <div className="ml-4">
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-700 dark:text-red-200 underline"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isLoading && !isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50 flex items-center justify-center z-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="sr-only">Loading...</span>
        </div>
      )}

      <ClientSideOnly> {/* Wrap DragDropContext in ClientSideOnly */}
        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col md:flex-row flex-wrap items-start justify-start gap-4 overflow-x-auto h-[calc(100vh-160px)] custom-scrollbar pb-4"
              >
                {filteredColumns.map((column, index) => (
                  <Column
                    key={column._id}
                    column={column}
                    index={index}
                    onAddTask={handleAddTask}
                    onRenameColumn={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    isLoading={isLoading}
                  />
                ))}
                {provided.placeholder}
                <div className="flex-shrink-0 w-full md:w-80">
                  <button
                    onClick={() => setIsAddColumnModalOpen(true)}
                    className="w-full py-3 px-6 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center justify-center text-lg font-medium mt-2 md:mt-0"
                    disabled={isLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 mr-2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add New Column
                  </button>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ClientSideOnly>

      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onAddColumn={handleAddColumn}
        isLoading={isLoading}
      />

      <EditTaskModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onSaveTask={handleSaveTaskWithMeta}
        isLoading={isLoading}
      />
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setSelectedDay(null)} />
          <div className="relative z-10 w-11/12 md:w-1/2 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Completions on {selectedDay}</h3>
              <button className="text-sm text-gray-600 dark:text-gray-300" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
            <div>
              {columns.flatMap(col => col.tasks)
                .filter(t => t.completedAt && t.completedAt.slice(0,10) === selectedDay)
                .map(t => (
                  <div key={t._id} className="mb-2 p-2 border rounded bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">Column: {columns.find(c => c._id === t.previousColumnId)?.title || columns.find(c => c._id === t.columnId)?.title || '—'}</div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{new Date(t.completedAt!).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
