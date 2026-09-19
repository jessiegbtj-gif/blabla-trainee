import { useEffect, useState } from 'react'
import { api, clearSession, getStoredUsername, getToken } from './lib/api'
import AuthScreen from './components/AuthScreen'
import TopBar from './components/TopBar'
import TabBar, { type TabKey } from './components/TabBar'
import PracticeView from './components/PracticeView'
import TestView from './components/TestView'
import WrongBookView from './components/WrongBookView'
import VocabView from './components/VocabView'
import StatsView from './components/StatsView'
import AddQuestionSheet from './components/AddQuestionSheet'
import Toast from './components/Toast'
import { AppDataProvider } from './hooks/AppDataContext'
import { UiProvider, useUi } from './hooks/UiContext'

type AuthState = 'checking' | 'anon' | { username: string }

export default function App() {
  const [auth, setAuth] = useState<AuthState>('checking')

  useEffect(() => {
    if (!getToken()) {
      setAuth('anon')
      return
    }
    // Validate the stored token still works; fall back to the cached
    // username immediately so the UI doesn't flash a login screen.
    const cached = getStoredUsername()
    if (cached) setAuth({ username: cached })
    api
      .me()
      .then((res) => setAuth({ username: res.username }))
      .catch(() => {
        clearSession()
        setAuth('anon')
      })
  }, [])

  if (auth === 'checking') return null
  if (auth === 'anon') return <AuthScreen onAuthed={(username) => setAuth({ username })} />

  return (
    <AppDataProvider>
      <UiProvider>
        <MainShell username={auth.username} onLogout={() => setAuth('anon')} />
      </UiProvider>
    </AppDataProvider>
  )
}

function MainShell({ username, onLogout }: { username: string; onLogout: () => void }) {
  const ui = useUi()
  const [tab, setTab] = useState<TabKey>('practice')
  const [jumpToQid, setJumpToQid] = useState<string | null>(null)

  return (
    <div className="flex min-h-full flex-col">
      <TopBar username={username} onLogout={onLogout} />

      <main className="mx-auto w-full max-w-[560px] flex-1 p-[16px_16px_calc(96px+env(safe-area-inset-bottom,0px))]">
        <PracticeView active={tab === 'practice'} jumpToQid={jumpToQid} onJumped={() => setJumpToQid(null)} />
        <TestView active={tab === 'test'} />
        <WrongBookView
          active={tab === 'wrong'}
          onReview={(qid) => {
            setJumpToQid(qid)
            setTab('practice')
          }}
        />
        <VocabView active={tab === 'vocab'} />
        <StatsView active={tab === 'stats'} />
      </main>

      {tab === 'practice' && (
        <button
          aria-label="添加题目"
          onClick={ui.openAddSheet}
          className="fixed right-4 z-[25] flex h-[54px] w-[54px] items-center justify-center rounded-full text-[24px]"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow)' }}
        >
          +
        </button>
      )}

      <TabBar tab={tab} onChange={setTab} />
      <AddQuestionSheet />
      <Toast />
    </div>
  )
}
