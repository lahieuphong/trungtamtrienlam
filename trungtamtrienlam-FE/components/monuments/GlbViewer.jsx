'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Boxes, ExternalLink, Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const DRACO_DECODER_PATH = '/vendor/three/draco/gltf/'
const KTX2_TRANSCODER_PATH = '/vendor/three/basis/'

function disposeMaterial(material) {
    Object.values(material || {}).forEach((value) => {
        if (value && typeof value === 'object' && typeof value.dispose === 'function') {
            value.dispose()
        }
    })

    material?.dispose?.()
}

function disposeObject(object) {
    object?.traverse?.((child) => {
        child.geometry?.dispose?.()

        if (Array.isArray(child.material)) {
            child.material.forEach(disposeMaterial)
        } else if (child.material) {
            disposeMaterial(child.material)
        }
    })
}

function fitCameraToObject(camera, controls, object) {
    const box = new THREE.Box3().setFromObject(object)

    if (box.isEmpty()) {
        camera.position.set(0, 1, 3)
        controls.target.set(0, 0, 0)
        controls.update()
        return
    }

    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z) || 1
    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360))
    const fitWidthDistance = fitHeightDistance / camera.aspect
    const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.45

    camera.near = Math.max(distance / 100, 0.01)
    camera.far = distance * 100
    camera.position.set(center.x + distance * 0.75, center.y + distance * 0.45, center.z + distance * 1.15)
    camera.updateProjectionMatrix()

    controls.target.copy(center)
    controls.minDistance = Math.max(distance * 0.08, 0.01)
    controls.maxDistance = distance * 8
    controls.update()
}

export default function GlbViewer({ src, fileName }) {
    const containerRef = useRef(null)
    const resetViewRef = useRef(null)
    const progressValueRef = useRef(1)
    const progressTargetRef = useRef(1)
    const [progress, setProgress] = useState(1)
    const [progressLabel, setProgressLabel] = useState('Đang tải mô hình')
    const [status, setStatus] = useState('loading')
    const [error, setError] = useState('')
    const [isFullscreen, setIsFullscreen] = useState(false)

    const resetView = useCallback(() => {
        resetViewRef.current?.()
    }, [])

    const toggleFullscreen = useCallback(() => {
        const updateFullscreen = () => setIsFullscreen((current) => !current)

        if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
            document.startViewTransition(() => flushSync(updateFullscreen))
            return
        }

        updateFullscreen()
    }, [])

    useEffect(() => {
        if (!isFullscreen) return undefined

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsFullscreen(false)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isFullscreen])

    useEffect(() => {
        if (!src || !containerRef.current) return undefined

        const container = containerRef.current
        let mounted = true
        let model = null
        let progressTimer = null
        let revealTimer = null
        let fileTransferComplete = false
        let resizeFrame = null

        progressValueRef.current = 1
        progressTargetRef.current = 1
        setProgress(1)
        setProgressLabel('Đang tải mô hình')
        setStatus('loading')
        setError('')

        const updateProgressTarget = (target, label) => {
            progressTargetRef.current = Math.max(progressTargetRef.current, target)
            if (label) setProgressLabel(label)
        }

        const stopProgressTimers = () => {
            if (progressTimer) {
                window.clearInterval(progressTimer)
                progressTimer = null
            }

            if (revealTimer) {
                window.clearInterval(revealTimer)
                revealTimer = null
            }
        }

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f5)

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000)
        camera.position.set(0, 1, 3)

        let renderer

        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
        } catch (renderError) {
            setStatus('error')
            setError('Trình duyệt không hỗ trợ WebGL để xem mô hình 3D.')
            return undefined
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1
        renderer.setClearColor(0xf5f5f5, 1)
        renderer.domElement.className = 'h-full w-full rounded-md outline-none'
        container.appendChild(renderer.domElement)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.055
        controls.enablePan = true
        controls.panSpeed = 0.58
        controls.rotateSpeed = 0.58
        controls.zoomSpeed = 0.52
        controls.screenSpacePanning = true
        if ('zoomToCursor' in controls) controls.zoomToCursor = true

        scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca3af, 2.2))

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
        keyLight.position.set(4, 6, 6)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight(0xffffff, 1.2)
        fillLight.position.set(-5, 3, -4)
        scene.add(fillLight)

        const resize = () => {
            if (!container || !renderer) return

            if (resizeFrame) window.cancelAnimationFrame(resizeFrame)

            resizeFrame = window.requestAnimationFrame(() => {
                if (!mounted || !renderer) return

                const width = Math.max(container.clientWidth, 1)
                const height = Math.max(container.clientHeight, 1)
                const pixelCount = width * height
                const nextPixelRatio = Math.min(window.devicePixelRatio || 1, pixelCount > 1200000 ? 1.5 : 2)

                renderer.setPixelRatio(nextPixelRatio)
                renderer.setSize(width, height, false)
                camera.aspect = width / height
                camera.updateProjectionMatrix()
                controls.update()
                resizeFrame = null
            })
        }

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
        resize()

        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
        dracoLoader.setDecoderConfig({ type: 'wasm' })

        const ktx2Loader = new KTX2Loader()
        ktx2Loader.setTranscoderPath(KTX2_TRANSCODER_PATH)
        ktx2Loader.detectSupport(renderer)

        const loader = new GLTFLoader()
        loader.setDRACOLoader(dracoLoader)
        loader.setKTX2Loader(ktx2Loader)
        loader.setMeshoptDecoder(MeshoptDecoder)

        progressTimer = window.setInterval(() => {
            if (!fileTransferComplete && progressTargetRef.current < 82) {
                progressTargetRef.current = Math.min(82, progressTargetRef.current + 0.45)
            }

            const current = progressValueRef.current
            const target = progressTargetRef.current
            if (current >= target) return

            const distance = target - current
            const step = Math.max(target >= 100 ? 2.6 : 0.6, distance * (target >= 100 ? 0.2 : 0.075))
            const nextProgress = Math.min(target, current + step)

            progressValueRef.current = nextProgress
            setProgress(Math.max(1, Math.min(100, Math.round(nextProgress))))
        }, 80)

        loader.load(
            src,
            (gltf) => {
                if (!mounted) return

                fileTransferComplete = true
                updateProgressTarget(100, 'Hoàn tất mô hình')
                model = gltf.scene
                scene.add(model)
                fitCameraToObject(camera, controls, model)
                resetViewRef.current = () => fitCameraToObject(camera, controls, model)

                revealTimer = window.setInterval(() => {
                    if (!mounted) return
                    if (progressValueRef.current < 99.5) return

                    progressValueRef.current = 100
                    setProgress(100)
                    stopProgressTimers()
                    setStatus('ready')
                }, 40)
            },
            (event) => {
                if (!mounted || !event?.lengthComputable || !event.total) return

                const transferProgress = event.loaded / event.total
                const nextTarget = Math.min(90, Math.max(4, 8 + transferProgress * 82))
                updateProgressTarget(nextTarget, transferProgress >= 1 ? 'Đang xử lý mô hình' : 'Đang tải mô hình')

                if (transferProgress >= 1) {
                    fileTransferComplete = true
                    updateProgressTarget(94, 'Đang giải mã mô hình')
                }
            },
            () => {
                if (!mounted) return

                stopProgressTimers()
                setProgress(100)
                setStatus('error')
                setError('Không thể hiển thị mô hình 3D này.')
            }
        )

        renderer.setAnimationLoop(() => {
            controls.update()
            renderer.render(scene, camera)
        })

        return () => {
            mounted = false
            stopProgressTimers()
            if (resizeFrame) window.cancelAnimationFrame(resizeFrame)
            resetViewRef.current = null
            resizeObserver.disconnect()
            renderer.setAnimationLoop(null)
            disposeObject(model)
            controls.dispose()
            dracoLoader.dispose()
            ktx2Loader.dispose()
            renderer.dispose()
            renderer.forceContextLoss?.()
            renderer.domElement.remove()
        }
    }, [src])

    const viewerClassName = isFullscreen
        ? 'fixed inset-0 z-[80] h-screen min-h-0 rounded-none bg-[#F5F5F5] p-3 shadow-2xl sm:p-4'
        : 'relative h-[58vh] min-h-[360px] rounded-md bg-[#F5F5F5]'

    return (
        <div
            className={`${viewerClassName} overflow-hidden transition-[border-radius,box-shadow,opacity,transform] duration-300 ease-out`}
            style={{ contain: 'layout paint', viewTransitionName: 'monument-glb-viewer' }}
        >
            <div ref={containerRef} className="h-full w-full" />

            {status === 'loading' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-[#434343]">
                    <Boxes className="h-11 w-11 text-[#8C8C8C]" />
                    <div className="w-60 max-w-[72%] overflow-hidden rounded-full bg-[#E5E7EB]">
                        <div
                            className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm font-medium">{progressLabel} {progress}%</p>
                </div>
            )}

            {status === 'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-center text-sm text-[#595959]">
                    <Boxes className="h-12 w-12 text-[#8C8C8C]" />
                    <p>{error || 'Không thể hiển thị mô hình 3D này.'}</p>
                    {src && (
                        <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#597EF7] px-3 py-2 text-sm font-medium text-white hover:bg-[#2F54EB]">
                            <ExternalLink className="h-4 w-4" />
                            Mở tệp
                        </a>
                    )}
                </div>
            )}

            {status === 'ready' && (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={resetView}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] bg-white/90 text-[#1F1F1F] shadow-sm transition-colors hover:bg-[#F5F5F5]"
                        title="Đặt lại góc xem"
                        aria-label="Đặt lại góc xem"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] bg-white/90 text-[#1F1F1F] shadow-sm transition-colors hover:bg-[#F5F5F5]"
                        title={isFullscreen ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình'}
                        aria-label={isFullscreen ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình'}
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            )}
        </div>
    )
}