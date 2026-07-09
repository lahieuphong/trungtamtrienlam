import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { X, List, Search, Check, LayoutGrid, ChevronLeft } from "lucide-react";
import { Button } from "../Form";
import { Modal } from "@/components/ui/modal";
import FolderItem from '../folders/FolderItem';
import * as fileApi from '../../lib/api/filesApi';
import * as folderApi from '../../lib/api/foldersApi';
import * as metaDataApi from '../../lib/api/metaDatasApi';
import { useToast } from '../Toast';
import LoadingContext from '@/contexts/LoadingContext';
import { FormMessageConstants, MessageConstants } from '@/constants/messageConstants';
import { FileConstants, FolderConstants } from '@/constants/dataConstants';
import FileItem from './FileItem';

let timeOutSearch = null;

const AddFileShareFolderModal = ({ type, folderId, title, onClose, callBack }) => {
    const clickTimerRef = useRef(null);
    const [search, setSearch] = React.useState('');
    const [view, setView] = React.useState(0); // 0 for grid, 1 for list
    const [folders, setFolders] = React.useState([]);
    const [files, setFiles] = React.useState([]);
    const [parentId, setParentId] = React.useState(null);
    const loadingContext = useContext(LoadingContext);
    const toast = useToast();
    const [selectFolders, setSelectFolders] = React.useState([]);

    const initData = (search, parentId) => {
        loadingContext.show();

        folderApi.fetchFolder({
            page: 1,
            pageSize: 1000000,
            typeShare: FolderConstants.typeShares.self,
            parentId,
            keyword: search,
            sort: null,
            type
        }).then(res => {

            if (res.status == 200) {
                let newFolders = res.data?.data?.folders || [];
                let newFiles = res.data?.data?.files || [];

                setFolders(newFolders);
                setFiles(newFiles);
            } else {
                toast.error(res.message || MessageConstants.getErrorData);
            }

            loadingContext.hide();
        }).catch(err => {
            loadingContext.hide();

            toast.error(MessageConstants.getErrorData);
        });
    }

    useEffect(() => {
        initData('', null);
    }, []);

    const onChangeSearch = (e) => {
        if (timeOutSearch) {
            clearTimeout(timeOutSearch);

            timeOutSearch = null;
        }

        const value = e.target.value;

        setSearch(value);

        timeOutSearch = setTimeout(() => {
            initData(value, selectFolders[selectFolders.length - 1]?.id || null);
        }, 500);
    };

    const onCheckFolder = item => () => {
        // Lần click đầu → chờ xem có phải double click không
        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
        }, 200); // khoảng thời gian phân biệt click/ double click
    }

    const onSelectFolder = item => () => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);

            clickTimerRef.current = null;

            setParentId(item.id);

            const newSelectFolders = [...selectFolders];

            newSelectFolders.push(item);

            setSelectFolders(newSelectFolders);

            initData(search, item.id);

            return;
        }

        // Lần click đầu → chờ xem có phải double click không
        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
        }, 200); // khoảng thời gian phân biệt click/ double click
    }

    const onBackFolder = useCallback(() => {
        const newSelectFolders = [...selectFolders];

        newSelectFolders.pop();

        setSelectFolders(newSelectFolders);

        initData(search, newSelectFolders[newSelectFolders.length - 1]?.id || null);
    });

    const onCheckFile = item => e => {

        e.stopPropagation();

        const newFiles = [...files];

        const file = newFiles.find(f => f.id === item.id);

        if (file) {
            file.isCheck = !file.isCheck;
        }

        setFiles(newFiles);
    }

    const onSelectFile = item => () => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);

            clickTimerRef.current = null;

            return;
        }

        // Lần click đầu → chờ xem có phải double click không
        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
        }, 200); // khoảng thời gian phân biệt click/ double click
    }

    const onSubmit = () => {
        const fileChecks = [...files].filter(f => f.isCheck);

        if (fileChecks.length <= 0) {
            toast.warning(FormMessageConstants.requireSelectFile);

            return;
        }

        const body = {
            ids: fileChecks.map(p => p.id),
            folderId
        }

        loadingContext.show();

        fileApi.addFileToShareFolder(body).then(res => {
            loadingContext.hide();


            if (res.status = 200) {
                toast.success(MessageConstants.addFileToShareFolderSuccessfully);

                if (callBack) {
                    callBack();
                }

                onClose();
            } else {
                toast.error(res.message || MessageConstants.addFileToShareFolderFailure);
            }
        }).catch(err => {
            loadingContext.hide();

            toast.error(MessageConstants.addFileToShareFolderFailure);
        });
    }


    return (
        <>
            <Modal styleChildren={{
                minHeight: "calc(60vh - 64px)",
                maxHeight: "calc(60vh - 64px)"
            }} isScrollContent={true} isOpen={true} size="lg" title={title} showCloseButton={false} footer={<div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose}>
                        <X size={16} className="mr-2" />
                        Đóng
                    </Button>
                    <Button variant={files.filter(p => p.isCheck).length > 0 ? 'danger' : 'disabled'} onClick={onSubmit}>
                        <Check size={16} className="mr-2" />
                        Thêm
                    </Button>
                </div>
            </div>} header={
                <React.Fragment>
                    <div className="flex items-center px-4 mt-4">
                        <div className="flex flex-1 items-center">
                            <div className="flex flex-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <button
                                        className={`p-2 rounded ${view === 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                                        onClick={() => setView(0)}
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <button
                                        className={`p-2 rounded ${view === 1 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                                        onClick={() => setView(1)}
                                    >
                                        <List size={18} />
                                    </button>
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm hình ảnh, thư mục"
                                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[250px]"
                                            value={search}
                                            onChange={onChangeSearch}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center min-h-[25px]">
                        {selectFolders.length > 0 && <div onClick={onBackFolder} className="cursor-pointer flex items-center">
                            <ChevronLeft size={16} />
                            <p className="ml-2 text-sm text-[#434343]">{(selectFolders[selectFolders.length - 1] || {}).name}</p>
                        </div>}
                    </div>
                </React.Fragment>
            }>
                <div className="">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {folders.map((item, index) => (
                            <FolderItem view={FolderConstants.viewTypes.addFileShareFolder}viewType ={FolderConstants.viewTypes.addFileShareFolder} key={`folder-item-${item.id}`} index={index} item={item} onCheckFolder={onCheckFolder} onSelectFolder={onSelectFolder} onShowMenu={() => { }} onRename={() => { }} onPin={() => { }} onMove={() => { }} onEdit={() => { }} />
                        ))}
                        {files.map((item, index) => (
                            <FileItem view={FileConstants.viewTypes.addFileShareFolder} viewType ={FolderConstants.viewTypes.addFileShareFolder} key={`file-item-${item.id}`} index={index} item={item} onCheckFile={onCheckFile} onSelectFile={onSelectFile} onShowMenu={() => { }} onPin={() => { }} onMove={() => { }} onEdit={() => { }} />
                        ))}
                    </div>
                    {folders.length <= 0 && <div className="flex flex-col mt-10 items-center justify-center">
                        <img src='/images/icons/book.svg' className="w-22 h-22" />
                        <p className="text-sm text-[#8C8C8C] mt-2">Trống</p>
                    </div>}
                </div>
            </Modal>
        </>
    )
}

export default AddFileShareFolderModal;