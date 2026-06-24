'use client'

export function Table({ columns = [], data = [], loading = false, emptyText = 'Không có dữ liệu' }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {columns.map((col, i) => (
                            <th key={i} className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap" style={{ width: col.width }}>
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={row.id || rowIdx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-4 py-3 text-gray-700">
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}

export function TablePagination({ total = 0, page = 1, pageSize = 20, onChange }) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
                Tổng: <strong>{total}</strong> bản ghi
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                    ‹
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                    ›
                </button>
            </div>
        </div>
    )
}
