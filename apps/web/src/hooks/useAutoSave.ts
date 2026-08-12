import { useState, useEffect } from 'react';


/**
 * A custom hook that works like useState but persists the data to localStorage.
 * 
 * @param key The localStorage key
 * @param initialValue The initial value if nothing is in localStorage
 */
export function useAutoSave<T>(key: string, initialValue: T) {
  // Initialize state with localStorage value if it exists, otherwise initialValue
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
    return initialValue;
  });

  // Whenever state changes, save it to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }, [key, state]);

  // Provide a way to manually clear the saved state
  const clearSaved = () => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to remove from local storage', e);
    }
  };

  return [state, setState, clearSaved] as const;
}

/**
 * A custom hook that warns the user if they try to navigate away or close the tab
 * when they have unsaved changes.
 * 
 * @param hasUnsavedChanges Boolean indicating if there are unsaved changes
 * @param message Optional custom message for the browser confirm dialog
 */
export function useNavigationWarning(hasUnsavedChanges: boolean, message = "You have unsaved changes. Are you sure you want to leave?") {
  // 1. Handle React Router navigation (e.g. clicking a link in the sidebar)
  /*
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);
  */

  // 2. Handle actual browser navigation/closing tab/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message; // Standard way to show prompt in some browsers
        return message; // Required for some older browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);
}
