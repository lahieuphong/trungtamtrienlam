'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'

export function Table({
    columns = [],
    data = [],
    onSortChange,
    defaultSortColumn,
    defaultSortDirection = 'asc',
    currentPage = 1,
    totalItems = 1,
    onPageChange,
    emptyMessage,
    emptyText = 'Không có dữ liệu',
    loading = false,
    showRowNumbers = false,
    rowNumberTitle = 'STT',
    startRowNumber = 1,
    startRowNumberFrom,
    itemsPerPage = 10,
    classNameColumn = '',
}) {
    const [sortColumn, setSortColumn] = useState(defaultSortColumn || '')
    const [sortDirection, setSortDirection] = useState(defaultSortDirection)

    const handleSort = (column) => {
        if (!column.sortable) return
        const nextDirection = sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc'
        setSortColumn(column.key)
        setSortDirection(nextDirection)
        onSortChange?.(column.key, nextDirection)
    }

    const sortedData = useMemo(() => {
        if (!data.length || !sortColumn) return data

        return [...data].sort((a, b) => {
            const aValue = a[sortColumn]
            const bValue = b[sortColumn]

            if (aValue == null) return sortDirection === 'asc' ? -1 : 1
            if (bValue == null) return sortDirection === 'asc' ? 1 : -1
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue)
            }
            if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                if (aValue === bValue) return 0
                return sortDirection === 'asc'
                    ? aValue ? 1 : -1
                    : aValue ? -1 : 1
            }

            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        })
    }, [data, sortColumn, sortDirection])

    const displayColumns = useMemo(() => {
        if (!showRowNumbers) return columns

        return [
            {
                key: '__rowNumber',
                title: rowNumberTitle,
                sortable: false,
                render: (_, __, rowIndex) => {
                    const offset = (currentPage - 1) * itemsPerPage
                    return (startRowNumberFrom ?? startRowNumber) + offset + rowIndex
                },
            },
            ...columns,
        ]
    }, [columns, currentPage, itemsPerPage, rowNumberTitle, showRowNumbers, startRowNumber, startRowNumberFrom])

    const renderSortIcon = (column) => {
        if (sortColumn !== column.key) return <ChevronDown className="w-4 h-4 ml-1 opacity-30" />
        return sortDirection === 'asc'
            ? <ChevronDown className="w-4 h-4 ml-1" />
            : <ChevronUp className="w-4 h-4 ml-1" />
    }

    if (loading) {
        return (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        )
    }

    if (!loading && (!data || data.length === 0)) {
        return (
            <div className="bg-gray-50 rounded-md p-8 text-center">
                <p className="text-gray-500">{emptyMessage || emptyText}</p>
            </div>
        )
    }

    return (
        <div>
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            {displayColumns.map((column) => {
                                const headerClassName = column.headerClassName ?? column.className ?? ''
                                const headerContentClassName = column.headerContentClassName || ''

                                return (
                                    <th
                                        key={column.key}
                                        className={`py-3 px-4 text-left text-sm font-medium text-gray-500 ${headerClassName} ${classNameColumn} ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                        onClick={() => column.sortable && handleSort(column)}
                                    >
                                        <div className={`flex items-center ${headerContentClassName}`}>
                                            {column.title}
                                            {column.sortable && renderSortIcon(column)}
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className={`border-b hover:bg-gray-50 text-sm ${row?.isDisabled ? 'bg-gray-100' : ''}`}>
                                {displayColumns.map((column) => {
                                    const cellClassName = column.cellClassName ?? column.className ?? ''

                                    return (
                                        <td key={`${rowIndex}-${column.key}`} className={`py-3 px-4 ${cellClassName}`}>
                                            {column.render
                                                ? column.render(row[column.key], row, rowIndex)
                                                : row[column.key]}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {onPageChange && Math.ceil(totalItems / itemsPerPage) > 1 && (
                <TablePagination
                    total={totalItems}
                    page={currentPage}
                    pageSize={itemsPerPage}
                    onChange={onPageChange}
                />
            )}
        </div>
    )
}

export function TablePagination({ total = 0, page = 1, pageSize = 20, onChange }) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null

    const maxVisiblePages = 8
    let pages = []
    if (totalPages <= maxVisiblePages) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    } else if (page <= 4) {
        pages = Array.from({ length: maxVisiblePages }, (_, i) => i + 1)
    } else if (page > totalPages - 4) {
        pages = Array.from({ length: maxVisiblePages }, (_, i) => totalPages - maxVisiblePages + i + 1)
    } else {
        pages = Array.from({ length: maxVisiblePages }, (_, i) => page - 3 + i)
    }

    return (
        <div className="flex justify-end mt-6">
            <nav className="flex items-center space-x-1" aria-label="Pagination">
                <button
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    aria-label="Trang trước"
                    type="button"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                {pages.map((pageNum) => (
                    <button
                        key={pageNum}
                        className={`w-10 h-10 flex items-center justify-center rounded-md ${page === pageNum ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => onChange(pageNum)}
                        aria-label={`Trang ${pageNum}`}
                        aria-current={page === pageNum ? 'page' : undefined}
                        type="button"
                    >
                        {pageNum}
                    </button>
                ))}
                <button
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => onChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    aria-label="Trang sau"
                    type="button"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </nav>
        </div>
    )
}