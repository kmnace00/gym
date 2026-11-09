/* Ambient declarations for the browser-global / CommonJS dual modules plus a
   few permissive DOM members, so `tsc --checkJs` focuses on real logic bugs in
   this vanilla-JS codebase instead of DOM narrowing noise. */
declare var Gym: any;
declare var module: { exports: any };
declare var require: any;
declare var global: any;

interface Window {
  webkitAudioContext?: any;
}

/* `document.getElementById` is typed HTMLElement; these members are read via
   permissive casts in the controller, so widen them here for the checker. */
interface Element {
  disabled?: boolean;
  onclick?: any;
  files?: any;
  value?: any;
  blur?(): void;
  focus?(): void;
}

interface EventTarget {
  closest?(selector: string): Element | null;
  getAttribute?(name: string): string | null;
  files?: any;
  value?: any;
}
