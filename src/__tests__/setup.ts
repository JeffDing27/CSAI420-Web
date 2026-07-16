import { resetKvFallback } from '@/utils/kv-store'
import { afterAll, beforeAll } from 'vitest'
import { loadEnvConfig } from '@next/env'

beforeAll(() => {
  loadEnvConfig(process.cwd())
})

afterAll(() => {
  resetKvFallback()
})
