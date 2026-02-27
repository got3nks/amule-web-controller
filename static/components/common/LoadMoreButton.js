/**
 * LoadMoreButton Component
 *
 * Auto-loads more items when scrolled into view (via Intersection Observer).
 * Falls back to manual "Load more" / "Load all" buttons.
 * Works in both scrollable containers (desktop table) and page scroll (mobile cards).
 */

import React from 'https://esm.sh/react@18.2.0';
import { Select } from './FormControls.js';
import { PAGE_SIZE_OPTIONS } from '../../utils/index.js';

const { createElement: h, useRef, useEffect, useCallback } = React;

/**
 * Load more button component with auto-load on scroll
 * @param {number} totalCount - Total number of items available
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {number} remaining - Number of items remaining to load
 * @param {function} onLoadMore - Handler for loading more items
 * @param {function} onLoadAll - Handler for loading all remaining items (optional)
 * @param {number} pageSize - Number of items to load per batch
 * @param {function} onPageSizeChange - Handler for changing page size (optional)
 */
const LoadMoreButton = ({
  totalCount,
  hasMore,
  remaining,
  onLoadMore,
  onLoadAll,
  pageSize,
  onPageSizeChange
}) => {
  const sentinelRef = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // Intersection Observer: auto-load when sentinel scrolls into view.
  // Only depends on hasMore (not remaining) to avoid a cascade where each load
  // triggers a re-observe that fires immediately on the still-visible sentinel.
  // Instead, after each load we unobserve and re-observe after a delay to handle
  // tall screens where one batch doesn't fill the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    let recheckTimer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && onLoadMoreRef.current) {
          onLoadMoreRef.current();
          // Pause observation, then re-check after DOM settles
          observer.unobserve(el);
          recheckTimer = setTimeout(() => {
            if (el.isConnected) observer.observe(el);
          }, 300);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => {
      clearTimeout(recheckTimer);
      observer.disconnect();
    };
  }, [hasMore]);

  const handlePageSizeChange = useCallback((e) => {
    const newSize = parseInt(e.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  }, [onPageSizeChange]);

  // Don't show if no data or all items already displayed
  if (totalCount === 0 || !hasMore) return null;

  // Calculate how many will be loaded next
  const nextBatch = Math.min(remaining, pageSize);

  // Show "Load all" only if there's more than one batch remaining
  const showLoadAll = onLoadAll && remaining > pageSize;

  return h('div', { ref: sentinelRef, className: 'flex items-center gap-2 flex-wrap justify-center pt-4' },
    // Load more button (manual fallback)
    h('button', {
      onClick: onLoadMore,
      className: 'px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors'
    }, `Load more (${nextBatch})`),

    // Load all button (only if more than one batch remaining)
    showLoadAll && h('button', {
      onClick: onLoadAll,
      className: 'px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors'
    }, `Load all (${remaining})`),

    // Page size selector (only if handler provided)
    onPageSizeChange && h(Select, {
      value: pageSize,
      onChange: handlePageSizeChange,
      options: PAGE_SIZE_OPTIONS.map(size => ({ value: size, label: `${size} / batch` })),
      title: 'Items per batch',
      className: 'h-9 !text-xs'
    })
  );
};

export default LoadMoreButton;
