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
                className={`relative border rounded-lg overflow-hidden cursor-pointer transition-colors
                    ${isDashedBorder ? 'border-dashed' : 'border-solid'}
                    ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${disabled ? 'cursor-not-allowed opacity-60' : ''}
                    ${errorMessage ? 'border-red-400' : ''}`}
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
                    <div className="flex flex-col items-center justify-center p-6 text-gray-400">
                        <Upload className="w-8 h-8 mb-2" />
                        <p className="text-xs text-center">
                            {description || 'Kéo thả hoặc nhấn để tải lên'}
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
