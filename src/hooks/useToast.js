import { useState, useCallback, useRef } from 'react';
import { generateId } from '../lib/utils.js';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = generateId();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback(msg => toast({ message: msg, type: 'success' }), [toast]);
  const error = useCallback(msg => toast({ message: msg, type: 'error', duration: 6000 }), [toast]);
  const warning = useCallback(msg => toast({ message: msg, type: 'warning' }), [toast]);
  const info = useCallback(msg => toast({ message: msg, type: 'info' }), [toast]);

  return { toasts, toast, success, error, warning, info, dismiss };
}
