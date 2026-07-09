import { PinOff } from 'lucide-react'

export default function PinDropdownMenu ({
  isOpen,
  onClose,
  messages = [],
  onCopy,
  onOpenBoard,
  onUnpin
}) {
  const targetIds = (messages || [])
    .map(m => {
      if (m?.isPin || m?.IsPin) return m.id ?? m.ID
      if (m?.NotePin || m?.notePin) return m.eventID ?? m.EventID
      return null
    })
    .filter(id => id !== null && id !== undefined && id !== '')
    .filter((id, i, arr) => arr.indexOf(id) === i)

  if (!isOpen) return null

  return (
    <>
      <div className='fixed inset-0 z-[9998]' onClick={onClose} />

      <div className='absolute right-0 top-full z-[9999] mt-1 w-40 overflow-hidden rounded-md border border-red-100 bg-red-50/95 shadow-sm animate-in slide-in-from-top-2 duration-150'>
        <button
          onClick={() => {
            onUnpin?.(targetIds)
            onClose()
          }}
          className='flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={targetIds.length === 0}
          title={targetIds.length === 0 ? 'Không có mục để bỏ ghim' : undefined}
        >
          <PinOff className='h-3.5 w-3.5 shrink-0' />
          <span className='truncate'>Bỏ ghim tất cả ({targetIds.length})</span>
        </button>
      </div>
    </>
  )
}