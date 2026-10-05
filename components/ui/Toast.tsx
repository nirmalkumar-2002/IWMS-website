/** Props: open; children; optional onDismiss; role defaults status. No auto-dismiss or focus theft. */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { sharedContent } from '@/content/shared';
export function Toast({
  open = true,
  children,
  onDismiss,
  role = 'status',
}: {
  open?: boolean;
  children: ReactNode;
  onDismiss?: () => void;
  role?: 'status' | 'alert';
}) {
  // The live region remains mounted so inserted content can be announced.
  return (
    <div role={role} aria-atomic="true" className={open ? 'toast' : 'sr-only'}>
      {open && (
        <>
          {children}
          {onDismiss && (
            <button
              type="button"
              aria-label={sharedContent.dismiss}
              onClick={onDismiss}
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
