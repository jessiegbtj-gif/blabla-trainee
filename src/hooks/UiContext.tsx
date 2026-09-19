import { createContext, useContext, useState, type ReactNode } from 'react'

interface UiState {
  addSheetOpen: boolean
  openAddSheet: () => void
  closeAddSheet: () => void
}

const Ctx = createContext<UiState | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  return (
    <Ctx.Provider
      value={{
        addSheetOpen,
        openAddSheet: () => setAddSheetOpen(true),
        closeAddSheet: () => setAddSheetOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useUi(): UiState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUi must be used inside UiProvider')
  return ctx
}
