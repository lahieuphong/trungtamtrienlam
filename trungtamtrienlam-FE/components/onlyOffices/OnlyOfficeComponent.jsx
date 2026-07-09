'use client';

import React, { useEffect } from 'react';

import { OnlyOfficeConstants } from '../../constants/configConstants';
import { ApiConstants } from '../../constants/apiConstants';
import { FileHelpers } from '@/helpers/fileHelpers';
import UserUtil from '../../utils/userUtil'

function getTypeOnlyOffice(fileName) {
    if (FileHelpers.isFileDocDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.doc,
            documentType: OnlyOfficeConstants.documentTypes.word
        }
    } else if (FileHelpers.isFileDocxDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.docx,
            documentType: OnlyOfficeConstants.documentTypes.word
        }
    } else if (FileHelpers.isFilePowerPointxDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.pptx,
            documentType: OnlyOfficeConstants.documentTypes.slide
        }
    } else if (FileHelpers.isFilePowerPointDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.ppt,
            documentType: OnlyOfficeConstants.documentTypes.slide
        }
    } else if (FileHelpers.isFileExcelxDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.xlsx,
            documentType: OnlyOfficeConstants.documentTypes.cell
        };
    } else if (FileHelpers.isFileExcelDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.xls,
            documentType: OnlyOfficeConstants.documentTypes.cell
        };
    } else if (FileHelpers.isFileTxtDocument(fileName)) {
        return {
            type: OnlyOfficeConstants.fileTypes.txt,
            documentType: OnlyOfficeConstants.documentTypes.word
        };
    }

    return null;
}

function OnlyOfficeEditor({
    className,
    widthContent,
    heightContent,
    fileUrl,
    fileType,
    documentType,
    mode,
    title,
    uniqueKey,
    callbackUrl,
    jwtToken = process.env.NEXT_PUBLIC_ONLYOFFICE_JWT_TOKEN || ApiConstants.onlyOfficeJwtToken || null
}) {
    const [isLoading, setIsLoading] = React.useState(false);
    const validJwtToken = React.useMemo(() => {
        if (!jwtToken || typeof jwtToken !== 'string') {
            return null;
        }

        const parts = jwtToken.split('.');

        if (parts.length !== 3 || parts.some((part) => !part)) {
            return null;
        }

        return jwtToken;
    }, [jwtToken]);
    const jwtSecret = React.useMemo(() => {
        if (!jwtToken || typeof jwtToken !== 'string') {
            return null;
        }

        return validJwtToken ? null : jwtToken;
    }, [jwtToken, validJwtToken]);
    const onlyOfficeScriptCandidates = React.useMemo(() => {
        const candidates = [
            process.env.NEXT_PUBLIC_ONLYOFFICE_SCRIPT_URL,
            ApiConstants.onlyOfficeServerUrlScript,
            ApiConstants.onlyOfficeServerUrl ? `${ApiConstants.onlyOfficeServerUrl}/web-apps/apps/api/documents/api.js` : null
        ].filter(Boolean);

        const normalized = [];

        candidates.forEach((url) => {
            if (!normalized.includes(url)) {
                normalized.push(url);
            }

            if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
                const upgradedUrl = url.replace(/^http:\/\//, 'https://');

                if (!normalized.includes(upgradedUrl)) {
                    normalized.push(upgradedUrl);
                }
            }
        });

        return normalized;
    }, []);
    const editorContainerId = React.useMemo(() => {
        const normalizedKey = String(uniqueKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');

        return `onlyOfficeEditor-${normalizedKey}`;
    }, [uniqueKey]);

    useEffect(() => {
        if (!(fileUrl && fileType && documentType && mode && title && uniqueKey)) {
            console.error('Missing required parameters for OnlyOffice editor');

            return;
        }

        setIsLoading(true);

        const userInfo = UserUtil.getUserInfo();
        const resolvedCallbackUrl = callbackUrl || ApiConstants.onlyOfficeServerUrlCallBack;
        const shouldEdit = mode === OnlyOfficeConstants.modes.edit && !!resolvedCallbackUrl;
        const effectiveMode = shouldEdit ? OnlyOfficeConstants.modes.edit : OnlyOfficeConstants.modes.view;

        let docEditor = null;
        let retryTimer = null;
        let stopRetry = false;
        let retryCount = 0;
        const maxRetries = 40;
        let loadScriptPromise = null;
        let signedTokenPromise = null;

        const encoder = new TextEncoder();
        const toBase64Url = (input) => {
            const bytes = typeof input === 'string'
                ? encoder.encode(input)
                : new Uint8Array(input);
            let binary = '';

            for (let i = 0; i < bytes.byteLength; i += 1) {
                binary += String.fromCharCode(bytes[i]);
            }

            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        };

        const signHs256Jwt = async (payload, secret) => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const headerEncoded = toBase64Url(JSON.stringify(header));
            const payloadEncoded = toBase64Url(JSON.stringify(payload));
            const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

            const key = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(secret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const signature = await window.crypto.subtle.sign(
                'HMAC',
                key,
                encoder.encode(unsignedToken)
            );

            return `${unsignedToken}.${toBase64Url(signature)}`;
        };

        const resolveDocToken = async (payload) => {
            if (validJwtToken) {
                return validJwtToken;
            }

            if (!jwtSecret) {
                return null;
            }

            if (typeof window === 'undefined' || !window.crypto?.subtle) {
                return null;
            }

            if (!signedTokenPromise) {
                signedTokenPromise = signHs256Jwt(payload, jwtSecret).catch((error) => {
                    console.error('Failed to sign OnlyOffice JWT token from secret:', error);
                    return null;
                });
            }

            return signedTokenPromise;
        };

        const ensureDocsApiLoaded = async () => {
            if (window.DocsAPI && window.DocsAPI.DocEditor) {
                return true;
            }

            if (!onlyOfficeScriptCandidates.length) {
                return false;
            }

            if (!loadScriptPromise) {
                loadScriptPromise = (async () => {
                    for (const scriptUrl of onlyOfficeScriptCandidates) {
                        const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

                        if (existingScript) {
                            if (window.DocsAPI && window.DocsAPI.DocEditor) {
                                return true;
                            }

                            await new Promise((resolve) => {
                                existingScript.addEventListener('load', resolve, { once: true });
                                existingScript.addEventListener('error', resolve, { once: true });
                                setTimeout(resolve, 1500);
                            });

                            if (window.DocsAPI && window.DocsAPI.DocEditor) {
                                return true;
                            }

                            continue;
                        }

                        const script = document.createElement('script');
                        script.src = scriptUrl;
                        script.defer = true;

                        const loaded = await new Promise((resolve) => {
                            script.onload = () => resolve(true);
                            script.onerror = () => resolve(false);
                            document.head.appendChild(script);
                        });

                        if (loaded && window.DocsAPI && window.DocsAPI.DocEditor) {
                            return true;
                        }
                    }

                    return !!(window.DocsAPI && window.DocsAPI.DocEditor);
                })();
            }

            return loadScriptPromise;
        };

        const initEditor = async () => {
            if (!window.DocsAPI || !window.DocsAPI.DocEditor) {
                const loaded = await ensureDocsApiLoaded();

                if (!loaded || !window.DocsAPI || !window.DocsAPI.DocEditor) {
                    return false;
                }
            }

            const editorPayload = {
                document: {
                    fileType,
                    key: uniqueKey,
                    title,
                    url: fileUrl
                },
                documentType,
                editorConfig: {
                    mode: effectiveMode,
                    lang: 'vi',
                    forcesave: true,
                    ...(userInfo ? {
                        user: {
                            id: String(userInfo.id ?? userInfo.userID ?? '0'),
                            name: String(userInfo.fullName ?? userInfo.name ?? 'User'),
                        }
                    } : {}),
                    customization: {
                        forcesave: true,
                        autosave: false,
                        chat: false,
                        comments: false,
                        feedback: false,
                        help: false,
                        toolbarNoTabs: true,
                        hideRightMenu: true,
                        plugins: true
                    },
                    coEditing: {
                        mode: 'fast',
                        change: false,
                    },
                    ...(shouldEdit ? { callbackUrl: resolvedCallbackUrl } : {}),
                },
            };
            const resolvedToken = await resolveDocToken(editorPayload);

            docEditor = new window.DocsAPI.DocEditor(editorContainerId, {
                ...editorPayload,
                ...(resolvedToken ? { token: resolvedToken } : {}),
            });

            setTimeout(() => {
                setIsLoading(false);
            }, 2000);

            return true;
        };

        initEditor().then((initialized) => {
            if (initialized || stopRetry) {
                return;
            }

            retryTimer = setInterval(async () => {
                if (stopRetry) {
                    clearInterval(retryTimer);
                    retryTimer = null;

                    return;
                }

                retryCount += 1;

                if (await initEditor()) {
                    clearInterval(retryTimer);
                    retryTimer = null;

                    return;
                }

                if (retryCount >= maxRetries) {
                    clearInterval(retryTimer);
                    retryTimer = null;
                    setIsLoading(false);
                    console.error('DocsAPI is not loaded. Please ensure the OnlyOffice script is included.');
                }
            }, 150);
        });

        return () => {
            stopRetry = true;

            if (retryTimer) {
                clearInterval(retryTimer);
                retryTimer = null;
            }

            try {
                docEditor.destroyEditor?.();
            } catch (err) {
                console.error('Failed to destroy OnlyOffice editor:', err);
            }
        };
    }, [fileUrl, fileType, documentType, mode, title, uniqueKey, callbackUrl, editorContainerId, onlyOfficeScriptCandidates, validJwtToken, jwtSecret]);

    return (
        <div className={`${className} relative`}>
            <div id={editorContainerId} style={{ width: widthContent, height: heightContent }} />
            {isLoading && (
                <div className="absolute z-[1] top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-[rgba(255,255,255,1)]">
                    <div className="">
                        <img className='w-14 h-14 text-black' src="/images/icons/loading_black.svg" />
                    </div>
                    <p className='text-black text-sm'>Đang tải dữ liệu, xin vui lòng đợi trong giây lát...</p>
                </div>
            )}
        </div>
    );
}

export default OnlyOfficeEditor;

export {
    getTypeOnlyOffice
}