'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { buildMediaUrl } from '@/lib/mediaUrl'

function getPreviewUrl(value) {
    if (!value) return null
    if (value.isLocalFile && value.File) return value.File
    if (value.file instanceof File) return URL.createObjectURL(value.file)
    return buildMediaUrl(value.File)
}

export function FileUploader({
    id, name, title, accept = 'image/*', isMulti = false,
    values, onChange, errorMessage = '', isDashedBorder = false,
    disabled = false, description = '',
}) {
    const inputRef = useRef(null)
    const [dragOver, setDragOver] = useState(false)

    const previewUrl = getPreviewUrl(values)

    const handleFiles = (files) => {
        if (!files || files.length === 0) return
        const file = files[0]
        const objectUrl = URL.createObjectURL(file)
        onChange({ file, File: objectUrl, isLocalFile: true, fileName: file.name, fileSize: file.size })
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        handleFiles(e.dataTransfer.files)
    }

    const handleInputChange = (e) => {
        handleFiles(e.target.files)
    }

    const handleRemove = (e) => {
        e.stopPropagation()
        onChange(null)
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div className="mb-4">
            {title && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {title}
                </label>
            )}
            <div
                onClick={() => !disabled && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border overflow-hidden cursor-pointer
                    ${previewUrl ? 'rounded-lg transition-colors' : 'rounded-md border-dashed transition-all duration-300 ease-in-out'}
                    ${previewUrl ? (isDashedBorder ? 'border-dashed' : 'border-solid') : 'border-dashed'}
                    ${dragOver ? 'border-blue-400 bg-blue-50' : errorMessage ? '!border-red-400 hover:!border-red-400' : previewUrl ? 'border-gray-300 hover:border-gray-400' : 'border-[#D9D9D9] hover:border-blue-400'}
                    ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                style={{ minHeight: 120 }}
            >
                {previewUrl ? (
                    <div className="relative w-full h-full">
                        <img
                            src={previewUrl}
                            alt={title}
                            className="w-full object-contain"
                            style={{ maxHeight: 200 }}
                        />
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-600 hover:text-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex min-h-[120px] flex-col items-center justify-center p-10 text-center">
                        <p className="flex items-center text-sm text-[#597EF7]">
                            <Upload className="mr-2 h-4 w-4" />
                            Tải lên từ máy tính
                        </p>
                        <p className="mt-2 text-sm text-[#8C8C8C]">
                            {description || 'Hoặc kéo và thả tập tin tại đây'}
                        </p>
                    </div>
                )}
            </div>
            <input
                ref={inputRef}
                id={id}
                name={name}
                type="file"
                accept={accept}
                multiple={isMulti}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />
            {errorMessage && (
                <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    )
}
