import React, { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  threshold?: number;
}

export const useLongPress = ({ onLongPress, onClick, threshold = 1500 }: UseLongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isMoved = useRef(false);

  const start = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    isLongPress.current = false;
    isMoved.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      console.log('longPress triggered');
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((e?: React.PointerEvent | React.TouchEvent) => {
    if (e?.type === 'pointermove' || e?.type === 'touchmove') {
      isMoved.current = true;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const wasMoved = isMoved.current;
    clear();
    if (!isLongPress.current && !wasMoved) {
      onClick();
    }
  }, [clear, onClick]);

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: (e: any) => clear(e),
    onPointerCancel: (e: any) => clear(e),
    onPointerMove: (e: any) => clear(e),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  };
};
