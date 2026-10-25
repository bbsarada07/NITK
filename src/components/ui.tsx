import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type IconName = 'alert' | 'half' | 'check' | 'copy' | 'info' | 'upload' | 'close' | 'printer' | 'shield' | 'book' | 'chart' | 'trash' | 'download' | 'sparkle';

const PATHS: Record<IconName, string> = {
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  half: 'M12 3a9 9 0 1 0 0 18V3Zm0 0a9 9 0 0 1 0 18',
  check: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  close: 'M18 6 6 18M6 6l12 12',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  trash: 'M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z'
};

export function Icon({ name, className = 'w-5 h-5' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Native <dialog> modal: Escape to close, focus handled by the browser. */
export function Modal({
  open,
  onClose,
  title,
  children,
  side = false
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={
        side
          ? 'm-0 ml-auto h-full max-h-full w-full max-w-md bg-surface p-0 text-ink shadow-soft'
          : 'w-[calc(100%-32px)] max-w-lg rounded-card bg-surface p-0 text-ink shadow-soft'
      }
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" className="btn-ghost w-11 px-0" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed">{children}</div>
    </dialog>
  );
}

const ToastContext = createContext<(msg: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {msg && <div className="rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-soft">{msg}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function useCopy() {
  const toast = useToast();
  return async (text: string, label = 'Copied to clipboard') => {
    const ok = await copyText(text);
    toast(ok ? label : 'Copy failed. Select the text and copy it manually.');
  };
}
