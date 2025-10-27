'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function Tooltip({ children, content, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

      // Adjust if tooltip goes off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
      if (top + tooltipRect.height > viewportHeight - 8) {
        top = triggerRect.top - tooltipRect.height - 8;
      }

      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100); // Small delay to allow moving to tooltip
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsVisible(false);
  };

  // Check if className already includes a display utility
  const hasDisplayUtility = className?.split(' ').some(cls => 
    cls === 'flex' || cls === 'block' || cls === 'inline' || 
    cls === 'inline-flex' || cls === 'inline-block' || cls === 'grid'
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={hasDisplayUtility ? className : `inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50"
            style={{
              top: position.top,
              left: position.left,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="bg-slate-900 dark:bg-slate-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-slate-700 max-w-xs pointer-events-auto">
              {content}
              {/* Arrow */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
