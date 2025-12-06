/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_DIAMETER_SIZING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
