import { useEffect } from 'react';

// A simple hook to enable D-Pad spatial navigation.
// In a full production app, you might use @noriginmedia/norigin-spatial-navigation.
// This is a lightweight geometric closest-element implementation.

export function useSpatialNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(e.key)) return;

      const currentFocus = document.activeElement as HTMLElement;
      if (!currentFocus) return;

      // If we're not focused on anything, or body is focused, focus the first focusable element
      if (currentFocus === document.body) {
        const firstFocusable = document.querySelector('[tabindex="0"]') as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
        return;
      }

      e.preventDefault(); // Prevent page scroll

      const focusableElements = Array.from(
        document.querySelectorAll('a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];

      const currentRect = currentFocus.getBoundingClientRect();
      
      let bestMatch: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const el of focusableElements) {
        if (el === currentFocus) continue;
        
        // Ignore hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) continue;

        const rect = el.getBoundingClientRect();
        
        let isEligible = false;
        let distance = Infinity;

        // Determine if 'el' is in the direction of the arrow key
        if (e.key === 'ArrowRight') {
          if (rect.left >= currentRect.right - 10) { // Slight tolerance
            isEligible = true;
            distance = Math.hypot(rect.left - currentRect.right, rect.top - currentRect.top);
          }
        } else if (e.key === 'ArrowLeft') {
          if (rect.right <= currentRect.left + 10) {
            isEligible = true;
            distance = Math.hypot(currentRect.left - rect.right, rect.top - currentRect.top);
          }
        } else if (e.key === 'ArrowDown') {
          if (rect.top >= currentRect.bottom - 10) {
            isEligible = true;
            distance = Math.hypot(rect.left - currentRect.left, rect.top - currentRect.bottom);
          }
        } else if (e.key === 'ArrowUp') {
          if (rect.bottom <= currentRect.top + 10) {
            isEligible = true;
            distance = Math.hypot(rect.left - currentRect.left, currentRect.top - rect.bottom);
          }
        }

        if (isEligible && distance < minDistance) {
          minDistance = distance;
          bestMatch = el;
        }
      }

      if (bestMatch) {
        bestMatch.focus();
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
