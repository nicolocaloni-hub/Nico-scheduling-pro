import React, { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  threshold?: number;
}

export const useLongPress = ({ onLongPress, onClick, threshold = 1500 }: UseLongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    isLongPress.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      console.log('longPress triggered');
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    clear();
    if (!isLongPress.current) {
      onClick();
    }
  }, [clear, onClick]);

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove: clear, // Add this to cancel on move
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  };
};
