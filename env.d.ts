interface Env {
  JWT_SECRET: string
  ENVIRONMENT: 'staging' | 'production'
  STORAGE_KV: KVNamespace
}