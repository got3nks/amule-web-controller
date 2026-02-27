/**
 * useDebouncedValue Hook
 *
 * Returns a debounced copy of the given value that only updates
 * after the specified delay of inactivity.
 */

import { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';

/**
 * @param {*} value - The value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {*} The debounced value
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
};
