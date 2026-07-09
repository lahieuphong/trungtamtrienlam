import { useState, useEffect } from "react";

/**
 * Custom hook debounce
 * @param value: giá trị cần debounce
 * @param delay: thời gian delay (ms)
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Tạo timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timer nếu value thay đổi trước khi delay kết thúc
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
