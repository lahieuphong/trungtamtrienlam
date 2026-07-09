import React, { useContext, useState } from 'react';

import { Modal } from "@/components/ui/modal";
import { Button } from '../Form';
import { RotateCcw, X } from 'lucide-react';
import LoadingContext from '@/contexts/LoadingContext';
import { useToast } from '../Toast';
import { MessageConstants } from '../../constants/messageConstants';
import * as fileApi from '../../lib/api/filesApi';

const RestoreConfirmFileModal = ({ files, onClose, callBack }) => {
    const loadingContext = useContext(LoadingContext);
    const toast = useToast();

    const onConfirm = () => {
        const fileChecks = [...files.map(p => p.id)];

        if (fileChecks.length <= 0) {
            toast.warning(MessageConstants.noSelectFile);

            return;
        }

        const body = {
            ids: fileChecks
        }

        loadingContext.show();

        fileApi.restoreFile(body).then(res => {
            loadingContext.hide();

            if (res.data.status != 200) {
                toast.error(res.message || MessageConstants.renameFolderFailure);

                return;
            }

            callBack();

            onClose();

            toast.success(MessageConstants.restoreFileSuccessfully);
        }).catch(err => {
            loadingContext.hide();

            toast.error(MessageConstants.renameFolderFailure);
        });
    }

    return (
        <Modal isOpen={true} size="md" title='Khôi phục tệp tin' showCloseButton={false}>
            <div className=''>
                {files.length > 0 && <>
                    <p className='font-normal text-sm'>Khôi phục tập tin:</p>
                    <div className='flex flex-col flex-wrap pl-2'>
                        {files.map((file, index) => (
                            <div key={`folder-item-trash-${file.id}-${index}`} className=''>
                                <span className='text-sm font-semibold'>- {file.name}</span>
                            </div>
                        ))}
                    </div>
                </>}
            </div>
            <div className='flex flex-col gap-3 mt-3'>
                <p className='text-sm'>Bạn có chắc chắn muốn khôi phục thư mục/tập tin này không?</p>
                <p className='text-sm'>Tập tin trên sẽ được khôi phục về vị trí và thư mục ban đầu trước khi bị xóa</p>
            </div>
            <div className="flex justify-end mt-3 gap-3">
                <Button variant="outline" onClick={onClose}>
                    <X size={16} className="mr-2" />
                    Đóng
                </Button>
                <Button variant="danger" className='bg-[#597EF7]' onClick={onConfirm}>
                    <RotateCcw size={16} className="mr-2" />
                    Khôi phục
                </Button>
            </div>
        </Modal>
    );
}

export default RestoreConfirmFileModal;