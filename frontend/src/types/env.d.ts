interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_FALLBACK_CURRENCY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
