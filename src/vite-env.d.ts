/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Definimos la nueva variable de OpenAI
  readonly VITE_OPENAI_API_KEY: string
  // Mantenemos la antigua por si acaso, pero ya no se usará
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
