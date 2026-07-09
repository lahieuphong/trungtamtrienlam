"use client";

import React, { useCallback, useMemo } from "react";
import { MoreHorizontal, Play, Trash2, RotateCcw, Pencil } from "lucide-react";

import { ImageAdvanced } from "../Form";
import FileUtils from "../../utils/fileUtils";
import { FileHelpers } from "../../helpers/fileHelpers";
import RenderFileToken from "../controls/renderFileTokens/RenderFileToken";
import { FileConstants, FolderConstants } from "@/constants/dataConstants";
import Assets from "@/assets";
import moment from "moment";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const FileItem = ({ type, totalFolder, index, view, typeShare, onCopy, onShare, viewType, onDelete, item, onSelectFile, onEdit, onCheckFile, onRestore, onShowMenu, onMove, onPin, onDownload, onShareLink }) => {
    const newIndex = (totalFolder || 0) + index;

    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: item.id });
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: item.id });

    const ref = (element) => {
        setDragRef(element);
        setDropRef(element);
    };

    const style = {
        transform: CSS.Translate.toString(transform), // chuyển transform về dạng css string
        zIndex: isDragging ? 999 : undefined,
        position: isDragging ? 'relative' : undefined,
    };

    const renderView = () => {
        if (view == FolderConstants.views.grid) {
            return renderViewGrid();
        } else if (view == FolderConstants.views.list) {
            return renderViewList();
        }

        return null;
    }

    const renderImage = () => {
        if (FileHelpers.isFileAudio(item.extension)) {
            return FileUtils.renderImageFile(item.extension, {
                className: 'w-10 h-10'
            });
        } else if (FileHelpers.isFileImage(item.extension)) {
            if (FileHelpers.isFileImageSpecial(item.extension)) {
                return FileUtils.renderImageFile(item.extension, {
                    className: 'w-10 h-10'
                });
            }

            if (view == FolderConstants.views.grid) {
                return <RenderFileToken pathFile={item.file} isPrivate={true} Component={({ src }) => {
                    return <img className="rounded-t-lg h-[200px] w-[100%] object-cover" src={src} />
                }} />;
            }

            return FileUtils.renderImageFile(item.extension, {
                className: 'w-10 h-10'
            });
        } else if (FileHelpers.isFileVideo(item.extension)) {
            if (view == FolderConstants.views.grid) {
                return <>
                    <RenderFileToken pathFile={item.file} isPrivate={true} Component={({ src }) => {
                        return <img className="rounded-t-lg h-[200px] w-[100%] object-cover" src={src} />
                    }} />
                    <div className="z-[1] absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/10 rounded-t-lg">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/10">
                            <Play size={24} className="text-white fill-white" />
                        </div>
                    </div>
                </>;
            }

            return FileUtils.renderImageFile(item.extension, {
                className: 'w-10 h-10'
            });
        } else if (FileHelpers.isFileDocument(item.extension)) {
            if (view == FolderConstants.views.grid) {
                return FileUtils.renderIconFile(item.extension);
            }

            return FileUtils.renderImageFile(item.extension, {
                className: 'w-10 h-10'
            });
        } else if (FileHelpers.isFile3D(item.extension)) {
            // if (view == FolderConstants.views.grid) {
            //     return <RenderFileToken pathFile={item.file} isPrivate={true} Component={({ src }) => {
            //         return <img className="rounded-t-lg h-[150px] w-[100%] object-cover" src={src} />
            //     }} />;
            // }

            return FileUtils.renderIconFile(item.extension);
        } else {
            if (view == FolderConstants.views.grid) {
                return FileUtils.renderIconFile(item.extension);
            }

            return FileUtils.renderImageFile(item.extension, {
                className: 'w-10 h-10'
            });
        }

        return null;
    }

    const renderCount = item => {
        const results = [];

        if (item.size > 0) {
            results.push(
                <span className="text-[#7A7A7A] text-xs font-normal"><span className={`${item.size > 0 ? 'font-semibold' : 'font-normal'}`}>{FileHelpers.renderDisplayKB(item.size || 0)}</span></span>
            );
        }

        if (item.createdDate) {
            results.push(
                <span className="text-[#7A7A7A] text-xs font-normal"><span className={`${item.createdDate ? 'font-semibold' : 'font-normal'}`}>{moment(item.createdDate).format('DD/MM/YYYY HH:mm')}</span></span>
            );
        }

        return results.map((item, index) => {
            return <React.Fragment key={`count-${item.id}-${index}`}>
                {item}
                {index < results.length - 1 && <Assets.Icons.dot size={16} />}
            </React.Fragment>;
        });
    }

    const onHandleShareLink = item => e => {
        if (onShareLink) {
            onShareLink(item)(e);
        }
    }

    const renderViewGrid = () => {
        return <div ref={ref} {...attributes}
            {...listeners} className={`bg-white cursor-pointer border ${(item.isCheck || isOver && isDragging) ? 'border-[#597EF7]' : 'border-[#D9D9D9]'} rounded-lg flex flex-col max-h-[250px] min-h-[250px] hover:bg-[#E5F3FF] ${(isOver || isDragging) ? '' : 'transition-all duration-200 ease-in-out'}`} title={item.name} style={style}>
            <div onClick={onSelectFile(item)} className="flex items-center justify-center flex-1 relative select-none">
                <div onClick={onCheckFile(item)} className="flex items-center justify-center absolute z-[2] top-2 left-2">
                    <div className={`border border-2 ${item.isCheck ? 'border-[#597EF7]' : 'border-[#BFBFBF]'} w-5 h-5 rounded-md`}>
                        <div className={`w-[100%] h-[100%] flex items-center justify-center ${item.isCheck ? 'bg-[#597EF7]' : ''}`}>
                            <Assets.Icons.check size={16} className={item.isCheck ? 'text-[#ffffff]' : 'text-transparent'} />
                        </div>
                    </div>
                </div>
                {renderImage()}
                {(viewType != FileConstants.viewTypes.addFileShareFolder && viewType != FileConstants.viewTypes.trash && typeShare != FolderConstants.typeShares.shared && typeShare != FolderConstants.typeShares.storageServer) &&
                    <button type="button" onClick={onPin(item)} className={`w-6 rounded-full border border-[rgba(31,31,31,0.4)] h-6 flex items-center justify-center absolute top-2 right-2 ${item.pinDated ? 'bg-[rgba(0,0,0,0.65)]' : 'bg-white'}`}>
                        {item.pinDated ? <Assets.Icons.pin2 size={16} className="text-[#FFFFFF]" /> : <Assets.Icons.pin2 size={16} className="text-[rgba(31,31,31,0.4)]" />}
                    </button>}
            </div>
            <div className="h-[1px] w-[100%] bg-[#D9D9D9]"></div>
            <div className="p-2 min-h-[70px] max-h-[85px] relative">
                <p className="text-sm line-clamp-1 font-semibold" title={item.name}>{item.name}</p>
                <div className="flex gap-1 items-center">
                    {renderCount(item)}
                </div>
                {(viewType != FileConstants.viewTypes.addFileShareFolder) && <>
                    <a onClick={onShowMenu(item)} href="#" className={`w-6 rounded-full h-6 flex items-center justify-center absolute top-2 right-2 border bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.05)] ${item.isShowMenu ? 'border-[#2F54EB]' : 'border-[#D9D9D9]'}`}>
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                    </a>
                    {item.isShowMenu && <div className="p-2 right-2 top-[70%] absolute min-w-[120px] rounded-lg bg-white shadow-[0_4px_30px_rgba(0,0,0,0.10)] space-y-2 z-[1]">
                        {viewType == FileConstants.viewTypes.trash ? <>
                            <a onClick={onRestore(item)} className="px-2 flex items-center">
                                <RotateCcw size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">Khôi phục</p>
                            </a>
                            <a onClick={onDelete(item)} className="px-2 flex items-center">
                                <Trash2 size={16} className="w-4 h-4 text-[#F5222D]" />
                                <p className="text-sm text-[#F5222D] ml-2">Xóa</p>
                            </a>
                        </> : <>
                            {(typeShare != FolderConstants.typeShares.shared && typeShare != FolderConstants.typeShares.storageServer) && <button type="button" onClick={onPin(item)} className="px-2 flex items-center">
                                <Assets.Icons.pin size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">{item.pinDated ? 'Bỏ ghim' : 'Ghim'}</p>
                            </button>}
                            {viewType == FileConstants.viewTypes.self && <>
                                <a onClick={onEdit(item)} className="px-2 flex items-center">
                                    <Pencil size={16} className="w-4 h-4" />
                                    <p className="text-sm text-[#434343] ml-2">Chỉnh sửa</p>
                                </a>
                                <a onClick={onHandleShare(item)} className="px-2 flex items-center">
                                    <Assets.Icons.move size={16} className="w-4 h-4 text-[#434343]" />
                                    <p className="text-sm text-[#434343] ml-2">Chia sẻ</p>
                                </a>
                                <a onClick={onMove(item)} className="px-2 flex items-center">
                                    <Assets.Icons.back size={16} className="w-4 h-4 text-[#434343]" />
                                    <p className="text-sm text-[#434343] ml-2">Di chuyển</p>
                                </a>
                            </>
                            }
                            {(typeShare != FolderConstants.typeShares.share && typeShare != FolderConstants.typeShares.storageServer) && <a onClick={onHandleCopy(item)} className="px-2 flex items-center">
                                <Assets.Icons.copy size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">Nhân bản</p>
                            </a>}
                            {(typeShare != FolderConstants.typeShares.share && type != FolderConstants.types.model3D) && <a onClick={onHandleDownload(item)} className="px-2 flex items-center">
                                <Assets.Icons.download size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">Tải xuống</p>
                            </a>}
                            {((!item.isShare && typeShare == FolderConstants.typeShares.self && item.refType != FileConstants.refTypes.monumentPrivate) || typeShare == FolderConstants.typeShares.storageServer) && <button type="button" onClick={onHandleShareLink(item)} className="px-2 flex items-center">
                                <Assets.Icons.move size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">Chia sẻ ra ngoài</p>
                            </button>}
                            {(typeShare != FolderConstants.typeShares.shared && typeShare != FolderConstants.typeShares.storageServer) && <a onClick={onDelete(item)} className="px-2 flex items-center">
                                <Trash2 size={16} className="w-4 h-4 text-[#434343]" />
                                <p className="text-sm text-[#434343] ml-2">Xóa</p>
                            </a>}
                        </>}
                    </div>}
                </>}
            </div>
        </div>;
    }

    const renderViewList = () => {
        return <div ref={ref} {...attributes}
            {...listeners} className={`flex items-center cursor-pointer min-h-[60px] max-h-[60px] ${(item.isCheck || isOver || isDragging) ? 'bg-[#F0F5FF]' : (newIndex % 2 == 0 ? 'bg-white' : '#F0F0F0')} ${(isOver || isDragging) ? '' : 'transition-all duration-200 ease-in-out'}`} style={style}>
            <div onClick={onSelectFile(item)} className="flex w-full h-full items-center p-2 px-4 relative relative select-none">
                <div onClick={onCheckFile(item)} className="flex items-center justify-center w-5 h-5">
                    <div className={`border border-2 ${item.isCheck ? 'border-[#597EF7]' : 'border-[#BFBFBF]'} w-5 h-5 rounded-md`}>
                        <div className={`w-[100%] h-[100%] flex items-center justify-center ${item.isCheck ? 'bg-[#597EF7]' : ''}`}>
                            <Assets.Icons.check size={16} className={item.isCheck ? 'text-[#ffffff]' : 'text-transparent'} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-1">
                    <div className="w-9 h-9 relative flex items-center justify-center ml-6">
                        {renderImage()}
                    </div>
                    <div className="ml-3">
                        <p className="text-xs text-[#1F1F1F] font-semibold line-clamp-2" title={item.name}>{item.name}</p>
                        <div className="flex gap-1 items-center">
                            {renderCount(item)}
                        </div>
                    </div>
                </div>
                {typeShare == FolderConstants.typeShares.self && <div className="min-w-[150px] max-w-[150px] flex items-center gap-2">
                    <RenderFileToken pathFile={item.lastModifiedUserAvatar} isPrivate={true} Component={({ src }) => {
                        return <ImageAdvanced src={src} isFill={true} classNameDiv='rounded-full w-[24px] h-[24px] relative' className="rounded-full w-[100%] h-[100%]" />
                    }} />
                    <span className="text-xs text-[#1F1F1F] font-semibold line-clamp-1" title={item.lastModifiedUserFullName}>{item.lastModifiedUserFullName}</span>
                </div>}
                <div className="min-w-[180px] max-w-[180px] flex items-center justify-end gap-2 relative">
                    {viewType == FileConstants.viewTypes.trash ? <>
                        <a onClick={onRestore(item)} className="flex items-center">
                            <RotateCcw size={16} className="w-4 h-4 text-[#434343]" />
                        </a>
                        <a onClick={onDelete(item)} className="flex items-center">
                            <Trash2 size={16} className="w-4 h-4 text-[#F5222D]" />
                        </a>
                    </> : <>
                        {(typeShare != FolderConstants.typeShares.shared && typeShare != FolderConstants.typeShares.storageServer) && <button type="button" onClick={onPin(item)} className={`w-5 h-5 rounded-full border border-[rgba(31,31,31,0.4)] flex items-center justify-center ${item.pinDated ? 'bg-[rgba(0,0,0,0.65)]' : 'bg-white'}`}>
                            {item.pinDated ? <Assets.Icons.pin3 size={8} className="text-[#FFFFFF]" /> : <Assets.Icons.pin3 size={16} className="text-[rgba(31,31,31,0.4)]" />}
                        </button>}
                        {viewType == FileConstants.viewTypes.self && <>
                            <a onClick={onEdit(item)} className="flex items-center">
                                <Pencil size={16} className="w-4 h-4 text-[#2F54EB]" />
                            </a>
                            <a onClick={onHandleShare(item)} className="flex items-center">
                                <Assets.Icons.move size={16} className="w-4 h-4 text-[#2F54EB]" />
                            </a>
                            <a onClick={onMove(item)} className="flex items-center">
                                <Assets.Icons.back size={16} className="w-4 h-4 text-[#2F54EB]" />
                            </a>
                        </>
                        }
                        {(typeShare != FolderConstants.typeShares.share && typeShare != FolderConstants.typeShares.storageServer) && <a onClick={onHandleCopy(item)} className="flex items-center">
                            <Assets.Icons.copy size={16} className="w-4 h-4 text-[#2F54EB]" />
                        </a>}
                        {((!item.isShare && typeShare == FolderConstants.typeShares.self && item.refType != FileConstants.refTypes.monumentPrivate) || typeShare == FolderConstants.typeShares.storageServer) && <button type="button" onClick={onHandleShareLink(item)} className=" flex items-center">
                            <Assets.Icons.move size={16} className="w-4 h-4 text-[#434343]" />
                        </button>}
                        {(typeShare != FolderConstants.typeShares.share && type != FolderConstants.types.model3D) && <a onClick={onHandleDownload(item)} className="flex items-center">
                            <Assets.Icons.download size={16} className="w-4 h-4 text-[#434343]" />
                        </a>}
                    </>}
                </div>
            </div>
        </div>
    }

    const onHandleShare = (item) => (e) => {
        if (onShare) {
            onShare(item)(e);
        }
    }

    const onHandleCopy = item => e => {
        if (onCopy) {
            onCopy(item)(e);
        }
    }

    const onHandleDownload = item => e => {
        if (onDownload) {
            onDownload(item)(e);
        }
    }

    return renderView();
}

export default FileItem;