import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete?: (taskId: string, columnId: string) => void;
  allowDelete?: boolean;
  isLoading: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, onDelete, allowDelete = true, isLoading }) => {
  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={isLoading}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm mb-3
            hover:shadow-md transition-all duration-150 ease-in-out
            ${snapshot.isDragging ? 'border-2 border-blue-500 dark:border-blue-400' : 'border border-gray-200 dark:border-gray-600'}
            ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-grab'}
          `}
        >
          <div className="flex-grow">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight pr-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-snug">
                {task.description.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}
              </p>
            )}
            {(task.tags && task.tags.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {task.dueDate && (
              <div className="mt-2">
                <span className="text-xs text-gray-600 dark:text-gray-300">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-1 ml-2">
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors duration-150"
              aria-label={`Edit task ${task.title}`}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14.25v4.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75v-11.25A2.25 2.25 0 015.25 5.25h4.5"
                />
              </svg>
            </button>
            {allowDelete && onDelete && (
              <button
                onClick={() => onDelete(task._id, task.columnId)}
                className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors duration-150"
                aria-label={`Delete task ${task.title}`}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
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
      )}
    </Draggable>
  );
};

export default TaskCard;