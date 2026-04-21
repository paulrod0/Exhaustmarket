/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Google <model-viewer> web component — cargado dinámicamente
declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        'camera-controls'?: boolean | ''
        'auto-rotate'?: boolean | ''
        'shadow-intensity'?: string
        exposure?: string
        'environment-image'?: string
        alt?: string
      },
      HTMLElement
    >
  }
}
