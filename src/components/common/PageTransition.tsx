import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

export default function PageTransition({ children, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="w-full h-full print:h-auto print:!transform-none print:!opacity-100 print:block"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
