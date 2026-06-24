'use client'

import { useState } from 'react'
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'

export function Table({
    columns = [],
    data = [],
    loading = false,
    emptyText = 'Không có dữ liệu',
    showRowNumbers = false,
    startRowNumber = 1,
    onSortChange,
    defaultSortColumn,
    defaultSortDirection = 'asc',
}) {
    const [sortColumn, setSortColumn] = useState(defaultSortColumn || null)
    const [sortDirection, setSortDirection] = useState(defaultSortDirection)

    const handleSort = (col) => {
        if (!col.sortable) return
        const newDir = sortColumn === col.key && sortDirection === 'asc' ? 'desc' : 'asc'
        setSortColumn(col.key)
        setSortDirection(newDir)
        onSortChange?.(col.key, newDir)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {showRowNumbers && (
                            <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap w-14">STT</th>
                        )}
                        {columns.map((col, i) => (
                            <th
                                key={i}
                                className={`px-4 py-3 font-medium text-gray-600 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                                style={{ width: col.width }}
                                onClick={() => col.sortable && handleSort(col)}
                            >
                                {col.sortable ? (
                                    <div className="flex items-center gap-1">
                                        {col.title}
                                        {sortColumn === col.key ? (
                                            sortDirection === 'asc'
                                                ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                : <ChevronDown className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                        ) : (
                                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        )}
                                    </div>
                                ) : (
                                    col.title
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (showRowNumbers ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={row.id || rowIdx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                {showRowNumbers && (
                                    <td className="px-4 py-3 text-gray-500">{startRowNumber + rowIdx}</td>
                                )}
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
