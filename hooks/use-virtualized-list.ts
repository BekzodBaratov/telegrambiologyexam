"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"

interface UseVirtualizedListOptions<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}

interface VirtualizedListResult<T> {
  virtualItems: { item: T; index: number; style: React.CSSProperties }[]
  totalHeight: number
  containerRef: React.RefObject<HTMLDivElement>
  scrollTo: (index: number) => void
}

export function useVirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualizedListOptions<T>): VirtualizedListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * itemHeight

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2)
    return { startIndex: start, endIndex: end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const virtualItems = useMemo(() => {
    const result: { item: T; index: number; style: React.CSSProperties }[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
        style: {
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      })
    }
    return result
  }, [items, startIndex, endIndex, itemHeight])

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const scrollTo = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight
      }
    },
    [itemHeight],
  )

  return { virtualItems, totalHeight, containerRef, scrollTo }
}
