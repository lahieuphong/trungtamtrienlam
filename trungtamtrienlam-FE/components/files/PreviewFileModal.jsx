import React, { useContext, useEffect } from 'react';
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "../Form";
import PreviewFileAudio from "./PreviewFileAudio";
import { FileHelpers } from '@/helpers/fileHelpers';
import PreviewFileImage from "./PreviewFileImage";
import PreviewFileVideo from "./PreviewFileVideo";
import PreviewFileDocument from "./PreviewFileDocument";
import LoadingContext from '@/contexts/LoadingContext';
import { useToast } from '../../contexts/ToastContext';
import ProgressContext from '@/contexts/ProgressContext';
import PreviewFile3D from "./PreviewFile3D";
import * as fileApi from '../../lib/api/filesApi';
import { OnlyOfficeConstants } from '@/constants/configConstants';

const PreviewFileModal = ({ isModal, file = {}, onClose, isPrivate = true }) => {
    const loadingContext = useContext(LoadingContext);
    const progressContext = useContext(ProgressContext);
    const toast = useToast();

    const _file = file || {};

    const [sizeModal, setSizeModal] = React.useState(FileHelpers.isFileDocument(_file.path || _file.name) ? 'full' : 'lg');
    const [isScrollContent, setIsScrollContent] = React.useState(FileHelpers.isFileDocument(_file.name) ? false : true);

    const renderPreviewFile = () => {
        const _file = file || {};

        _file.path = _file.path || _file.file || _file.link;

        if (FileHelpers.isFileAudio(_file.extension)) {
            return <PreviewFileAudio isModal={isModal} onDownload={onDownload} file={_file} onClose={onClose} />;
        } else if (FileHelpers.isFileImage(_file.extension)) {
            return <PreviewFileImage isModal={isModal} onDownload={onDownload} file={_file} onClose={onClose} isPrivate={isPrivate} />;
        } else if (FileHelpers.isFileVideo(_file.extension)) {
            return <PreviewFileVideo isModal={isModal} onDownload={onDownload} file={_file} onClose={onClose} />;
        } else if (FileHelpers.isFileDocument(_file.extension)) {
            return <PreviewFileDocument isModal={isModal} onDownload={onDownload} file={_file} onClose={onClose} />;
        } else if (FileHelpers.isFile3D(_file.extension)) {
            return <PreviewFile3D isModal={isModal} onDownload={onDownload} file={_file} onClose={onClose} />;
        }

        return null;
    }

    const onDownload = (file) => () => {
        progressContext.addProgress({ ...file, isPrivate: true });

        // progressContext.addProgress({ path: 'Aylex - Last Summer (freetouse.com).mp3', isPrivate: true });

        // loadingContext.show();

        // fileApi.downloadFileLargeWithProgress({ pathFile: file.path, isPrivate: false }).then(res => {
        //     loadingContext.hide();

        //     console.log(res);

        //     const blob = res;

        //     const url = URL.createObjectURL(blob);

        //     const link = document.createElement('a');

        //     link.href = url;
        //     link.download = file.path.split('/').pop(); // Tên file (nếu muốn dùng tên từ đường dẫn)

        //     // Kích hoạt sự kiện tải về
        //     link.click();

        //     // Giải phóng bộ nhớ
        //     URL.revokeObjectURL(url);

        //     toast.success("Tải xuống thành công");
        // }).catch(err => {
        //     console.log(err);

        //     loadingContext.hide();

        //     toast.error(err.message || "Tải xuống không thành công");
        // });
    }

    return (
        <Modal classNameFooter='border-none py-0' isOpen={true} isHeader={false} isScrollContent={isScrollContent} position={'center'} size={sizeModal} showCloseButton={false}>
            {renderPreviewFile()}
        </Modal>

        // footer={
        //     <div className="flex justify-end gap-3">
        //         <Button variant="outline" onClick={onClose}>
        //             <X size={16} className="mr-2" />
        //             Đóng
        //         </Button>
        //     </div>
        // }
    );
}

export default PreviewFileModal;