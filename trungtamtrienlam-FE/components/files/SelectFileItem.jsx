import React from 'react';
import FileUtils from '../../utils/fileUtils';
import { Trash2, Info } from 'lucide-react';

const SelectFileItem = ({ file, index, onDeleteFile, onSelectFile, onInfoFile, isCandelete = true, viewedInfo = null, className = '' }) => {  
    const onHandleSelectFile = file => (e) => {
        if (onSelectFile) {
            onSelectFile(file)(e);
        }
    }

    const onHandleDeleteFile = file => (e) => {
        if (onDeleteFile) {
            onDeleteFile(file)(e);
        }
    }

    const onHandleInfoFile = file => (e) => {
        e.stopPropagation();
        if (onInfoFile) {
            onInfoFile(file)(e);
        }
    }

    return (
        <div className={`cursor-pointer inline-flex justify-between border border-[#D9D9D9] rounded-md p-2 w-full gap-2 hover:bg-[#E6E6E6] transition-colors ${className}`}>
            <div onClick={onHandleSelectFile(file)} className="flex items-center w-[calc(100%-56px)] gap-3">
                <div>
                    {FileUtils.renderIconFile(file?.extension || file?.name)}
                </div>
                <div className="w-[calc(100%-32px)]">
                    <p className="w-full text-sm text-[#1F1F1F] break-words whitespace-normal">{file?.name || file?.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-[#8C8C8C] break-words whitespace-normal">{file?.size}KB</p>
                        {viewedInfo && (
                            <span className="text-xs text-yellow-600 font-medium">
                                {viewedInfo.viewedAt.toLocaleTimeString('vi-VN', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })} {viewedInfo.viewedAt.toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit', 
                                    year: 'numeric'
                                })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {onInfoFile && (
                    <button 
                        type='button' 
                        onClick={onHandleInfoFile(file)} 
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
                        title="Thông tin file"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                )}
                {isCandelete && (
                    <button 
                        type='button' 
                        onClick={onHandleDeleteFile(file)} 
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-colors"
                        title="Xóa file"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default SelectFileItem;