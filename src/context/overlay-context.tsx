"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Tracks whether anything is covering the screen.
 *
 * The floating nav pill sits above everything so it stays reachable while you
 * scroll, which is right until a bottom sheet slides up: the pill then floats on
 * top of the sheet's own controls and swallows taps meant for them. The nav
 * needs to know, and a sheet has no way to tell it — they are cousins in the
 * tree, not parent and child.
 *
 * A counter rather than a boolean, because sheets open sheets: the routine
 * picker opens the routine editor, and the last one to close must be the one
 * that brings the nav back.
 */
interface OverlayContextType {
  isOverlayOpen: boolean;
  acquire: () => void;
  release: () => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const acquire = useCallback(() => setCount((previous) => previous + 1), []);
  const release = useCallback(() => setCount((previous) => Math.max(0, previous - 1)), []);

  const value = useMemo(
    () => ({ isOverlayOpen: count > 0, acquire, release }),
    [count, acquire, release],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

function useOverlayContext(): OverlayContextType {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('Overlay hooks must be used within an OverlayProvider');
  }
  return context;
}

/**
 * Call from any sheet or dialog with its own open state. The lock is released on
 * unmount too, so a sheet that disappears mid-animation cannot leave the nav
 * hidden for good.
 */
export function useOverlayLock(isOpen: boolean): void {
  const { acquire, release } = useOverlayContext();

  useEffect(() => {
    if (!isOpen) return;
    acquire();
    return release;
  }, [isOpen, acquire, release]);
}

export function useIsOverlayOpen(): boolean {
  return useOverlayContext().isOverlayOpen;
}
