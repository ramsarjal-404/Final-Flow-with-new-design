/* The history entry the app was loaded on. Browsers keep `history.state` (and so react-router's
   location.key and state) across a reload, so "this page was reloaded or opened from a pasted link"
   is detected as: the current entry is the one the app booted on (or has no key at all).
   Used by pages that must redirect without in-app context (report view, builder, file view). */
export const BOOT_KEY: string = (window.history.state as { key?: string } | null)?.key ?? 'default';
export const isDirectLoad = (key: string) => key === 'default' || key === BOOT_KEY;
