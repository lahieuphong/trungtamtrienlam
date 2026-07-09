import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Download, Fullscreen, Minimize, X } from "lucide-react";
import moment from 'moment';

import Model3D from '../controls/model3Ds/Model3D';
import Model3D2 from '../controls/model3Ds/Model3D2';
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken';
import { Button } from '../Form';
import threeState from '../../public/js/3d_variable.js'; // 🔗 dùng state chung

const PreviewFile3D = ({ onClose, file, onDownload }) => {
    const [isShowInfo, setIsShowInfo] = React.useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const onSetModelLoaded = useCallback(() => {
        setModelLoaded(true);
    }, []);

    // const renderFile = useMemo(() => (
    //     // file.isGlobal ? <Model3D url={file.path} /> : <RenderFileToken pathFile={file.path} isPrivate={true} Component={({ src }) => {

    //     //     return <Model3D url={src} />
    //     // }} />
    //     file.isGlobal ? <Model3D2 url={file.path} id='box3D' canvasId='canvas3DId' loadingId='loading3DId' loadingProcessBarId='loading3DProcessBarId' loadingValueId='loading3DValueId' /> : <RenderFileToken pathFile={file.path} isPrivate={true} Component={({ src }) => {

    //         return <Model3D2 url={src} id='box3D' canvasId='canvas3DId' loadingId='loading3DId' loadingProcessBarId='loading3DProcessBarId' loadingValueId='loading3DValueId' />;
    //     }} />
    // ), [file.path]);

    const handleSize3D = () => {
        if (threeState.camera && threeState.webGLRenderer && threeState.scene && threeState.controls && threeState.model) {
            let timeOut = setTimeout(() => {
                const box3D = document.getElementById("box3D");

                if (box3D) {
                    const width = box3D.clientWidth;
                    const height = box3D.clientHeight;

                    threeState.webGLRenderer.setSize(width, height);

                    threeState.controls.update(); // Cập nhật các điều khiển

                    threeState.webGLRenderer.render(threeState.scene, threeState.camera);

                    threeState.camera.aspect = width / height;
                    threeState.camera.updateProjectionMatrix();
                    threeState.webGLRenderer.setSize(width, height);
                }

                clearTimeout(timeOut);

                timeOut = null;
            }, 500);
        }
    }

    const onInfo = () => {
        setIsShowInfo(!isShowInfo);
    }

    const onFullScreen = () => {
        setIsFullScreen(true);

        handleSize3D();
    }

    const onMinimize = () => {
        setIsFullScreen(false);

        handleSize3D();
    }

    const topics = (file.topics || '').split('|');

    return (
        <div className=''>
            <div className='min-h-[50vh] flex max-h-[50vh] w-full overflow-hidden select-none relative'

            >
                <div className={`flex-1 flex w-full ${isFullScreen ? 'fixed w-full h-full top-0 left-0 z-[8999] bg-white' : ''}`}>
                    {file.isGlobal ? <Model3D2 url={file.path} id='box3D' canvasId='canvas3DId' loadingId='loading3DId' loadingProcessBarId='loading3DProcessBarId' loadingValueId='loading3DValueId' /> : <RenderFileToken pathFile={file.path} isPrivate={true} Component={({ src }) => {

                        return <Model3D2 url={src} id='box3D' canvasId='canvas3DId' loadingId='loading3DId' loadingProcessBarId='loading3DProcessBarId' loadingValueId='loading3DValueId' />;
                    }} />}
                    {isFullScreen && <div className='absolute right-2 top-2 z-[8999] flex items-center justify-center border border-[#D9D9D9] rounded-full w-8 h-8 bg-white'>
                        <button onClick={onMinimize} className='block flex items-center justify-center w-full h-full'>
                            <Minimize size={16} className='' />
                        </button>
                    </div>}
                </div>
            </div>
            <div className='mt-4'>
                <p className='text-sm'>{file.name}</p>
                <div className='gap-2 flex mt-2 justify-between'>
                    <div className='flex-1 flex gap-2 relative'>
                        {(file.id && !file.isGlobal) &&
                            <>
                                <button onClick={onInfo} className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'>
                                    <Info size={16} className="" />
                                </button>
                                {/* <button type='button' onClick={onDownload(file)} className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'>
                                    <Download size={16} className="" />
                                </button> */}
                                <div className='flex items-center gap-2 border border-[#D9D9D9] w-8 h-8 flex items-center justify-center rounded-full px-2'>
                                    <button onClick={onFullScreen} className='w-8 h-8 rounded-full flex items-center justify-center'>
                                        <Fullscreen size={16} className='' />
                                    </button>
                                </div>
                            </>
                        }
                    </div>
                    <Button variant="destructive" onClick={onClose}>
                        <X size={16} className="mr-2" />
                        Đóng
                    </Button>
                </div>
            </div>
            {isShowInfo &&
                <div className='left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] fixed bg-white border border-[#D9D9D9] rounded-md w-[400px] shadow-[0_4px_30px_rgba(0,0,0,0.10)]'>
                    <button type='button' className='absolute top-[-8px] right-[-8px] shadow-[0_4px_30px_rgba(0,0,0,0.10)] z-[9998] w-6 h-6 rounded-full bg-white flex items-center justify-center' onClick={onInfo}>
                        <X size={16} className="" />
                    </button>
                    <div className='py-2 px-6 max-h-[90vh] overflow-y-auto'>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Mã số tệp tin</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.code}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Mã cơ quan lưu trữ</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.organizationCode}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Số lưu trữ</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.storageNumber}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Ký hiệu thông tin</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.informationSympol}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Tên sự kiện</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.eventName}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Lĩnh vực</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.fieldName}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Chủ đề</p>
                            <div className='flex flex-wrap gap-x-1 gap-y-1'>
                                {topics.map((topic, index) => {
                                    return <div key={`topic-item-${index}`} className='py-1 px-2 border border-[#D9D9D9] bg-[#F5F5F5] rounded-full'>
                                        <p className='text-sm text-[#1F1F1F] font-semibold'>{topic}</p>
                                    </div>
                                })}
                            </div>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Tiêu đề tập tin</p>
                            <p className='w-[calc(400px-200px)] text-sm text-[#1F1F1F] font-semibold break-words whitespace-normal'>{file.name}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Tác giả</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.author}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Địa điểm</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.location}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Thời gian</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{moment(file.createdDate).format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Ngôn ngữ</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.language}</p>
                        </div>
                        {/* <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                            <div className='flex items-center py-2'>
                                <p className='text-sm text-[#434343] min-w-[140px]'>Thời lượng</p>
                                <p className='text-sm text-[#1F1F1F] font-semibold'>{file.duration}</p>
                            </div> */}
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Chế độ sử dụng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.usageMode}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Chất lượng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.quality}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Tình trạng vật lý</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.physicalStatus}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Từ khóa</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.hashTag}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Ghi chú</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.note}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Người đăng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.fullName}</p>
                        </div>
                    </div>
                </div>}
        </div>
    )
}

export default PreviewFile3D;