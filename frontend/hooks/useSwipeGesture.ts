// ✅ FIXED: Removed swipeState.isSwiping from useEffect dependency array
//           Previously, every swipe state change re-registered ALL event listeners,
//           causing a cascade of add/remove during active swipes → erratic mobile behavior.
//           Touch tracking is now done via refs (no state reads inside handlers).

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

  // ✅ Use refs for all mutable tracking values — avoids stale closures
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentX = useRef(0);
  const isSwipingRef = useRef(false); // ✅ track swiping state via ref, not useState

  // ✅ Keep callback refs current so handlers always call latest version
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  useEffect(() => { onSwipeLeftRef.current = onSwipeLeft; }, [onSwipeLeft]);
  useEffect(() => { onSwipeRightRef.current = onSwipeRight; }, [onSwipeRight]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      currentX.current = 0;
      isSwipingRef.current = true;
      setSwipeState({ isSwiping: true, swipeOffset: 0 });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingRef.current) return;
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        currentX.current = deltaX;
        setSwipeState({ isSwiping: true, swipeOffset: deltaX });
      }
    };

    const handleTouchEnd = () => {
      const deltaX = currentX.current;
      const deltaTime = Math.max(1, Date.now() - touchStartTime.current);
      const velocity = Math.abs(deltaX) / deltaTime;

      if (Math.abs(deltaX) >= minSwipeDistance && velocity >= minSwipeVelocity) {
        if (deltaX < 0) onSwipeLeftRef.current?.();
        else onSwipeRightRef.current?.();
      }

      touchStartX.current = 0;
      currentX.current = 0;
      isSwipingRef.current = false;
      setSwipeState({ isSwiping: false, swipeOffset: 0 });
    };

    const handleMouseDown = (e: MouseEvent) => {
      touchStartX.current = e.clientX;
      touchStartY.current = e.clientY;
      touchStartTime.current = Date.now();
      currentX.current = 0;
      isSwipingRef.current = true;
      setSwipeState({ isSwiping: true, swipeOffset: 0 });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSwipingRef.current) return;
      const deltaX = e.clientX - touchStartX.current;
      const deltaY = e.clientY - touchStartY.current;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        currentX.current = deltaX;
        setSwipeState({ isSwiping: true, swipeOffset: deltaX });
      }
    };

    const handleMouseUp = () => {
      if (!isSwipingRef.current) return;
      const deltaX = currentX.current;
      const deltaTime = Math.max(1, Date.now() - touchStartTime.current);
      const velocity = Math.abs(deltaX) / deltaTime;

      if (Math.abs(deltaX) >= minSwipeDistance && velocity >= minSwipeVelocity) {
        if (deltaX < 0) onSwipeLeftRef.current?.();
        else onSwipeRightRef.current?.();
      }

      touchStartX.current = 0;
      currentX.current = 0;
      isSwipingRef.current = false;
      setSwipeState({ isSwiping: false, swipeOffset: 0 });
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // ✅ FIXED: Only re-register listeners when the element or thresholds change —
  //           NOT on every swipe state update (was causing listener storm)
  }, [elementRef, minSwipeDistance, minSwipeVelocity]);

  return swipeState;
};
