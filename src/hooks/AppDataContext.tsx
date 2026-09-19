import { createContext, useContext, type ReactNode } from 'react'
import { useAppData, type AppData } from './useAppData'

const Ctx = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const data = useAppData()
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useApp(): AppData {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppDataProvider')
  return ctx
}
