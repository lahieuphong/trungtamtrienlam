import React, { useMemo } from 'react';
import { Info, Download, X } from "lucide-react";
import { Button } from '../Form';
import moment from 'moment';
import { ApiConstants } from '@/constants/apiConstants';
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken';
import Assets from '@/assets';

const PreviewFileAudio = ({ onClose, file, onDownload }) => {
    const [isShowInfo, setIsShowInfo] = React.useState(false);

    // const renderFile = useMemo(() => (
    //     file.isGlobal ? <audio controls className='w-full'>
    //         <source src={file.path} type="audio/mpeg" />
    //         TrÃ¬nh duyá»‡t nÃ y khÃ´ng há»— trá»£ audio.
    //     </audio> : <RenderFileToken noReRender={false} pathFile={file.path} isPrivate={true} Component={({ src }) => {
    //         return <audio controls className='w-full'>
    //             <source src={src} type="audio/mpeg" />
    //             TrÃ¬nh duyá»‡t nÃ y khÃ´ng há»— trá»£ audio.
    //         </audio>
    //     }} />
    // ), [file.path]);

    const onInfo = () => {
        setIsShowInfo(!isShowInfo);
    }

    const topics = (file.topics || '').split('|');

    return (
        <div className="flex flex-col flex-1 relative">
            {file.isGlobal ? <audio controls className='w-full'>
                <source src={file.path} type="audio/mpeg" />
                TrÃ¬nh duyá»‡t nÃ y khÃ´ng há»— trá»£ audio.
            </audio> : <RenderFileToken noReRender={true} pathFile={file.path} isPrivate={true} Component={({ src }) => {
                return <audio controls className='w-full'>
                    <source src={src} type="audio/mpeg" />
                    TrÃ¬nh duyá»‡t nÃ y khÃ´ng há»— trá»£ audio.
                </audio>
            }} />}
            <div className='mt-4'>
                <p className='text-sm'>{file.name}</p>
                <div className='gap-2 flex mt-2 justify-between'>
                    <div className='flex-1 flex gap-2 relative'>
                        {(file.id && !file.isGlobal) && <>
                            <button onClick={onInfo} className={`border ${isShowInfo ? 'border-[#2F54EB]' : 'border-[#D9D9D9]'} rounded-full flex items-center justify-center w-8 h-8`}>
                                <Info size={16} className="" />
                            </button>
                            <button type='button' onClick={onDownload(file)} className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'>
                                <Download size={16} className="" />
                            </button>
                        </>
                        }
                    </div>
                    <Button variant="destructive" onClick={onClose}>
                        <X size={16} className="mr-2" />
                        ÄÃ³ng
                    </Button>
                </div>
            </div>
            {(isShowInfo && !file.isGlobal) &&
                <div className='left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] fixed bg-white border border-[#D9D9D9] rounded-md w-[400px] shadow-[0_4px_30px_rgba(0,0,0,0.10)]'>
                    <button type='button' className='absolute top-[-8px] right-[-8px] shadow-[0_4px_30px_rgba(0,0,0,0.10)] z-[9998] w-6 h-6 rounded-full bg-white flex items-center justify-center' onClick={onInfo}>
                        <X size={16} className="" />
                    </button>
                    <div className='flex-1 max-h-[90vh] px-6 py-2 flex flex-col overflow-y-auto'>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>MÃ£ sá»‘ tá»‡p tin</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.code}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>MÃ£ cÆ¡ quan lÆ°u trá»¯</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.organizationCode}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Sá»‘ lÆ°u trá»¯</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.storageNumber}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>KÃ½ hiá»‡u thÃ´ng tin</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.informationSympol}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>TÃªn sá»± kiá»‡n</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.eventName}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>LÄ©nh vá»±c</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.fieldName}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Chá»§ Ä‘á»</p>
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
                            <p className='text-sm text-[#434343] min-w-[140px]'>TiÃªu Ä‘á» táº­p tin</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.name}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>TÃ¡c giáº£</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.author}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Äá»‹a Ä‘iá»ƒm</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.location}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Thá»i gian</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{moment(file.createdDate).format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>NgÃ´n ngá»¯</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.language}</p>
                        </div>
                        {/* <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                <div className='flex items-center py-2'>
                    <p className='text-sm text-[#434343] min-w-[140px]'>Thá»i lÆ°á»£ng</p>
                    <p className='text-sm text-[#1F1F1F] font-semibold'>{file.duration}</p>
                </div> */}
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Cháº¿ Ä‘á»™ sá»­ dá»¥ng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.usageMode}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Cháº¥t lÆ°á»£ng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.quality}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>TÃ¬nh tráº¡ng váº­t lÃ½</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.physicalStatus}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Tá»« khÃ³a</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.hashTag}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>Ghi chÃº</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.note}</p>
                        </div>
                        <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                        <div className='flex items-center py-2'>
                            <p className='text-sm text-[#434343] min-w-[140px]'>NgÆ°á»i Ä‘Äƒng</p>
                            <p className='text-sm text-[#1F1F1F] font-semibold'>{file.fullName}</p>
                        </div>
                    </div>
                </div>}
        </div>
    )
}

export default PreviewFileAudio;