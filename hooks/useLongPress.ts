import React, { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  threshold?: number;
}

export const useLongPress = ({ onLongPress, onClick, threshold = 800 }: UseLongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isMoved = useRef(false);
  const startPos = useRef<{x: number, y: number} | null>(null);

  const start = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;
    isMoved.current = false;
    
    let x = 0, y = 0;
    if ('touches' in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = (e as any).clientX;
        y = (e as any).clientY;
    }
    startPos.current = { x, y };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (e && startPos.current) {
        let x = 0, y = 0;
        if ('touches' in e && e.touches.length > 0) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if ('clientX' in e) {
            x = (e as any).clientX;
            y = (e as any).clientY;
        }
        
        if (Math.abs(x - startPos.current.x) > 20 || Math.abs(y - startPos.current.y) > 20) {
            isMoved.current = true;
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
        }
    } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
    }
  }, []);

  const end = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPress.current || isMoved.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    onClick();
  }, [onClick]);

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: () => clear(),
    onPointerCancel: () => clear(),
    onPointerMove: clear,
    onClick: handleClick,
    onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
    }
  };
};
