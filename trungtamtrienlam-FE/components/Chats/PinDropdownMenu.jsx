import { XCircle } from "lucide-react"

export default function PinDropdownMenu({
  isOpen,
  onClose,
  messages = [], // mảng messages
  onCopy,
  onOpenBoard,
  onUnpin
}) {
  // Lấy danh sách ID đúng theo rule
  const targetIds = (messages || [])
    .map(m => {
      if (m?.isPin || m?.IsPin) return m.id ?? m.ID
      if (m?.NotePin || m?.notePin) return m.eventID ?? m.EventID
      return null
    })
    .filter(id => id !== null && id !== undefined && id !== '')
    .filter((id, i, arr) => arr.indexOf(id) === i)

  return (
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={onClose} />

          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] animate-in slide-in-from-top-2 duration-200">
            <div className="py-2">
              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={() => {
                  onUnpin?.(targetIds) 
                  onClose()
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 disabled:opacity-50"
                disabled={targetIds.length === 0}
                title={targetIds.length === 0 ? "Không có mục để bỏ ghim" : undefined}
              >
                <XCircle className="w-4 h-4" />
                <span className="text-sm">
                  Bỏ ghim tất cả ({targetIds.length})
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
