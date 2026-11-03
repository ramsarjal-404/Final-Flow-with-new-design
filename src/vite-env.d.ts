/// <reference types="vite/client" />
declare module '*/vendor/loginArt.js' { export function mountLoginArt(root: HTMLElement): () => void; }
declare module '*/vendor/orb.js' { export function mountOrb(el: HTMLElement, options?: Record<string, unknown>): { canvas: HTMLCanvasElement; pause(): void; resume(): void; setColors(colors: string[]): void }; }
