import { useRef, useCallback } from 'react';

export function useDragScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStatus = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Only allow left-clicks
    if (e.button !== 0) return;

    // Prevent default browser behavior (text selection, image dragging ghosting)
    e.preventDefault();

    dragStatus.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }, []);

  const onMouseLeave = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (dragStatus.current.isDown) {
      dragStatus.current.isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = '';
    }
  }, []);

  const onMouseUp = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (dragStatus.current.isDown) {
      dragStatus.current.isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = '';
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !dragStatus.current.isDown) return;
    e.preventDefault();

    const walkX = (e.clientX - dragStatus.current.startX) * 1.5; // Drag speed multiplier
    const walkY = (e.clientY - dragStatus.current.startY) * 1.5;

    container.scrollLeft = dragStatus.current.scrollLeft - walkX;
    container.scrollTop = dragStatus.current.scrollTop - walkY;
  }, []);

  return {
    ref: containerRef,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    style: { cursor: 'grab' }
  };
}
