"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import moment from "moment";

import { X, Check, Plus, Trash2 } from "lucide-react";
import { Button, FormGroup, Input, DatePicker, AdvancedSelect, TextArea, Checkbox, RadioButton } from "../Form";
import { FormMessageConstants, MessageConstants } from "@/constants/messageConstants";
import * as metaDataApi from '../../lib/api/metaDatasApi';
import * as fileApi from '../../lib/api/filesApi';
import LoadingContext from "../../contexts/LoadingContext";
import { useToast } from "../Toast";
import { Modal } from "@/components/ui/modal";
import { FileHelpers } from "../../helpers/fileHelpers";
import { FileConstants, FolderConstants } from "@/constants/dataConstants";
import FileUtils from '../../utils/fileUtils';
import PreviewFileModal from "./PreviewFileModal";
import SelectFileItem from './SelectFileItem';
import UploadFile from "./UploadFile";

const CreateOrEditFileModal = ({ callBack, id, type, title, onClose, folderID }) => {
    const [formData, setFormData] = useState({
        "name": "",
        "organizationCode": "",
        "storageNumber": "",
        "informationSympol": "",
        "eventName": "",
        "topics": [],
        "fieldID": "",
        "author": "",
        "location": "",
        "time": null,
        "language": "",
        "physicalStatus": "",
        "quality": "",
        "usageMode": "",
        "note": "",
        "hashTag": "",
        "folderID": folderID,
        "files": [],
        "color": "",
        "riskRecovery": 'false',
        "riskRecoveryStatus": FileConstants.riskRecoveryStatuses.notYet
    });
    const [errors, setErrors] = useState({});
    const loadingContext = useContext(LoadingContext);
    const toast = useToast();
    const [topic, setTopic] = useState("");
    const [topics, setTopics] = useState([]);
    const [draggingFile, setDraggingFile] = useState(false);
    const [files, setFiles] = useState([]);
    const [selectFile, setSelectFile] = useState(null);
    const [fields, setFields] = useState([]);
    const [fileDataDeleteIds, setFileDataDeleteIds] = useState([]);

    useEffect(() => {
        metaDataApi.getListField().then(res => {
            if (res.status == 200) {
                setFields((res.data?.data?.fields || []).map(p => {
                    return {
                        value: p.id,
                        label: p.name
                    }
                }));
            }
        }).catch(err => {

        });
    }, []);

    useEffect(() => {
        if (!id) {
            return;
        }

        loadingContext.show();

        fileApi.detailFile({ id }).then(res => {
            loadingContext.hide();

            if (res.status == 200) {
                const file = res.data?.data?.file || {};
                const fileDatas = res.data?.data?.fileDatas || [];

                setFormData({
                    "name": file.name,
                    "organizationCode": file.organizationCode,
                    "storageNumber": file.storageNumber,
                    "informationSympol": file.informationSympol,
                    "eventName": file.eventName,
                    "topics": [],
                    "fieldID": file.fieldID,
                    "author": file.author,
                    "location": file.location,
                    "time": moment(file.time).toDate(),
                    "language": file.language,
                    "physicalStatus": file.physicalStatus,
                    "quality": file.quality,
                    "usageMode": file.usageMode,
                    "note": file.note,
                    "hashTag": file.hashTag,
                    "folderID": file.folderID || folderID,
                    "files": [],
                    "color": file.color,
                    "isAcceptEditShare": file.isAcceptEditShare || false,
                    "riskRecovery": (file.riskRecovery || '').toString() || 'false',
                    "riskRecoveryStatus": file.riskRecoveryStatus || FileConstants.riskRecoveryStatuses.notYet
                });

                const newTopics = (file.topics || '').split('|').filter(p => p).map(p => {
                    return {
                        id: uuidv4(),
                        name: p
                    }
                });

                setTopics(newTopics);

                const newFiles = fileDatas.map(p => {
                    return {
                        size: p.size,
                        id: p.id,
                        name: p.fileName,
                        url: p.file,
                        file2: p.file2
                    }
                });

                setFiles(newFiles);
            } else {
                toast.error(res.message || MessageConstants.getErrorData);
            }
        }).catch(err => {
            loadingContext.hide();

            toast.error(err.message || MessageConstants.getErrorData);
        });
    }, []);

    const checkError = (row) => {
        const newErrors = {};

        if (!row.name) {
            newErrors.name = FormMessageConstants.requireName;
        }

        if (!row.organizationCode) {
            newErrors.organizationCode = FormMessageConstants.requireOrganizatioCode;
        }

        if (!row.storageNumber) {
            newErrors.storageNumber = FormMessageConstants.requireStorageNumber;
        }

        if (!row.informationSympol) {
            newErrors.informationSympol = FormMessageConstants.requireInformationSympol;
        }

        if (!row.eventName) {
            newErrors.eventName = FormMessageConstants.requireEventName;
        }

        if (!row.fieldID) {
            newErrors.fieldID = FormMessageConstants.requireField;
        }

        if (!row.author) {
            newErrors.author = FormMessageConstants.requireAuthor;
        }

        if (!row.location) {
            newErrors.location = FormMessageConstants.requireLocation;
        }

        if (!row.time) {
            newErrors.time = FormMessageConstants.requireTime;
        }

        if (!row.language && type == FolderConstants.types.audio) {
            newErrors.language = FormMessageConstants.requireLanguage;
        }

        if (!row.color && type == FolderConstants.types.image) {
            newErrors.color = FormMessageConstants.requireColor;
        }

        if (!row.physicalStatus) {
            newErrors.physicalStatus = FormMessageConstants.requirePhysicalStatus;
        }

        if (!row.quality && type != FolderConstants.types.image && type != FolderConstants.types.model3D && type != FolderConstants.types.other) {
            newErrors.quality = FormMessageConstants.requireQuality;
        }

        if (!row.usageMode) {
            newErrors.usageMode = FormMessageConstants.requireUsageMode;
        }

        if (row.riskRecovery == 'true' && !row.riskRecoveryStatus) {
            newErrors.riskRecoveryStatus = FormMessageConstants.requireRiskRecoveryStatus;
        }

        return newErrors;
    }

    const handleFile = files => {
        document.getElementById('file').value = '';

        const newFiles = [];

        let file = null;

        for (let i = 0; i < files.length; i++) {
            file = files[i];

            switch (type) {
                case FolderConstants.types.audio:
                    if (!FileHelpers.checkValidFileAudio(file.name)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidFileAudio}`);

                        return;
                    } else if (!FileHelpers.checkValidFileSizeAudio(file.size)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidSizeFileAudio}`);

                        return;
                    }
                    break;
                case FolderConstants.types.image:
                    if (!FileHelpers.checkValidFileImage(file.name)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidFileImage}`);

                        return;
                    } else if (!FileHelpers.checkValidFileSizeImage(file.size)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidSizeFileImage}`);

                        return;
                    }
                    break;
                case FolderConstants.types.video:
                    if (!FileHelpers.checkValidFileVideo(file.name)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidFileVideo}`);

                        return;
                    } else if (!FileHelpers.checkValidFileSizeVideo(file.size)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidSizeFileVideo}`);

                        return;
                    }
                    break;
                case FolderConstants.types.document:
                    if (!FileHelpers.checkValidFileDocument(file.name)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidFileDocument}`);

                        return;
                    } else if (!FileHelpers.checkValidFileSizeDocument(file.size)) {
                        toast.warning(`${file.name}: ${MessageConstants.invalidSizeFileDocument}`);

                        return;
                    }
                    break;
            }

            newFiles.push({ file, extension: FileHelpers.getExtension(file.name), isGlobal: true, size: FileHelpers.convertByteToKB(file.size), id: uuidv4(), name: file.name, path: URL.createObjectURL(file) });
        }

        setFiles((prev) => [...prev, ...newFiles]);
    }

    const onChangeValue = useCallback(
        (e) => {
            const { name, value, type, checked } = e.target;

            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            }));

            if (errors[name]) {
                setErrors((prev) => ({ ...prev, [name]: "" }));
            }
        },
        [errors],
    );

    const onAddTopic = (e) => {
        e.preventDefault();

        if (!topic) {
            setErrors((prev) => ({
                ...prev,
                topic: FormMessageConstants.requireTopic
            }));
        } else {
            setErrors((prev) => ({
                ...prev,
                topic: ''
            }));

            const newTopics = [...topics];

            newTopics.push({
                id: uuidv4(),
                name: topic
            });

            setTopics(newTopics);
        }

        setTopic('');
    }

    const onDeleteTopic = (topic) => (e) => {
        e.preventDefault();

        setTopics((prev) => prev.filter(t => t.id != topic.id));
    }

    const onChangeTopic = (e) => {
        const value = e.target.value;

        setTopic(value);
    }

    const onChangeFile = (e) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const fileArray = Array.from(files);

            handleFile(fileArray);
        }
    }

    const onDropFile = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setDraggingFile(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(Array.from(e.dataTransfer.files));
        }
    };

    const onDragOverFile = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setDraggingFile(true);

        e.target.style.borderColor = '#597EF7';
    };

    const onDragLeaveFile = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setDraggingFile(false);

        e.target.style.borderColor = '#D9D9D9';
    };

    const onClickFile = e => {
        document.getElementById('file').click();
    }

    const onSelectFile = file => e => {
        setSelectFile(file);
    }

    const onClosePreviewFile = () => {
        setSelectFile(null);
    }

    const onDeleteFile = (file) => (e) => {
        const newFiles = [...files].filter(f => f.id != file.id);

        setFiles(newFiles);

        if (!file.file) {
            setFileDataDeleteIds(file.id);
        }
    }

    const onSubmit = () => {
        let newErrors = {};

        setErrors(newErrors);

        newErrors = checkError(formData);

        console.log(newErrors);

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        // Auto-commit pending topic text (user typed but has not pressed Enter yet)
        const inputTopic = document.getElementById('inputTopic');
        const pendingTopic = inputTopic?.innerText?.trim() || '';
        let normalizedTopics = [...topics];

        if (pendingTopic) {
            const existed = normalizedTopics.some(
                t => (t?.name || '').trim().toLowerCase() === pendingTopic.toLowerCase()
            );

            if (!existed) {
                normalizedTopics.push({
                    id: uuidv4(),
                    name: pendingTopic
                });
            }

            if (inputTopic) {
                inputTopic.innerText = '';
            }
        }

        if (normalizedTopics.length !== topics.length) {
            setTopics(normalizedTopics);
        }

        if (normalizedTopics.length <= 0) {
            toast.warning(FormMessageConstants.requireTopic);

            return;
        }

        if (files.length <= 0) {
            toast.warning(FormMessageConstants.requireFile);

            return;
        }

        const body = {
            ...formData,
            type,
            Type: type,
            time: moment(formData.time).format('YYYY-MM-DD HH:mm'),
            topics: normalizedTopics.filter(p => p).map(t => t.name),
            files: files.map(p => p.file),
            fileDataDeleteIds,
        };

        if (id) {
            body.id = id;
        }

        const _function = id ? fileApi.updateFile : fileApi.createFile;

        loadingContext.show();

        const messageSuccessfully = id ? MessageConstants.updateFileSuccessfully : MessageConstants.createFileSuccessfully;
        const messageFailure = id ? MessageConstants.updateFileFailure : MessageConstants.createFileFailure;

        _function(body).then(res => {
            loadingContext.hide();

            if (res.status == 200) {
                toast.success(messageSuccessfully);

                onClose();

                callBack();
            } else {
                toast.error(res.message || messageFailure);
            }
        }).catch(err => {
            loadingContext.hide();

            toast.error(err.message || messageFailure);
        });
    }

    const onKeydownInputTopic = e => {
        if (e.key === 'Enter') {
            const inputTopic = document.getElementById('inputTopic');

            if (inputTopic) {
                const value = inputTopic.innerText.trim();

                if (value) {
                    const newTopics = [...topics];

                    newTopics.push({
                        name: value
                    });

                    setTopics(newTopics);

                    inputTopic.innerText = '';
                }
            }
        } else if (e.key == 'Backspace') {
            const inputTopic = document.getElementById('inputTopic');

            if (inputTopic) {
                const value = inputTopic.innerText.trim();

                if (!value) {
                    const newTopics = [...topics];

                    newTopics.pop();

                    setTopics(newTopics);
                }
            }
        }
    }

    const onClickInputTopic = e => {
        const inputTopic = document.getElementById('inputTopic');

        if (inputTopic) {
            inputTopic.focus();
        }
    }

    return (
        <Modal isOpen={true} size="lg" title={title} showCloseButton={false} footer={
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    <X size={16} className="mr-2" />
                    Đóng
                </Button>
                <Button variant="danger" onClick={onSubmit}>
                    <Check size={16} className="mr-2" />
                    Hoàn tất
                </Button>
            </div>
        }>
            <div className="">
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label="Mã cơ quan lưu trữ" required htmlFor="organizationCode">
                            <Input
                                id="organizationCode"
                                name="organizationCode"
                                value={formData.organizationCode}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.organizationCode}
                                errorMessage={errors.organizationCode}
                            />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup label="Số lưu trữ" required htmlFor="storageNumber">
                            <Input
                                id="storageNumber"
                                name="storageNumber"
                                value={formData.storageNumber}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.storageNumber}
                                errorMessage={errors.storageNumber}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label="Ký hiệu thông tin" required htmlFor="informationSympol">
                            <Input
                                id="informationSympol"
                                name="informationSympol"
                                value={formData.informationSympol}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.informationSympol}
                                errorMessage={errors.informationSympol}
                            />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup label="Tên sự kiện" required htmlFor="eventName">
                            <Input
                                id="eventName"
                                name="eventName"
                                value={formData.eventName}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.eventName}
                                errorMessage={errors.eventName}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label="Lĩnh vực" required htmlFor="fieldID">
                            {/* <Input
                                id="fieldID"
                                name="fieldID"
                                value={formData.fieldID}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.fieldID}
                                errorMessage={errors.fieldID}
                            /> */}
                            <AdvancedSelect id="fieldID" name="fieldID" value={formData.fieldID} error={!!errors.fieldID}
                                errorMessage={errors.fieldID} options={fields} onChange={onChangeValue} />
                        </FormGroup>
                    </div>
                    {/* <div className="flex-1 flex items-center gap-2">
                        <FormGroup label="Chủ đề" htmlFor="topic" className="flex-1" style={{
                            marginBottom: '0px'
                        }}>
                            <Input
                                id="topic"
                                name="topic"
                                value={topic}
                                onChange={onChangeTopic}
                                disabled={false}
                                placeholder=""
                                error={!!errors.topic}
                                errorMessage={errors.topic}
                            />
                        </FormGroup>
                        <a href="#" className="mt-5 inline-flex items-center text-[#597EF7] text-sm font-semibold " onClick={onAddTopic}><Plus size={16} className="mr-2" /> Thêm chủ đề</a>
                    </div> */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chủ đề <span className="text-red-500">*</span>
                        </label>
                        <div onClick={onClickInputTopic} className="flex flex-wrap border border-1 border-gray-300 p-1 rounded-md cursor-text gap-1 py-2">
                            {topics.filter(p => p).map((item, index) => {
                                return <div key={`topic-item-${index}`} className="p-1 px-2 bg-[#F0F5FF] rounded-xl">
                                    <p className="text-sm text-[#1F1F1F]">{item.name}</p>
                                </div>
                            })}
                            <div id="inputTopic" onKeyDown={onKeydownInputTopic} className="h-[100%] px-1 flex items-center outline-none" contentEditable={true}>

                            </div>
                        </div>
                    </div>
                </div>
                {/* <div className="flex flex-wrap">
                    {topics.map((topic, index) => {
                        return <div key={`topic-item-${index}`} className="relative border border-[#D9D9D9] rounded-full bg-[#F5F5F5] px-3 py-1 mr-2 mb-2">
                            <span className="text-sm text-[#1F1F1F]">{topic.name}</span>
                            <a onClick={onDeleteTopic(topic)} href="#" className="text-[red] absolute right-[0px] top-[-6px]">
                                <X size={16} />
                            </a>
                        </div>
                    })}
                </div> */}
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label="Tiêu đề tập tin" required htmlFor="name">
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.name}
                                errorMessage={errors.name}
                            />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup label="Tác giả" required htmlFor="author">
                            <Input
                                id="author"
                                name="author"
                                value={formData.author}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.author}
                                errorMessage={errors.author}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label={`Địa điểm${type == FolderConstants.types.image ? ' chụp' : (type == FolderConstants.types.video ? ' quay' : '')}`} required htmlFor="location">
                            <Input
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.location}
                                errorMessage={errors.location}
                            />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup label={`Thời gian${type == FolderConstants.types.image ? ' chụp' : (type == FolderConstants.types.video ? ' quay' : '')}`} required htmlFor="time">
                            <DatePicker
                                id='time'
                                name='time'
                                value={formData.time}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.time}
                                errorMessage={errors.time}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    {(type == FolderConstants.types.image) ? <div className="flex-1">
                        <FormGroup label="Màu sắc" required htmlFor="color">
                            <Input
                                id="color"
                                name="color"
                                value={formData.color}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.color}
                                errorMessage={errors.color}
                            />
                        </FormGroup>
                    </div> : <div className="flex-1">
                        <FormGroup label="Ngôn ngữ" required htmlFor="language">
                            <Input
                                id="language"
                                name="language"
                                value={formData.language}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.language}
                                errorMessage={errors.language}
                            />
                        </FormGroup>
                    </div>}
                    <div className="flex-1">
                        <FormGroup label="Chế độ sử dụng" required htmlFor="usageMode">
                            <Input
                                id="usageMode"
                                name="usageMode"
                                value={formData.usageMode}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.usageMode}
                                errorMessage={errors.usageMode}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    {(type == FolderConstants.types.audio || type == FolderConstants.types.video || type == FolderConstants.types.document) ? <div className="flex-1">
                        <FormGroup label="Chất lượng" required htmlFor="quality">
                            <Input
                                id="quality"
                                name="quality"
                                value={formData.quality}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.quality}
                                errorMessage={errors.quality}
                            />
                        </FormGroup>
                    </div> : null}
                    <div className="flex-1">
                        <FormGroup label="Tình trạng vật lý" required htmlFor="physicalStatus">
                            <Input
                                id="physicalStatus"
                                name="physicalStatus"
                                value={formData.physicalStatus}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.physicalStatus}
                                errorMessage={errors.physicalStatus}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup label="Từ khóa" htmlFor="hashTag">
                            <TextArea
                                id="hashTag"
                                name="hashTag"
                                value={formData.hashTag}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.hashTag}
                                errorMessage={errors.hashTag}
                            />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup label="Ghi chú" htmlFor="note">
                            <TextArea
                                id="note"
                                name="note"
                                value={formData.note}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.note}
                                errorMessage={errors.note}
                            />
                        </FormGroup>
                    </div>
                </div>
                <div className="flex justify-between gap-5">
                    <div className="flex-1">
                        <FormGroup className='flex flex-col gap-3' label="Chế độ dự phòng" required htmlFor="riskRecovery">
                            <RadioButton checked={formData.riskRecovery == 'true' ? true : false} onChange={onChangeValue} name='riskRecovery' value={true} label='Có' />
                            <RadioButton checked={formData.riskRecovery == 'false' ? true : false} onChange={onChangeValue} name='riskRecovery' value={false} label='Không' />
                        </FormGroup>
                    </div>
                    <div className="flex-1">
                        <FormGroup className='flex flex-col gap-3' label="Tình trạng dự phòng" required htmlFor="riskRecoveryStatus">
                            <RadioButton disabled={formData.riskRecovery == 'false' ? true : false} checked={FileConstants.riskRecoveryStatuses.yes == formData.riskRecoveryStatus} onChange={onChangeValue} name='riskRecoveryStatus' value={FileConstants.riskRecoveryStatuses.yes} label='Đã dự phòng' />
                            <RadioButton disabled={formData.riskRecovery == 'false' ? true : false} checked={FileConstants.riskRecoveryStatuses.notYet == formData.riskRecoveryStatus} onChange={onChangeValue} name='riskRecoveryStatus' value={FileConstants.riskRecoveryStatuses.notYet} label='Chưa dự phòng' />
                        </FormGroup>
                    </div>
                </div>
                {type == FolderConstants.types.document && <div className="flex justify-between gap-5 mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="isAcceptEditShare"
                                name="isAcceptEditShare"
                                checked={formData.isAcceptEditShare}
                                value={formData.isAcceptEditShare}
                                onChange={onChangeValue}
                                disabled={false}
                                placeholder=""
                                error={!!errors.isAcceptEditShare}
                                errorMessage={errors.isAcceptEditShare}
                            />
                            <label className="cursor-pointer" htmlFor="isAcceptEditShare">Cho phép chỉnh sửa trực tiếp khi chia sẻ tệp tin này</label>
                        </div>
                        {formData.isAcceptEditShare &&
                            <p className="text-sm font-normal mt-1 text-[red] italic"><span className="underline">Lưu ý</span>: <span>khi bật tính năng này thì đối tượng chia sẻ có thể thay đổi nội dung trên tập tin của bạn</span></p>}
                    </div>
                </div>}
                {/* {type == FolderConstants.types.model3D && <div className="flex flex-col justify-between">
                    <div className="flex-1">
                        <FormGroup label="Hình ảnh đại diện" required htmlFor="avatar">

                        </FormGroup>
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-x-5 gap-y-2">
                        {(files || []).filter(p => p.file2).map((file, index) => {
                            return (
                                <SelectFileItem key={`file2-item-${index}`} file={{
                                    size: 0,
                                    id: '1',
                                    name: FileHelpers.getFileName(file.file2),
                                    url: file.file2
                                }} index={index} onDeleteFile={onDeleteFile} onSelectFile={onSelectFile} />
                            )
                        })}
                    </div>
                    <input id="file" type="file" multiple onChange={onChangeFile} className="hidden" style={{
                        display: 'none'
                    }} />
                    <div onClick={onClickFile} onDrop={onDropFile}
                        onDragOver={onDragOverFile}
                        onDragLeave={onDragLeaveFile} className="transition-all duration-300 ease-in-out cursor-pointer flex-1 flex items-center justify-center border border-dashed border-[#D9D9D9] rounded-md p-10 flex-col">
                        <p className="text-sm text-[#597EF7] flex items-center">
                            <img src='/images/icons/upload_file.svg' className="mr-2 w-3" />
                            Tải lên từ máy tính
                        </p>
                        <p className="text-sm text-[#8C8C8C] mt-2">Hoặc kéo và thả tập tin tại đây</p>
                    </div>
                </div>} */}
                <div className="flex flex-col justify-between">
                    <div className="flex-1">
                        <FormGroup label="Đính kèm tập tin" required htmlFor="name">

                        </FormGroup>
                    </div>
                    {/* <div className="mb-2 grid grid-cols-2 gap-x-5 gap-y-2">
                        {files.map((file, index) => {
                            return (
                                <SelectFileItem key={`file-item-${index}`} file={file} index={index} onDeleteFile={onDeleteFile} onSelectFile={onSelectFile} />
                            )
                        })}
                    </div>
                    <input id="file" type="file" multiple onChange={onChangeFile} className="hidden" style={{
                        display: 'none'
                    }} />
                    <div onClick={onClickFile} onDrop={onDropFile}
                        onDragOver={onDragOverFile}
                        onDragLeave={onDragLeaveFile} className="transition-all duration-300 ease-in-out cursor-pointer flex-1 flex items-center justify-center border border-dashed border-[#D9D9D9] rounded-md p-10 flex-col">
                        <p className="text-sm text-[#597EF7] flex items-center">
                            <img src='/images/icons/upload_file.svg' className="mr-2 w-3" />
                            Tải lên từ máy tính
                        </p>
                        <p className="text-sm text-[#8C8C8C] mt-2">Hoặc kéo và thả tập tin tại đây</p>
                    </div> */}
                    <UploadFile files={files} onDeleteFile={onDeleteFile} onSelectFile={onSelectFile} onChangeFile={onChangeFile} onClickFile={onClickFile} onDropFile={onDropFile} onDragOverFile={onDragOverFile} onDragLeaveFile={onDragLeaveFile} />
                </div>
            </div>
            {selectFile && <PreviewFileModal file={selectFile} onClose={onClosePreviewFile} />}
        </Modal>
    )
}

export default CreateOrEditFileModal;
