'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

// Bump this string to re-show the modal for a NEW announcement. Each device
// stores the last version it dismissed in localStorage, so a new version shows
// once and then stays hidden.
const ANNOUNCEMENT_VERSION = 'r32-bonus';
const STORAGE_KEY = 'wc_announcement';

interface Props {
  title: string;
  body: string;
  cta: string;
}

export function AnnouncementModal({ title, body, cta }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== ANNOUNCEMENT_VERSION) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable (private mode etc.) — just don't show.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT_VERSION);
    } catch {
      // ignore write failures
    }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          style={{ background: 'rgba(12,3,30,0.72)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="card-royal-elev max-w-sm w-full text-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(252,192,40,0.28), rgba(252,192,40,0.05))',
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="h-8 w-8 text-gold-300" />
            </motion.div>

            <h2 className="text-xl font-black gold-text">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream/85">{body}</p>

            <button type="button" onClick={dismiss} className="btn-gold mt-5 w-full">
              {cta}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
