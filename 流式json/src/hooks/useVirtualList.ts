import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface Options {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

interface VirtualResult {
  setContainer: (el: HTMLDivElement | null) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  padTop: number;
  padBottom: number;
}

export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 10
}: Options): VirtualResult {
  const elRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
    roRef.current?.disconnect();
    if (el) {
      setViewportH(el.clientHeight);
      setScrollTop(el.scrollTop);
      const ro = new ResizeObserver(() => {
        setViewportH(el.clientHeight);
      });
      ro.observe(el);
      roRef.current = ro;
    }
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useLayoutEffect(() => {
    if (elRef.current) setViewportH(elRef.current.clientHeight);
  });

  const effectiveH = viewportH > 0 ? viewportH : window.innerHeight || 600;
  const visibleCount = Math.ceil(effectiveH / itemHeight) + overscan * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(itemCount, startIndex + visibleCount);
  const padTop = startIndex * itemHeight;
  const padBottom = Math.max(0, (itemCount - endIndex) * itemHeight);

  return { setContainer, onScroll, startIndex, endIndex, padTop, padBottom };
}
