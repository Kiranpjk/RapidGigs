import { useState, useEffect, useRef, RefObject } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  minSwipeVelocity?: number;
}

interface SwipeState {
  isSwiping: boolean;
  swipeOffset: number;
}

export const useSwipeGesture = (
  elementRef: RefObject<HTMLElement>,
  config: SwipeGestureConfig
): SwipeState => {
  const {
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
    minSwipeVelocity = 0.3,
  } = config;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    swipeOffset: 0,
  });

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const currentX = useRef<number>(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      currentX.current = 0;
      setSwipeState({ isSwiping: true, swipeOffset: 0 });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!swipeState.isSwiping && touchStartX.current === 0) return;

      const currentTouchX = e.touches[0].clientX;
      const currentTouchY = e.touches[0].clientY;
      const deltaX = currentTouchX - touchStartX.current;
      const deltaY = currentTouchY - touchStartY.current;

      // Check if horizontal swipe (not vertical scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        currentX.current = deltaX;
        setSwipeState({ isSwiping: true, swipeOffset: deltaX });
      }
    };

    const handleTouchEnd = () => {
      const deltaX = currentX.current;
      const deltaTime = Date.now() - touchStartTime.current;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Check if swipe meets minimum distance and velocity thresholds
      if (Math.abs(deltaX) >= minSwipeDistance && velocity >= minSwipeVelocity) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }

      // Reset state
      touchStartX.current = 0;
      touchStartY.current = 0;
      currentX.current = 0;
      setSwipeState({ isSwiping: false, swipeOffset: 0 });
    };

    // Mouse event handlers for desktop
    const handleMouseDown = (e: MouseEvent) => {
      touchStartX.current = e.clientX;
      touchStartY.current = e.clientY;
      touchStartTime.current = Date.now();
      currentX.current = 0;
      setSwipeState({ isSwiping: true, swipeOffset: 0 });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (touchStartX.current === 0) return;

      const deltaX = e.clientX - touchStartX.current;
      const deltaY = e.clientY - touchStartY.current;

      // Check if horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        currentX.current = deltaX;
        setSwipeState({ isSwiping: true, swipeOffset: deltaX });
      }
    };

    const handleMouseUp = () => {
      if (touchStartX.current === 0) return;

      const deltaX = currentX.current;
      const deltaTime = Date.now() - touchStartTime.current;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Check if swipe meets minimum distance and velocity thresholds
      if (Math.abs(deltaX) >= minSwipeDistance && velocity >= minSwipeVelocity) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }

      // Reset state
      touchStartX.current = 0;
      touchStartY.current = 0;
      currentX.current = 0;
      setSwipeState({ isSwiping: false, swipeOffset: 0 });
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [elementRef, onSwipeLeft, onSwipeRight, minSwipeDistance, minSwipeVelocity, swipeState.isSwiping]);

  return swipeState;
};
