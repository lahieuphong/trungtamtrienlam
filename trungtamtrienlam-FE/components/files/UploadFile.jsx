import React, { useRef, useState } from 'react';
import { MoreHorizontal, Trash2, RotateCcw, Pencil, Scissors, Check, X } from "lucide-react";
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

import SelectFileItem from './SelectFileItem';
import ShareFolderModal from '../shareFolders/ShareFolderModal';
import { ImageAdvanced } from '../Form';
import Assets from '@/assets';
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken';

const uploadeFileTypeShowFiles = {
    list: 0,
    box: 1
}

const UploadFile = ({ files, onDeleteFile, onSelectFile, onChangeFile, onClickFile, onDropFile, onDragOverFile, onDragLeaveFile, onChooseFile, inputFileId = 'file', isChooseFromStorage = false, typeShowFile = uploadeFileTypeShowFiles.list, className = '', classNameBox = '', onShowMenu, onEdit, onEditChange, onEditBack, onEditSave }) => {
    const cropperRef = useRef(null);

    const [isOpenStorage, setIsOpenStorage] = useState(false);

    const onOpenStorage = () => {
        setIsOpenStorage(true);
    }

    const onCloseStorage = () => {
        setIsOpenStorage(false);
    }

    const onConfirmStorage = (selectedFiles) => {
        if (onChooseFile) {
            onChooseFile(selectedFiles);
        }
    }

    const onHandleShowMenu = (item) => (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (onShowMenu) {
            onShowMenu(item);
        }
    }

    const onHandleEdit = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (onEdit) {
            onEdit(e);
        }
    }

    const onHandleSelectFile = e => {
        if ((files[0] || {}).isEdit) {
            return;
        }

        onSelectFile(files[0])(e);
    }

    const onHandleEditSave = e => {
        if (onEditSave) {
            onEditSave(e);
        }
    }

    const paths = (files[0] || {}).paths || [];

    return <div className={className}>
        {typeShowFile == uploadeFileTypeShowFiles.list && <div className="mb-2 grid grid-cols-1 gap-x-5 gap-y-2">
            {files.map((file, index) => {
                return (
                    <SelectFileItem key={`file-item-${index}`} file={file} index={index} onDeleteFile={onDeleteFile} onSelectFile={onSelectFile} />
                )
            })}
        </div>}
        <input id={inputFileId} type="file" multiple onChange={onChangeFile} className="hidden" style={{
            display: 'none'
        }} />
        <div className={`transition-all duration-300 ease-in-out cursor-pointer flex-1 flex items-center justify-center border border-dashed border-[#D9D9D9] rounded-md flex-col relative ${classNameBox} ${(typeShowFile == uploadeFileTypeShowFiles.list || (typeShowFile == uploadeFileTypeShowFiles.box && !(files[0] || {}).path)) ? 'p-1' : ''}`}>
            {typeShowFile == uploadeFileTypeShowFiles.list || (typeShowFile == uploadeFileTypeShowFiles.box && !(files[0] || {}).path) ? <>
                <div onClick={onClickFile} onDrop={onDropFile}
                    onDragOver={onDragOverFile}
                    onDragLeave={onDragLeaveFile} className='flex w-full flex-1 flex-col items-center justify-center p-10 pb-0'>
                    <p className="text-sm text-[#597EF7] flex items-center">
                        <img src='/images/icons/upload_file.svg' className="mr-2 w-3" />
                        Tải lên từ máy tính
                    </p>
                    <p className="text-sm text-[#8C8C8C] mt-2">Hoặc kéo và thả tập tin tại đây</p>
                </div>
                {isChooseFromStorage && <button type="button" onClick={onOpenStorage} className="bg-[#597EF7] text-white px-4 py-2 rounded-md text-sm flex items-center mt-3">
                    Kho lưu trữ
                </button>}</> : <div className='w-full h-full flex items-center justify-center' onClick={onHandleSelectFile}>
                <a onClick={onHandleShowMenu(files[0])} href="#" className={`w-6 rounded-full h-6 flex z-[50] items-center justify-center absolute top-1 right-1 border ${(files[0] || {}).isShowMenu ? 'border-[#2F54EB]' : 'border-[#D9D9D9]'} bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]`}>
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                </a>
                {(files[0] || {}).isShowMenu && <div className='bg-[#ffffff] w-[160px] min-h-[100px] z-[1] absolute right-8 top-1 shadow-[0px_0px_30px_0px_#0000001A] rounded-xl p-2'>
                    {/* <button type='button' className='w-full font-normal text-sm text-[#2F54EB] flex items-center p-1 bg-[#F0F5FF] rounded-md gap-1 hover:bg-[#F0F5FF] transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <Assets.Icons.zoom size={16} className="w-4 h-4 text-[#F5222D]" />
                        </div>
                        Lấy đủ
                    </button>
                    <button type='button' className='w-full font-normal text-sm text-[#595959] flex items-center p-1 gap-1 hover:bg-[#F0F5FF] rounded-md transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <Assets.Icons.topDown size={16} className="w-4 h-4 text-[#595959]" />
                        </div>
                        Lấy chiều dọc
                    </button>
                    <button type='button' className='w-full font-normal text-sm text-[#595959] flex items-center p-1 gap-1 hover:bg-[#F0F5FF] rounded-md transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <Assets.Icons.leftRight size={16} className="w-4 h-4 text-[#595959]" />
                        </div>
                        Lấy chiều ngang
                    </button> */}
                    <button onClick={onHandleEdit} type='button' className='w-full font-normal text-sm text-[#595959] flex items-center p-1 rounded-md gap-1 hover:bg-[#F0F5FF] transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <Pencil size={16} className="w-4 h-4 text-[#F5222D]" />
                        </div>
                        {(files[0] || {}).isEdit ? 'Hủy bỏ chỉnh sửa' : 'Chỉnh sửa hình'}
                    </button>
                    <button onClick={onClickFile} type='button' className='w-full font-normal text-sm text-[#595959] flex items-center p-1 gap-1 hover:bg-[#F0F5FF] rounded-md transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <RotateCcw size={16} className="w-4 h-4 text-[#595959]" />
                        </div>
                        Thay đổi hình
                    </button>
                    <button onClick={onDeleteFile(files[0])} type='button' className='w-full font-normal text-sm text-[#595959] flex items-center p-1 gap-1 hover:bg-[#F0F5FF] rounded-md transition-all duration-150 ease-in-out'>
                        <div className='w-6 flex items-center justify-center'>
                            <Trash2 size={16} className="w-4 h-4 text-[#F5222D]" />
                        </div>
                        Xóa
                    </button>
                </div>}
                {(files[0] || {}).isEdit ? <div className='w-full h-full relative' style={{
                    height: '100%', width: '100%'
                }}>
                    <Cropper
                        src={(paths[paths.length - 1] || {}).path || (files[0] || {}).path}
                        style={{ height: '100%', width: '100%' }}
                        // Các tùy chọn quan trọng:
                        aspectRatio={NaN} // không giới hạn tỉ lệ
                        guides={true}
                        cropBoxResizable={true}
                        cropBoxMovable={true}
                        dragMode="move"
                        background={false}
                        responsive={true}
                        viewMode={1}
                        ref={cropperRef}
                    />
                    <div className='absolute right-1 top-8 flex flex-col gap-1'>
                        <button type='button' className='w-6 rounded-full h-6 flex z-[50] items-center justify-center border border-[#D9D9D9] bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]' onClick={(e) => {
                            const cropper = cropperRef.current?.cropper;

                            if (cropper) {
                                const croppedCanvas = cropper.getCroppedCanvas();

                                if (onEditChange) {
                                    onEditChange(croppedCanvas)(e);
                                }
                            }
                        }}>
                            <Scissors size={16} className="w-4 h-4 text-[#F5222D]" />
                        </button>
                        {paths.length > 0 && <button type='button' className='w-6 rounded-full h-6 flex z-[50] items-center justify-center border border-[#D9D9D9] bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]' onClick={onEditBack}>
                            <RotateCcw size={16} className="w-4 h-4 text-[#595959]" />
                        </button>}
                        <button type='button' className='w-6 rounded-full h-6 flex z-[50] items-center justify-center border border-[#D9D9D9] bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]' onClick={onHandleEditSave}>
                            <Check size={16} className="w-4 h-4 text-[#595959]" />
                        </button>
                        <button type='button' className='w-6 rounded-full h-6 flex z-[50] items-center justify-center border border-[#D9D9D9] bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]' onClick={onHandleEdit}>
                            <X size={16} className="w-4 h-4 text-[#595959]" />
                        </button>
                    </div>
                </div> : <div className='w-full h-full flex justify-center items-center'>
                    {((paths[paths.length - 1] || {}).isGlobal || (files[0] || {}).isGlobal) ? <img src={(paths[paths.length - 1] || {}).path || (files[0] || {}).path} className='h-full rounded-md object-contain' /> : <RenderFileToken isPrivate={true} pathFile={(paths[paths.length - 1] || {}).path || (files[0] || {}).path} Component={({ src }) => {
                        return <img src={src} className='h-full rounded-md object-contain' />
                    }} />}
                    {/* {paths.length > 0 && <button type='button' className='w-6 rounded-full h-6 flex z-[50] items-center justify-center border border-[#D9D9D9] bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)]' onClick={onEditBack}>
                        <RotateCcw size={16} className="w-4 h-4 text-[#595959]" />
                    </button>} */}
                </div>}
            </div>}
        </div>
        <ShareFolderModal isOpen={isOpenStorage} onClose={onCloseStorage} onConfirm={onConfirmStorage} />
    </div>
}

export default UploadFile;

export {
    uploadeFileTypeShowFiles
}