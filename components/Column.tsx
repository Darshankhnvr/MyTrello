import React, { useState, useRef, useEffect } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task as TaskType } from '../types';
import TaskCard from './TaskCard';
import AddTaskModal from './Modals/AddTaskModal';

interface ColumnProps {
  column: ColumnType;
  index: number;
  onAddTask: (columnId: string, title: string, description: string) => Promise<void>;
  onRenameColumn: (columnId: string, newTitle: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onEditTask: (task: TaskType) => void;
  onDeleteTask: (taskId: string, columnId: string) => Promise<void>;
  isLoading: boolean;
}

const Column: React.FC<ColumnProps> = ({
  column,
  index,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onEditTask,
  onDeleteTask,
  isLoading,
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState(column.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
    }
  }, [isEditingTitle]);

  const normalize = (s?: string) => (s || '').trim().toLowerCase();
  const isProtectedColumn = ['to do', 'in progress', 'complete'].includes(normalize(column.title));

  const handleRenameSubmit = async () => {
    if (newColumnTitle.trim() && newColumnTitle.trim() !== column.title) {
      await onRenameColumn(column._id, newColumnTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleAddTaskSubmit = async (title: string, description: string) => {
    await onAddTask(column._id, title, description);
    setIsAddingTask(false);
  };

  return (
    <Draggable draggableId={column._id} index={index} isDragDisabled={isLoading}>
      {(provided) => (
        <div
          {...provided.draggableProps}
          ref={provided.innerRef}
          className={`
            flex flex-col w-full md:w-80 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-lg p-4 mx-2 my-2
            transition-all duration-200 ease-in-out
            ${isLoading ? 'opacity-70' : ''}
          `}
        >
          <div
            className="flex justify-between items-center mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 select-none"
            {...provided.dragHandleProps}
          >
            {isEditingTitle ? (
              <input
                type="text"
                ref={titleInputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    setNewColumnTitle(column.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="flex-grow font-bold text-lg text-gray-800 dark:text-gray-100 bg-transparent border-b border-blue-500 dark:border-blue-400 focus:outline-none px-1"
                disabled={isLoading}
              />
            ) : (
              <h3
                className="flex-grow font-bold text-lg text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150"
                onClick={() => !isLoading && setIsEditingTitle(true)}
              >
                {column.title}
              </h3>
            )}
              <div className="flex space-x-1 ml-2">
              <button
                onClick={() => !isLoading && setIsAddingTask(true)}
                className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors duration-150"
                aria-label={`Add task to ${column.title}`}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {!isProtectedColumn && (
                <button
                  onClick={() => !isLoading && onDeleteColumn(column._id)}
                  className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors duration-150"
                  aria-label={`Delete column ${column.title}`}
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.927a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.14-2.007-2.201C10.74 3.79 9.158 3.75 7.5 3.75m7.5 0h-7.5"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <Droppable droppableId={column._id} type="task">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`
                  flex-grow min-h-[50px] p-2 rounded-md transition-colors duration-200
                  ${snapshot.isDraggingOver ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}
                `}
              >
                {column.tasks.length === 0 && !snapshot.isDraggingOver && (
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                    No tasks yet.
                  </p>
                )}
                {column.tasks.map((task, taskIndex) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    index={taskIndex}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    isLoading={isLoading}
                    allowDelete={true}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <AddTaskModal
            isOpen={isAddingTask}
            onClose={() => setIsAddingTask(false)}
            onAddTask={handleAddTaskSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
    </Draggable>
  );
};

export default Column;
