import { useEffect, useRef } from 'react';

interface LiquidGlassOptions {
  intensity?: number;
  morphDuration?: number;
  shimmer?: boolean;
}

export function useLiquidGlass(options: LiquidGlassOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { intensity = 1, morphDuration = 300, shimmer = false } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Apply liquid glass styles dynamically
    element.style.setProperty('--liquid-glass-intensity', intensity.toString());
    element.style.setProperty('--morph-duration', `${morphDuration}ms`);

    if (shimmer) {
      element.classList.add('glass-shimmer');
    }

    // Handle hover effects
    const handleMouseEnter = () => {
      element.classList.add('animate-liquid-morph');
    };

    const handleMouseLeave = () => {
      element.classList.remove('animate-liquid-morph');
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity, morphDuration, shimmer]);

  return elementRef;
}