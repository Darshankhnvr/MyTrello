import React, { useState } from 'react';
import BaseModal from './BaseModal';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (title: string) => void;
  isLoading: boolean;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onAddColumn, isLoading }) => {
  const [columnTitle, setColumnTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (columnTitle.trim()) {
      onAddColumn(columnTitle.trim());
      setColumnTitle(''); // Clear input after submission
    }
  };

  const handleClose = () => {
    setColumnTitle(''); // Clear input on close
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Add New Column">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="column-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Column Title
          </label>
          <input
            type="text"
            id="column-title"
            value={columnTitle}
            onChange={(e) => setColumnTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., To Do, In Progress"
            required
            disabled={isLoading}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !columnTitle.trim()}
          >
            {isLoading ? 'Adding...' : 'Add Column'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddColumnModal;
