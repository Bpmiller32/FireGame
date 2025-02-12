/// <reference types="vite/client" />

// Asset imports
declare module '*.glb?url' {
  const src: string;
  export default src;
}

declare module '*.png?url' {
  const src: string;
  export default src;
}
