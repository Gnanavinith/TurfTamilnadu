import Button from '../../../components/Button'

export default function UndoButton({ onUndo, busy, disabled }) {
  return (
    <Button
      variant="ghost"
      onClick={onUndo}
      loading={busy}
      disabled={disabled}
      className="!text-slate-500 !text-sm hover:!bg-slate-100 dark:hover:!bg-slate-800"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 1 2.6 6.4M3 17v-5h5" />
      </svg>
      Undo last ball
    </Button>
  )
}