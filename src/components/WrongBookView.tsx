import { useApp } from '../hooks/AppDataContext'
import { ChipBtn, EmptyState, TypeTag } from './ui'

export default function WrongBookView({ active, onReview }: { active: boolean; onReview: (qid: string) => void }) {
  const app = useApp()
  const flagged = app.questions.filter((q) => app.progress[q.id]?.flagged)

  return (
    <div className={`flex flex-col gap-[14px] ${active ? '' : 'hidden'}`}>
      {!flagged.length ? (
        <EmptyState emoji="🎉" text="错题本是空的，继续保持！" />
      ) : (
        <>
          <div className="font-display text-[19px] font-bold">错题本 ({flagged.length})</div>
          <div className="flex flex-col gap-[10px]">
            {flagged.map((q) => {
              const firstEn = q.sentences[0]?.en || ''
              const snippet = firstEn.length > 60 ? firstEn.slice(0, 60) + '…' : firstEn
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-[10px] rounded-[14px] p-[12px_14px]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <TypeTag type={q.type} />
                    <p className="overflow-wrap-anywhere text-[14px] font-semibold">{snippet}</p>
                  </div>
                  <div className="flex flex-shrink-0 gap-[6px]">
                    <ChipBtn onClick={() => onReview(q.id)}>复习</ChipBtn>
                    <ChipBtn onClick={() => app.upsertProgress(q.id, { flagged: false })}>移出</ChipBtn>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
