import React, { createContext, useCallback, useMemo, useState } from 'react';

type Handlers = {
  undo: () => void;
  redo: () => void;
  canUndo?: () => boolean;
  canRedo?: () => boolean;
};

type ContextShape = {
  register: (h: Handlers) => void;
  unregister: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const noop = () => {};

export const UndoRedoContext = createContext<ContextShape>({
  register: noop as any,
  unregister: noop as any,
  undo: noop,
  redo: noop,
  canUndo: false,
  canRedo: false,
});

export const UndoRedoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handlers, setHandlers] = useState<Handlers | null>(null);

  const register = useCallback((h: Handlers) => {
    setHandlers(() => h);
  }, []);

  const unregister = useCallback(() => {
    setHandlers(null);
  }, []);

  const undo = useCallback(() => {
    handlers?.undo?.();
  }, [handlers]);

  const redo = useCallback(() => {
    handlers?.redo?.();
  }, [handlers]);

  const canUndo = !!handlers?.canUndo?.();
  const canRedo = !!handlers?.canRedo?.();

  const value = useMemo(() => ({ register, unregister, undo, redo, canUndo, canRedo }), [register, unregister, undo, redo, canUndo, canRedo]);

  return <UndoRedoContext.Provider value={value}>{children}</UndoRedoContext.Provider>;
};
