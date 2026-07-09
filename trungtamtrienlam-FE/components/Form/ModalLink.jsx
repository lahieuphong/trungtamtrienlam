import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button, Input } from '../Form';
import { Save, X } from 'lucide-react';

const ModalLink = ({ isOpen, onClose, handleSave, selectionRange }) => {
    const [link, setLink] = useState('');
    const handleSaveClick = () => {
        if (!link.trim()) return

        // 🔁 Khôi phục lại vùng chọn
        const sel = window.getSelection()
        sel.removeAllRanges()
        if (selectionRange) sel.addRange(selectionRange)

        // ✅ Giờ mới chạy
        handleSave("createLink", link)
        onClose()
        setLink('')
    }
    return (
        <Modal
            onClose={onClose}
            isOpen={isOpen}
            title={'Nhập URL'}
            footer={
                <div className="flex justify-end gap-3">
                    <Button type={"button"} variant="outline" onClick={onClose}>
                        <X size={16} className="mr-2" />
                        Đóng
                    </Button>
                    <Button type={"button"}
                        leftIcon={<Save className="w-5 h-5" />}
                        onClick={handleSaveClick}
                    >
                        Lưu
                    </Button>
                </div>
            }
        >
            <div className='p-2'>
                <Input placeholder={"Nhập đường dẫn"} value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
        </Modal>
    );
};

export default ModalLink;