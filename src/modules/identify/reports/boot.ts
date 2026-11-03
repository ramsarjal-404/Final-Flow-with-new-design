/* The history entry key when the Identify chunk was first evaluated. The browser keeps `history.state`
   across a reload, so a reloaded or pasted file-view URL still carries its router state; it is recognised
   because the chunk is evaluated on that very entry (the file view is otherwise only reached from the
   report view, which loads the chunk first). Used by SCR-IDN-03 to redirect to /identify. */
export const BOOT_KEY: string = (window.history.state as { key?: string } | null)?.key ?? 'default';
