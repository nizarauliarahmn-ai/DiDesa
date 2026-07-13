import React, { useState, useEffect } from 'react';

interface NumberCounterProps {
  end: number;
  duration?: number; // duration in ms
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
}

export default function NumberCounter({ end, duration = 1500, prefix = '', suffix = '', formatter }: NumberCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  const displayValue = formatter ? formatter(count) : count.toLocaleString();

  return <>{prefix}{displayValue}{suffix}</>;
}
