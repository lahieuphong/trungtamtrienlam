import React, { useContext, useState } from 'react';

import { Modal } from "@/components/ui/modal";
import { Button, FormGroup, Input } from '../Form';
import { Check, Trash2, X } from 'lucide-react';
import LoadingContext from '@/contexts/LoadingContext';
import { useToast } from '../Toast';
import { FormMessageConstants, MessageConstants } from '../../constants/messageConstants';
import * as folderApi from '../../lib/api/foldersApi';
import * as fileApi from '../../lib/api/filesApi';

const DeleteConfirmFileModal = ({ files, onClose, callBack }) => {
    const [isShowTypePassword, setIsShowTypePassword] = useState(false);
    const loadingContext = useContext(LoadingContext);
    const toast = useToast();
    const [forms, setForms] = useState({
        password: ''
    });
    const [errors, setErrors] = useState({});

    const onChangeValue = e => {
        const { name, value } = e.target;

        setForms(prev => ({
            ...prev,
            [name]: value
        }));

        setErrors(prev => ({
            ...prev,
            [name]: !value ? FormMessageConstants.requirePassword : ''
        }));
    }

    const onConfirm = () => {
        const newErrors = {};
        const fileChecks = [...files.filter(p => p.isCheck || p.isCheckAll).map(p => p.id)];

        setErrors(newErrors);

        if (fileChecks.length <= 0) {
            toast.warning(MessageConstants.noSelectFile);

            return;
        }

        if (!forms.password) {
            newErrors.password = FormMessageConstants.requirePassword;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);

            return;
        }

        const body = {
            ids: fileChecks,
            password: forms.password
        }

        loadingContext.show();

        fileApi.deleteFile(body).then(res => {
            loadingContext.hide();

            if (res.data.status != 200) {
                toast.error(res.message || MessageConstants.deleteFileFailure);

                return;
            }

            callBack();

            onClose();

            toast.success(MessageConstants.deleteFileSuccessfully);
        }).catch(err => {
            loadingContext.hide();

            toast.error(MessageConstants.deleteFileFailure);
        });
    }

    return (
        <Modal isOpen={true} size="md" title='Xóa tệp tin' showCloseButton={false}>
            <div className=''>
                {files.length > 0 && <>
                    <p className='font-normal text-sm'>Xóa tập tin:</p>
                    <div className='flex flex-col flex-wrap pl-2'>
                        {files.map((file, index) => (
                            <div key={`folder-item-trash-${file.id}-${index}`} className=''>
                                <span className='text-sm font-semibold'>- {file.name}</span>
                            </div>
                        ))}
                    </div>
                </>}
                <div className='mt-2'>
                    <FormGroup label="Mật khẩu" required htmlFor="password">
                        <Input
                            id="password"
                            name="password"
                            value={forms.password}
                            onChange={onChangeValue}
                            disabled={false}
                            placeholder="Nhập mật khẩu để xác nhận xóa"
                            error={!!errors.password}
                            errorMessage={errors.password}
                        />
                    </FormGroup>
                </div>
            </div>
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    <X size={16} className="mr-2" />
                    Đóng
                </Button>
                <Button variant="danger" className='bg-[#F5222D]' onClick={onConfirm}>
                    <Trash2 size={16} className="mr-2" />
                    Xóa
                </Button>
            </div>
        </Modal>
    );
}

export default DeleteConfirmFileModal;