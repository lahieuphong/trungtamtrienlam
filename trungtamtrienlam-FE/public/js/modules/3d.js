// src/lib/three/3d.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import io from 'socket.io-client';

import threeConstants from '../constants/threeConstants.js'; // 🔗 dùng state chung
import configConstants from '../constants/configConstants.js';

let socket = null;
let sessionId = null;

const HDR_BASE = '/3ds/hdrs/';

// NEW: danh sách HDRI preset (key -> file)
const HDR_PRESETS = {
    venice: 'venice_sunset_1k.hdr',
    royal: 'royal_esplanade_1k.hdr',
    overpass: 'pedestrian_overpass_1k.hdr',
    quarry: 'quarry_01_1k.hdr',
    blouberg: 'blouberg_sunrise_2_1k.hdr',
    moonless: 'moonless_golf_1k.hdr',
    san_giuseppe: 'san_giuseppe_bridge_1k.hdr',
    studio_small_03_1k: 'studio_small_03_1k.hdr',
    lebombo_1k: 'lebombo_1k.hdr',
    industrial_sunset_1k: 'industrial_sunset_1k.hdr',
    meadow_1k: 'meadow_1k.hdr', // NEW: meadow preset

    qwantani_morning_puresky_1k: 'qwantani_morning_puresky_1k.hdr', // NEW: Qwantani morning
    barnaslingan_02_1k: 'barnaslingan_02_1k.hdr', // NEW: Barnaslingan 02
    'horn-koppe_spring_1k': 'horn-koppe_spring_1k.hdr', // NEW: Horn Koppe Spring
    citrus_orchard_road_puresky_1k: 'citrus_orchard_road_puresky_1k.hdr', // NEW: Citrus Orchard Road
    bloem_field_sunrise_1k: 'bloem_field_sunrise_1k.hdr', // NEW: Bloem Field Sunrise
    qwantani_dusk_1_puresky_1k: 'qwantani_dusk_1_puresky_1k.hdr', // NEW: Qwantani Dusk 1
    bambanani_sunset_1k: 'bambanani_sunset_1k.hdr', // NEW: Bambanani Sunset
    flamingo_pan_1k: 'flamingo_pan_1k.hdr', // NEW: Flamingo Pan

    'underground-parking-garage-hdri_1K': 'underground-parking-garage-hdri_1K.hdr',
    'autumn-forest-04_1K': 'autumn-forest-04_1K_2ad2b552-328f-4a6b-81b8-c24f45713118.hdr',
    'bluesky-green-tree-village-road_1K': 'bluesky-green-tree-village-road_1K.hdr',
    'boma_1K': 'boma_1K_f6a9f5c7-5de7-44bb-b33e-650ab632e258.hdr',
    'dramatic-hazy-sky_1K': 'dramatic-hazy-sky_1K.hdr',
    'elegant-warm-living-room-hdri_1K': 'elegant-warm-living-room-hdri_1K.hdr',
    'small-harbour-sunset_1K': 'small-harbour-sunset_1K.hdr',
    'warm-restaurant-night_1K': 'warm-restaurant-night_1K.hdr',
    room: 'ROOM' // đặc biệt: dùng RoomEnvironment
};

async function isLaptop() {
    let isLaptop = false;

    // 2. Screen size check: màn nhỏ → khả năng là laptop
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < 1600 && height < 1000) {
        isLaptop = true;
    }

    // 1. Battery check: nếu có pin → khả năng cao là laptop
    // try {
    //     const battery = await navigator.getBattery();

    //     if (battery && battery.charging !== null) {
    //         isLaptop = true;
    //     }
    // } catch (e) {
    //     // Battery API không hỗ trợ hoặc bị chặn
    // }

    return isLaptop;
}

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

function isMac() {
    return /(Macintosh|Mac OS X)/.test(navigator.userAgent);
}

function isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches;
}

function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
}

function updateSize3D(box3DParameter) {
    if (threeConstants.camera && threeConstants.webGLRenderer && threeConstants.scene && threeConstants.controls && threeConstants.model) {
        let box3D = null;

        if (typeof box3DParameter == 'string') {
            box3D = document.getElementById(box3DParameter);
        } else if (box3DParameter) {
            box3D = box3DParameter;
        }

        if (box3D) {
            const width = box3D.clientWidth;
            const height = box3D.clientHeight;
            // const width = 512;
            // const height = 512;

            threeConstants.webGLRenderer.setSize(width, height);

            threeConstants.controls.update(); // Cập nhật các điều khiển

            threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera);

            threeConstants.camera.aspect = width / height;
            threeConstants.camera.updateProjectionMatrix();
            threeConstants.webGLRenderer.setSize(width, height);
        }
    }
}

function destroy3DRenderStreaming() {
    if (!socket || !sessionId) {
        return;
    }

    try {
        socket.emit("clientShutdown", { sessionId });
    } catch {

    }

    try {
        socket.disconnect(); // 👈 ngắt kết nối
    } catch { }

    socket = null;
    sessionId = null;
}

function destroy3D() {
    // ✅ Cancel loading nếu đang load
    if (threeConstants.abortController) {
        threeConstants.abortController.abort();
        threeConstants.abortController = null;
    }

    // ✅ Stop render loop
    if (threeConstants.requestId) {
        cancelAnimationFrame(threeConstants.requestId);
        threeConstants.requestId = null;
    }

    // ✅ Dispose controls
    if (threeConstants.controls) {
        threeConstants.controls.dispose();
        threeConstants.controls = null;
    }

    // ✅ Dispose model
    if (threeConstants.model) {
        threeConstants.scene.remove(threeConstants.model);

        threeConstants.model.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });

        threeConstants.model = null;
    }

    // ✅ Dispose renderer
    if (threeConstants.webGLRenderer) {
        try {
            threeConstants.webGLRenderer.dispose();
            threeConstants.webGLRenderer.forceContextLoss?.(); // optional
        } catch { }

        threeConstants.webGLRenderer.domElement = null;
        threeConstants.webGLRenderer = null;
    }

    // ✅ Clear scene
    if (threeConstants.scene) {
        while (threeConstants.scene.children.length > 0) {
            threeConstants.scene.remove(threeConstants.scene.children[0]);
        }
        // Background là cùng texture -> không cần dispose lần 2 nếu trỏ cùng env
        threeConstants.scene.environment = null;      // NEW
        threeConstants.scene.background = null;      // NEW
        threeConstants.scene = null;
    }

    if (threeConstants.pmrem) {
        threeConstants.pmrem.dispose();               // NEW
        threeConstants.pmrem = null;                  // NEW
    }

    if (threeConstants.pickAbort) {
        try { threeConstants.pickAbort.abort(); } catch (e) { }
        threeConstants.pickAbort = null;
    }

    threeConstants.raycaster = null;
    threeConstants.ndc = null;

    // ✅ Camera
    threeConstants.camera = null;

    threeConstants.envToken = 0;

    threeConstants.pivotSprite = null;

    // ✅ Đặt lại trạng thái
    threeConstants.isInit3D = false;
}

function loadGLB(url, loading3DProcessBarParameter, loading3DValueParameter) {
    return new Promise((resolve, reject) => {
        const abortController = new AbortController(); // 👈 create AbortController
        const signal = abortController.signal;

        const ktx2 = new KTX2Loader()
            // Dùng CDN three chính chủ để có đủ transcoder *.wasm/*.js/*.worker.js
            .setTranscoderPath('https://unpkg.com/three@0.154.0/examples/jsm/libs/basis/')
            .detectSupport(threeConstants.webGLRenderer);

        ktx2.setWorkerLimit(isMobile() ? 1 : 2);

        const loadingManager = new THREE.LoadingManager();

        // ----------------------------------------------------
        // 🚀 BỔ SUNG DRACO DECODER TẠI ĐÂY
        // ----------------------------------------------------
        const dracoLoader = new DRACOLoader();
        // Cần trỏ đến thư mục chứa các file giải mã Draco.
        // Đây là đường dẫn CDN chính thức của Three.js cho Draco v0.154.0
        dracoLoader.setDecoderPath('https://unpkg.com/three@0.154.0/examples/jsm/libs/draco/gltf/');
        // ----------------------------------------------------

        threeConstants.loader = new GLTFLoader(loadingManager).setKTX2Loader(ktx2).setDRACOLoader(dracoLoader).setMeshoptDecoder(MeshoptDecoder);

        threeConstants.loader.manager.setURLModifier((url) => url); // Đảm bảo nó không cache

        // Tạo LOD container để debug log
        // const lod = new THREE.LOD();
        // const oldUpdate = lod.update;
        // lod.update = function (camera) {
        //     oldUpdate.call(this, camera);
        //     const currentLevel = this.levels.findIndex(level => level.object.visible);
        //     if (this._lastLevel !== currentLevel) {
        //         console.log(`📦 LOD switched → LOD${currentLevel}`);
        //         this._lastLevel = currentLevel;
        //     }
        // };

        // const distances = [0, 50, 100]; // 👈 khoảng cách để đổi LOD
        // const lodUrls = [
        //     'https://3dgallery-api.hongvan.net/api/Download/Download?path=uploadPrivates/3ds/a.glb',
        //     'https://3dgallery-api.hongvan.net/api/Download/Download?path=uploadPrivates/3ds/a-lod1.glb',
        //     'https://3dgallery-api.hongvan.net/api/Download/Download?path=uploadPrivates/3ds/a-lod2.glb',
        // ];

        // let loadedCount = 0;

        // lodUrls.forEach((url, i) => {
        //     threeConstants.loader.load(url, (gltf) => {
        //         threeConstants.model = gltf.scene;
        //         threeConstants.model.rotation.set(0, 0, 0);
        //         threeConstants.model.scale.set(1, 1, 1);

        //         lod.addLevel(threeConstants.model, distances[i]);

        //         loadedCount++;
        //         if (loadedCount === lodUrls.length) {
        //             // ✅ tất cả LOD đã load xong
        //             ktx2.dispose();
        //             threeConstants.model = lod;
        //             resolve(true);
        //         }
        //     }, undefined, (err) => {
        //         if (signal.aborted) {
        //             console.log("🛑 Load model was aborted");
        //         }
        //         ktx2.dispose();
        //         reject(false);
        //     });
        // });

        threeConstants.loader.load(url, function (gltf) {
            const sceneRoot = gltf.scene;

            sceneRoot.rotation.set(0, 0, 0);
            sceneRoot.scale.set(1, 1, 1);

            // Đảm bảo tất cả children đều có frustumCulled = true
            sceneRoot.traverse(o => {
                if (o.isMesh && o.material) {
                    o.frustumCulled = true;  // để three tự cull ngoài camera
                    o.castShadow = o.receiveShadow = false; // ❌ bỏ shadow realtime
                    o.material.depthWrite = !o.material.transparent;
                    o.material.depthTest = true;
                }
            });

            // Không có node LOD → fallback dùng model gốc
            threeConstants.model = sceneRoot;

            // đã xong: có thể giải phóng ktx2 worker/wasm
            ktx2.dispose();

            dracoLoader.dispose(); // 👈 BỔ SUNG

            resolve(true);
        }, progress => {
            const loaded = progress.loaded;
            const total = progress.total;

            const percent = loaded * 100 / total;

            let percentValue = 100 - percent;

            if (percentValue <= 0) {
                percentValue = 0;
            }

            let loading3DProcessBar = null;
            let loading3DValue = null;

            if (typeof loading3DProcessBarParameter == 'string') {
                loading3DProcessBar = document.getElementById(loading3DProcessBarParameter);
            } else if (loading3DProcessBarParameter) {
                loading3DProcessBar = loading3DProcessBarParameter;
            }

            if (typeof loading3DValueParameter == 'string') {
                loading3DValue = document.getElementById(loading3DValueParameter);
            } else if (loading3DValueParameter) {
                loading3DValue = loading3DValueParameter;
            }

            if (loading3DProcessBar) {
                loading3DProcessBar.style.transform = `translateX(-${percentValue}%)`;
            }

            if (loading3DValue) {
                loading3DValue.textContent = Math.floor(percent);
            }
        }, err => {
            if (signal.aborted) {
                console.log("🛑 Load model was aborted");
            }

            // lỗi/abort thì cũng dọn ktx2
            ktx2.dispose();

            dracoLoader.dispose(); // 👈 BỔ SUNG

            reject(false);
        });

        // Gán controller để có thể cancel từ ngoài
        threeConstants.abortController = abortController;
    });
}

function canvasMouseDown(event) {
    // Chỉ bắt chuột trái
    if (event.button != 0) {
        return;
    }

    const boundingClientRect = this.getBoundingClientRect();

    // Quy đổi sang tọa độ NDC (-1..1)
    threeConstants.mouse.x = ((event.clientX - boundingClientRect.left) / boundingClientRect.width) * 2 - 1;
    threeConstants.mouse.y = -((event.clientY - boundingClientRect.top) / boundingClientRect.height) * 2 + 1;

    // Bắn ray từ camera qua điểm chuột
    threeConstants.raycaster.setFromCamera(threeConstants.mouse, threeConstants.camera);

    // Kiểm tra va chạm với model
    const intersects = threeConstants.raycaster.intersectObject(threeConstants.model, true);

    if (intersects.length > 0) {
        const hitPoint = intersects[0].point; // tọa độ 3D của điểm click

        // ✅ Đặt target mới = điểm click
        threeConstants.controls.target.copy(hitPoint);

        // Cập nhật control để xoay/zoom quanh pivot mới
        threeConstants.controls.update();

    }
}

// NEW: nạp HDRI equirectangular và gán môi trường
async function setEnvironmentHDRI(hdrUrl, { showAsBackground = false, intensity = 1.0, blur = 0.0 } = {}) {
    return new Promise((resolve, reject) => {
        new RGBELoader()
            .load(hdrUrl, (hdrTex) => {
                const envTex = threeConstants.pmrem.fromEquirectangular(hdrTex).texture; // lọc PMREM
                hdrTex.dispose();

                // gán environment (ánh sáng phản xạ cho PBR)
                threeConstants.scene.environment = envTex;       // NEW
                // nền: dùng/không dùng
                threeConstants.scene.background = showAsBackground ? envTex : null; // NEW

                // blur + cường độ nền (r0.152+)
                if (showAsBackground) {
                    threeConstants.scene.backgroundBlurriness = blur;    // NEW (0..1)
                    threeConstants.scene.backgroundIntensity = intensity; // NEW
                }

                // 👇 ADD — vẽ ngay khung mới
                renderOnce();

                // tăng envMapIntensity cho model nếu cần
                if (threeConstants.model) {
                    threeConstants.model.traverse(obj => {
                        if (obj.isMesh && obj.material && 'envMapIntensity' in obj.material) {
                            obj.material.envMapIntensity = intensity; // NEW
                            obj.material.needsUpdate = true;
                        }
                    });
                }

                resolve(true);
            }, undefined, reject);
    });
}


// NEW: tạo môi trường phòng trung tính (không cần file)
function setEnvironmentRoom({ showAsBackground = false, intensity = 1.0, blur = 0.0 } = {}) {
    const roomEnv = new RoomEnvironment();                                   // NEW
    const envTex = threeConstants.pmrem.fromScene(roomEnv, 0.04).texture;    // NEW

    threeConstants.scene.environment = envTex;                                // NEW
    threeConstants.scene.background = showAsBackground ? envTex : null;      // NEW
    if (showAsBackground) {
        threeConstants.scene.backgroundBlurriness = blur;                       // NEW
        threeConstants.scene.backgroundIntensity = intensity;                   // NEW
    }

    // 👇 ADD — vẽ ngay khung mới
    renderOnce();

    if (threeConstants.model) {
        threeConstants.model.traverse(obj => {
            if (obj.isMesh && obj.material && 'envMapIntensity' in obj.material) {
                obj.material.envMapIntensity = intensity;                           // NEW
                obj.material.needsUpdate = true;
            }
        });
    }
}

function fadeEnvIntensity(scene, model, from = 0, to = 1, durationMs = 250) {
    const mats = [];
    if (model) {
        model.traverse(o => {
            if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
                o.material.envMapIntensity = from;
                o.material.needsUpdate = true;
                mats.push(o.material);
            }
        });
    }

    const start = performance.now();

    (function tick() {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const v = from + (to - from) * e;

        for (const m of mats) m.envMapIntensity = v;

        // Nếu bạn dùng scene.background = envTex, có thể fade luôn:
        if ('backgroundIntensity' in scene) scene.backgroundIntensity = v;

        // 👇 ADD — vẽ ngay khung mới
        renderOnce();

        if (t < 1) requestAnimationFrame(tick);
    })();
}

function setEnvIntensity(value) {
    threeConstants.envIntensity = THREE.MathUtils.clamp(value, 0.0, 5.0); // giới hạn 0–5 cho an toàn

    // chỉnh env lighting
    if (threeConstants.model) {
        threeConstants.model.traverse(o => {
            if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
                o.material.envMapIntensity = threeConstants.envIntensity;
                o.material.needsUpdate = true;
            }
        });
    }

    // nếu bạn có dùng background HDRI và muốn nó sáng theo
    if ('backgroundIntensity' in threeConstants.scene) {
        threeConstants.scene.backgroundIntensity = threeConstants.envIntensity;
    }
}

function setEnvIntensityRenderStreaming(value) {
    if (!socket || !sessionId) {
        return;
    }

    socket.emit("change2", {
        sessionId, data: value
    });
}

function applyEnvPresetRenderStreaming(key, {
    showAsBackground = false,
    intensity = 1.2,
    blur = 0.3,
    fadeMs = 250
} = {}) {
    if (!socket || !sessionId) {
        return;
    }

    socket.emit("change", {
        sessionId, data: {
            key,
            showAsBackground,
            intensity,
            blur,
            fadeMs
        }
    });
}

// NEW: đổi HDRI theo key preset
async function applyEnvPreset(key, {
    showAsBackground = false,
    intensity = 1.2,
    blur = 0.3,
    fadeMs = 250
} = {}) {
    // tăng token: chỉ giữ kết quả lần gọi mới nhất
    const myToken = ++threeConstants.envToken;

    // lưu env/background cũ để dọn sau khi thay
    const oldEnv = threeConstants.scene.environment;
    const oldBg = threeConstants.scene.background;

    // Nếu chọn "room" thì dùng RoomEnvironment
    if (key === 'room') {
        setEnvironmentRoom({ showAsBackground, intensity, blur });
        if (myToken !== threeConstants.envToken) return;

        // Crossfade vào intensity mong muốn (set 0 -> fade lên)
        if (threeConstants.model) {
            threeConstants.model.traverse(o => {
                if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
                    o.material.envMapIntensity = 0;
                    o.material.needsUpdate = true;
                }
            });
        }

        fadeEnvIntensity(threeConstants.scene, threeConstants.model, 0.0, intensity, fadeMs);

        // Dọn env cũ (nếu khác)
        if (oldEnv && oldEnv !== threeConstants.scene.environment) oldEnv.dispose?.();
        if (oldBg && oldBg !== threeConstants.scene.background) oldBg.dispose?.();

        threeConstants.scene.background = new THREE.Color(0xe0e0e0); // màu xám nhạt
        threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera); // Cập nhật lại renderer

        return;
    }

    // Các HDRI còn lại -> load file
    const file = HDR_PRESETS[key];
    if (!file) return console.warn('Unknown HDRI key:', key);

    try {
        await setEnvironmentHDRI(HDR_BASE + file, { showAsBackground, intensity, blur });

        if (myToken !== threeConstants.envToken) return;

        // Crossfade (đặt về 0 trước rồi fade lên intensity)
        if (threeConstants.model) {
            threeConstants.model.traverse(o => {
                if (o.isMesh && o.material && 'envMapIntensity' in o.material) {
                    o.material.envMapIntensity = 0;
                    o.material.needsUpdate = true;
                }
            });
        }

        if ('backgroundIntensity' in threeConstants.scene) {
            threeConstants.scene.backgroundIntensity = 0;
        }

        fadeEnvIntensity(threeConstants.scene, threeConstants.model, 0.0, intensity, fadeMs);

        // Dọn env/background cũ (tránh rò rỉ VRAM)
        if (oldEnv && oldEnv !== threeConstants.scene.environment) oldEnv.dispose?.();
        if (oldBg && oldBg !== threeConstants.scene.background) oldBg.dispose?.();

        threeConstants.scene.background = new THREE.Color(0xe0e0e0); // màu xám nhạt
        threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera); // Cập nhật lại renderer
    } catch (err) {
        console.warn('Failed to load HDRI:', file, err);
        // fallback phòng khi tải thất bại
        setEnvironmentRoom({ showAsBackground, intensity, blur });

        threeConstants.scene.background = new THREE.Color(0xe0e0e0); // màu xám nhạt
        threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera); // Cập nhật lại renderer
    }
}

function renderOnce() {
    if (!threeConstants.webGLRenderer || !threeConstants.scene || !threeConstants.camera) {
        return;
    }

    threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera);
    // Render nhóm opaque trước
    // if (threeConstants.groupOpaque.children.length > 0) {
    //     threeConstants.webGLRenderer.autoClear = true;
    //     threeConstants.webGLRenderer.render(threeConstants.groupOpaque, threeConstants.camera);
    // }

    // // Render nhóm transparent sau
    // if (threeConstants.groupTransparent.children.length > 0) {
    //     threeConstants.webGLRenderer.autoClear = false;
    //     threeConstants.webGLRenderer.render(threeConstants.groupTransparent, threeConstants.camera);
    // }

    // threeConstants.webGLRenderer.autoClear = true;
}

function init3DRenderStreaming(url, id) {
    socket = io(configConstants.urlRenderStreaming3D);
    sessionId = null;

    socket.on("connect", () => {
        sessionId = socket.id;  // gán đúng lúc connect

        socket.emit("open-model", { url });
    });

    socket.on("loaded", () => {

        // if ($('#monumentDetailLoadingVideoModel3D').hasClass('active')) {
        //     $('#monumentDetailLoadingVideoModel3D').removeClass('active');

        //     $('#monumentDetailLoadingVideoModel3DPercent').text(`0%`);
        //     $('#monumentDetailLoadingVideoModel3DLine').css('width', `0%`);
        // }

        // $('#monumentDetailMaximizeModel3D').addClass('active');
        // $('#monumentDetailBoxFunctionModel3D').addClass('active');
    });

    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
                urls: ['turn:turn-server-1.daiquocviet.vn:3478?transport=udp'],
                username: 'turn-server-1',
                credential: '123456'
            },
        ]
    });

    const video = document.getElementById(id);

    let dataChannel;

    pc.ondatachannel = (event) => {
        dataChannel = event.channel;

        dataChannel.onopen = () => console.log("DataChannel ready");
    };

    pc.ontrack = e => {
        document.getElementById(id).srcObject = e.streams[0];
    };

    pc.onicecandidate = e => {
        if (e.candidate) {
            socket.emit("ice-candidate", { sessionId, data: e.candidate, role: 'client' });
        }
    };

    socket.on("offer", async (offer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { sessionId, data: answer });
    });

    socket.on("ice-candidate", async (c) => {
        await pc.addIceCandidate(new RTCIceCandidate(c));
    });

    // 📌 gửi resolution cho sender
    // socket.emit("resolution", {
    //     width: 1000,
    //     height: 500,
    // });

    // --- CLICK ---
    // --- INPUT HANDLING ---
    let mouseDownPos = null;

    // Chuột trái xuống
    video.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            mouseDownPos = { x: e.clientX, y: e.clientY };
        }
    });

    // Chuột di chuyển
    video.addEventListener("mousemove", (e) => {
        if (!dataChannel || dataChannel.readyState !== "open") return;

        if (e.buttons === 1 && mouseDownPos) {
            // Drag chuột trái = rotate
            dataChannel.send(JSON.stringify({ type: "rotate", dx: e.movementX, dy: e.movementY }));
        } else if (e.buttons === 2) {
            // Chuột phải = pan
            dataChannel.send(JSON.stringify({ type: "pan", dx: e.movementX, dy: e.movementY }));
        }
    });

    // Chuột nhả (CLICK)
    video.addEventListener("mouseup", (e) => {
        if (!dataChannel || dataChannel.readyState !== "open") return;

        if (e.button === 0 && mouseDownPos) {
            const dx = e.clientX - mouseDownPos.x;
            const dy = e.clientY - mouseDownPos.y;

            // Nếu di chuyển ít → coi là click
            if (Math.hypot(dx, dy) < 5) {
                const rect = video.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;

                // Gửi normalized luôn [0..1]
                dataChannel.send(JSON.stringify({
                    type: "click",
                    x,
                    y
                }));

            }
        }

        mouseDownPos = null;
    });

    // Wheel = zoom
    video.addEventListener("wheel", (e) => {
        if (!dataChannel || dataChannel.readyState !== "open") return;
        e.preventDefault();
        dataChannel.send(JSON.stringify({ type: "zoom", delta: e.deltaY }));
    }, { passive: false });

    // ============ MOBILE (touch) ============
    let movedEnough = false;
    let touchStartPos = null;
    let lastTouches = [];
    let isGesture = false;

    video.addEventListener("touchstart", (e) => {
        e.preventDefault();
        lastTouches = [...e.touches];

        if (e.touches.length === 1) {
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            movedEnough = false;
            isGesture = false;
        }

        if (e.touches.length > 1) {
            isGesture = true;
        }
    }, { passive: false });

    video.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!dataChannel || dataChannel.readyState !== "open") return;

        if (e.touches.length === 1 && lastTouches.length === 1 && !isGesture) {
            // 1 ngón = rotate
            const dx = e.touches[0].clientX - lastTouches[0].clientX;
            const dy = e.touches[0].clientY - lastTouches[0].clientY;
            dataChannel.send(JSON.stringify({ type: "rotate", dx, dy }));

            const totalDx = e.touches[0].clientX - touchStartPos.x;
            const totalDy = e.touches[0].clientY - touchStartPos.y;
            if (Math.abs(totalDx) > 10 || Math.abs(totalDy) > 10) {
                movedEnough = true;
            }
        }

        if (e.touches.length === 2 && lastTouches.length === 2) {
            isGesture = true;

            const prevDist = Math.hypot(
                lastTouches[0].clientX - lastTouches[1].clientX,
                lastTouches[0].clientY - lastTouches[1].clientY
            );
            const newDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const minPinchDistance = 50;
            const zoomFactor = 1;

            if (prevDist > minPinchDistance && newDist > minPinchDistance) {
                const deltaDist = newDist - prevDist;

                const prevMid = {
                    x: (lastTouches[0].clientX + lastTouches[1].clientX) / 2,
                    y: (lastTouches[0].clientY + lastTouches[1].clientY) / 2
                };
                const newMid = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                };

                const dx = newMid.x - prevMid.x;
                const dy = newMid.y - prevMid.y;

                if (Math.abs(deltaDist) > 2) {
                    dataChannel.send(JSON.stringify({ type: "zoom", delta: deltaDist * zoomFactor }));
                } else {
                    dataChannel.send(JSON.stringify({ type: "pan", dx, dy }));
                }

                movedEnough = true;
            }
        }

        lastTouches = [...e.touches];
    }, { passive: false });

    video.addEventListener("touchend", (e) => {
        if (!dataChannel || dataChannel.readyState !== "open") return;

        // 👉 chỉ bắn TAP nếu: không move nhiều & không phải gesture nhiều ngón
        if (!movedEnough && !isGesture && e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            const rect = video.getBoundingClientRect();

            // Toạ độ click tính theo hiển thị video
            const clickX = t.clientX - rect.left;
            const clickY = t.clientY - rect.top;

            dataChannel.send(JSON.stringify({
                type: "tap",
                x: clickX,
                y: clickY,
                w: rect.width,
                h: rect.height
            }));
        }

        lastTouches = [...e.touches];
        touchStartPos = null;
        movedEnough = false;
        if (e.touches.length === 0) {
            isGesture = false;
        }
    }, { passive: false });
}

function init3D(url, box3DParameter, canvasParameter, loading3DParameter, loading3DProcessBarParameter, loading3DValueParameter) {
    return new Promise(async resolve => {
        if (threeConstants.isInit3D) {
            return;
        }

        const SHADOW_MAP_SIZE = (isMobile() || isMac()) ? 512 : 1024;

        threeConstants.envToken = 0; // NEW
        threeConstants.envIntensity = 1.2; // NEW

        threeConstants.isInit3D = true;

        let box3D = null;
        let canvas = null;

        if (typeof box3DParameter == 'string') {
            box3D = document.getElementById(box3DParameter);
        } else if (box3DParameter) {
            box3D = box3DParameter;
        }

        if (typeof canvasParameter == 'string') {
            canvas = document.getElementById(canvasParameter);
        } else if (canvasParameter) {
            canvas = canvasParameter;
        }

        if (!box3D) {
            console.error('box3DParameter not found');

            return;
        }

        if (!canvas) {
            console.error('canvasParameter not found');

            return;
        }

        const width = box3D.clientWidth;
        const height = box3D.clientHeight;
        // const width = 512;
        // const height = 512;

        threeConstants.scene = new THREE.Scene();

        // threeConstants.groupOpaque = new THREE.Group();
        // threeConstants.groupTransparent = new THREE.Group();
        // threeConstants.scene.add(threeConstants.groupOpaque, threeConstants.groupTransparent);

        threeConstants.camera = new THREE.PerspectiveCamera(75, width / height, 0.05, 100);

        threeConstants.camera.position.set(5, 30, 5); // Đặt camera ở vị trí (0, 0, 5) để nhìn vào trung tâm
        threeConstants.camera.lookAt(0, 0, 0);

        threeConstants.camera.near = 0.01;                  // Cho phép zoom rất sát
        threeConstants.camera.updateProjectionMatrix();     // Cập nhật lại camera

        // const light = new THREE.HemisphereLight(0xffffff, 0x444444);
        // threeConstants.scene.add(light);

        // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        // directionalLight.position.set(1, 1, 1);
        // threeConstants.scene.add(directionalLight);

        // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        // threeConstants.scene.add(ambientLight);

        // camera.position.z = 5;

        // if (isMobile()) {
        //     threeConstants.webGLRenderer = new THREE.WebGLRenderer({
        //         canvas,
        //         antialias: false, // ❌ Tắt khử răng cưa để tiết kiệm hiệu năng
        //         preserveDrawingBuffer: false, // ❌ Không cần giữ buffer nếu không chụp ảnh từ canvas
        //         precision: "mediump", // 🔽 Giảm độ chính xác xuống mức trung bình
        //         logarithmicDepthBuffer: false, // ❌ Tắt logarithmic depth để giảm tính toán độ sâu
        //         outputEncoding: THREE.LinearEncoding, // 🔽 Linear rẻ hơn sRGB
        //         toneMapping: THREE.NoToneMapping, // ✅ Giữ nguyên nếu không cần tone
        //         powerPreference: "low-power", // 🔽 Ưu tiên hiệu năng thấp, tiết kiệm pin
        //         depth: true // ✅ Giữ lại depth buffer nếu cần vật thể chồng lớp

        //         // antialias: false,                // ❌ Không khử răng cưa
        //         // alpha: false,                    // ❌ Không cần trong suốt => giảm hiệu năng
        //         // preserveDrawingBuffer: false,   // ❌ Không giữ buffer
        //         // precision: "lowp",              // 🔽 Thấp hơn "mediump" (tùy thiết bị hỗ trợ)
        //         // logarithmicDepthBuffer: false,  // ❌ Không cần tính toán log depth
        //         // outputEncoding: THREE.LinearEncoding, // 🔽 Rẻ nhất
        //         // toneMapping: THREE.NoToneMapping,     // ❌ Không cần tone mapping
        //         // powerPreference: "low-power",         // 🔽 Ưu tiên tiết kiệm pin
        //         // depth: false,                   // ❌ Nếu không có vật thể chồng lớp (sẽ render nhanh hơn)
        //         // stencil: false                  // ❌ Tắt stencil buffer nếu không cần
        //     });
        // } else {
        //     threeConstants.webGLRenderer = new THREE.WebGLRenderer({
        //         canvas,
        //         antialias: true,  // Antialiasing để làm mượt các cạnh
        //         preserveDrawingBuffer: true, // Giữ lại buffer khi render (sử dụng khi cần lấy ảnh từ canvas)
        //         precision: "highp", // Độ chính xác cao (high precision)
        //         logarithmicDepthBuffer: true, // Dùng logarithmic depth buffer cho độ sâu chính xác
        //         outputEncoding: THREE.sRGBEncoding, // Chuyển đổi màu sắc theo chuẩn sRGB
        //         toneMapping: THREE.NoToneMapping, // Nếu không muốn mờ
        //         powerPreference: "high-performance", // Đảm bảo renderer sử dụng GPU mạnh
        //         depth: true // Bật depth buffer
        //     });
        // }

        threeConstants.webGLRenderer = new THREE.WebGLRenderer({
            // canvas,
            // // context: isMobile() ? canvas.getContext('webgl1') : canvas.getContext('webgl2'),
            // antialias: isMobile() ? false : true,  // Antialiasing để làm mượt các cạnh
            // preserveDrawingBuffer: false, // Giữ lại buffer khi render (sử dụng khi cần lấy ảnh từ canvas)
            // precision: isMobile() ? "mediump" : "highp", // Độ chính xác cao (high precision)
            // logarithmicDepthBuffer: isMobile() ? false : true, // Dùng logarithmic depth buffer cho độ sâu chính xác
            // outputEncoding: THREE.sRGBEncoding, // Chuyển đổi màu sắc theo chuẩn sRGB
            // // toneMapping: THREE.ACESFilmicToneMapping, // Nếu không muốn mờ
            // powerPreference: "high-performance", // Đảm bảo renderer sử dụng GPU mạnh
            // depth: true, // Bật depth buffer
            // alpha: false,
            // stencil: false,
            canvas,
            antialias: !isMobile() && !isMac(),
            alpha: true,
            preserveDrawingBuffer: false,
            precision: isMobile() ? "mediump" : "highp",
            logarithmicDepthBuffer: !isMobile(),
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            depth: true,
            // stencil: false,
            powerPreference: isMobile() ? "low-power" : "high-performance",
            // context: canvas.getContext('webgl2', { antialias: !isMobile() })
        });

        // NEW: Để THREE.js tự chọn mipmap tốt nhất
        threeConstants.webGLRenderer.useLegacyLights = false;
        threeConstants.webGLRenderer.physicallyCorrectLights = true;

        // Sau khi đã có threeConstants.webGLRenderer
        //threeConstants.webGLRenderer.toneMapping = THREE.NoToneMapping; // nhẹ hơn ACES
        threeConstants.webGLRenderer.outputColorSpace = THREE.SRGBColorSpace; // NEW (r0.152+ khuyến nghị)

        threeConstants.webGLRenderer.toneMapping = THREE.ACESFilmicToneMapping;

        threeConstants.webGLRenderer.shadowMap.enabled = isMobile() ? false : true;
        threeConstants.webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // mịn
        threeConstants.webGLRenderer.sortObjects = true;

        // if (threeConstants.webGLRenderer.shadowMap.enabled) {
        //     threeConstants.webGLRenderer.shadowMap.mapSize.width = SHADOW_MAP_SIZE;
        //     threeConstants.webGLRenderer.shadowMap.mapSize.height = SHADOW_MAP_SIZE;
        // }

        // threeConstants.webGLRenderer.setSize(width, height, false);

        threeConstants.webGLRenderer.setSize(width, height);

        threeConstants.webGLRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

        // PMREM để lọc env map dùng cho PBR
        threeConstants.pmrem = new THREE.PMREMGenerator(threeConstants.webGLRenderer); // NEW
        threeConstants.pmrem.compileEquirectangularShader(); // NEW

        renderOnce();

        let loading3D = null;

        if (typeof loading3DParameter == 'string') {
            loading3D = document.getElementById(loading3DParameter);
            loading3D.style.display = 'block';
        } else if (loading3DParameter) {
            loading3D = loading3DParameter;
            loading3D.style.display = 'block';
        }

        // 1) Gán fallback ngay lập tức (không chờ)
        applyEnvPreset('room', { showAsBackground: false, intensity: threeConstants.envIntensity, blur: 0.0 }); // NEW: fallback

        threeConstants.envToken = (threeConstants.envToken || 0) + 1;
        const myToken = threeConstants.envToken;

        Promise.all([loadGLB(url, loading3DProcessBarParameter, loading3DValueParameter)]).then((result1, result2) => {
            threeConstants.scene.add(threeConstants.model);

            // threeConstants.model.traverse(o => {
            //     if (!o.isMesh || !o.material) return;

            //     const m = o.material;
            //     const isBlend = m.transparent || m.alphaTest > 0 || m.alphaMode === 'BLEND';

            //     m.side = THREE.FrontSide;     // chỉ vẽ mặt trước
            //     if (isBlend) {
            //         m.depthWrite = false;
            //         m.depthTest = true;
            //         threeConstants.groupTransparent.add(o);
            //     } else {
            //         threeConstants.groupOpaque.add(o);
            //     }

            //     // Texture: giảm anisotropy, không gen mip (KTX2 có sẵn mip)
            //     ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'emissiveMap', 'aoMap'].forEach(k => {
            //         const t = m[k];
            //         if (t) { t.anisotropy = Math.min(t.anisotropy || 1, 2); t.generateMipmaps = false; t.needsUpdate = true; }
            //     });

            //     o.castShadow = o.receiveShadow = false;
            // });

            threeConstants.webGLRenderer.compile(threeConstants.scene, threeConstants.camera);

            renderOnce();

            setTimeout(() => {
                const info = threeConstants.webGLRenderer.info;

                // Ước lượng triangles riêng model (khá gần với render)
                let tris = 0, meshes = 0, transparentMats = 0;
                threeConstants.model.traverse(o => {
                    if (o.isMesh) {
                        meshes++;
                        const g = o.geometry;
                        const pos = g.attributes.position;
                        const idx = g.index;
                        const tri = idx ? idx.count / 3 : pos.count / 3;
                        tris += tri;
                        const m = o.material;
                        if (Array.isArray(m)) {
                            m.forEach(mm => { if (mm?.transparent || mm?.alphaTest > 0) transparentMats++; });
                        } else if (m) {
                            if (m.transparent || m.alphaTest > 0) transparentMats++;
                        }
                    }
                });
            }, 50);

            if (typeof loading3DParameter == 'string') {
                loading3D = document.getElementById(loading3DParameter);
                loading3D.style.display = 'none';
            } else if (loading3DParameter) {
                loading3D = loading3DParameter;
                loading3D.style.display = 'none';
            }

            threeConstants.isInit3D = false;

            // // Cách A: dùng HDRI file (bạn để file vào /assets/hdr/venice_sunset_1k.hdr chẳng hạn)
            // setEnvironmentHDRI('/assets/3ds/hdr/venice_sunset_1k.hdr', {
            //     showAsBackground: false, // true nếu muốn thấy nền HDRI
            //     intensity: 1.2,          // cường độ ánh sáng môi trường
            //     blur: 0.3                // mờ nền nếu showAsBackground=true
            // }).then(() => {
            //     // Chỉ áp dụng nếu đây là request mới nhất
            //     if (myToken !== threeConstants._envToken) {
            //         return;
            //     }

            //     fadeEnvIntensity(threeConstants.scene, threeConstants.model, 0.0, 1.2, 250);
            // }).catch(err => {
            //     console.warn('HDRI load failed, fallback RoomEnvironment', err);
            // });

            resolve(true);
        }).catch(err => {
            console.log(err);
        });

        //threeConstants.scene.rotation.set(0, 0, 0);

        threeConstants.controls = new OrbitControls(threeConstants.camera, threeConstants.webGLRenderer.domElement);
        threeConstants.controls.enableDamping = true;   // bật quán tính để mượt
        threeConstants.controls.dampingFactor = 0.08;   // 0.05–0.15
        threeConstants.controls.enablePan = true;   // cho phép kéo tự do
        threeConstants.controls.enableZoom = true;  // cho zoom thoải mái
        threeConstants.controls.screenSpacePanning = true;

        if (isMobile() || isMac()) {
            threeConstants.controls.zoomSpeed = 0.3;       // mặc định = 1 → giảm xuống cho đỡ gắt
        } else {
            threeConstants.controls.zoomSpeed = 1.2;       // mặc định = 1 → giảm xuống cho đỡ gắt
        }

        threeConstants.controls.minDistance = 0;        // giới hạn gần (tùy scale cảnh)
        threeConstants.controls.maxDistance = isMobile() ? 100000000 : 100000000;       // giới hạn xa (tùy scale cảnh)
        // threeConstants.controls.maxDistance = 0.8 * threeConstants.camera.far; // ≈ 4000
        threeConstants.controls.zoomToCursor = true; // hoặc dollyToCursor ở vài bản
        if ('zoomToCursor' in threeConstants.controls) {
            threeConstants.controls.zoomToCursor = true;
        } else if ('dollyToCursor' in threeConstants.controls) {
            threeConstants.controls.dollyToCursor = true;
        }

        threeConstants.controls.dollyIn = function (dollyScale) {
            this.scale /= dollyScale;
        };
        threeConstants.controls.dollyOut = function (dollyScale) {
            this.scale *= dollyScale;
        };

        // threeConstants.camera.up.set(0, 1, 0);

        //threeConstants.controls.reset();
        //threeConstants.controls.target.set(0, 0, 0);
        threeConstants.controls.update();

        function animate() {
            try {
                threeConstants.requestId = requestAnimationFrame(animate);

                if (threeConstants.controls) {
                    threeConstants.controls.update();
                }

                if (threeConstants.webGLRenderer) {
                    threeConstants.webGLRenderer.render(threeConstants.scene, threeConstants.camera);
                }
            } catch (e) {
                applyEnvPreset('room', { showAsBackground: false, intensity: threeConstants.envIntensity, blur: 0.0 }); // NEW: fallback
            }
        }

        animate();

        renderOnce();

        window.addEventListener('resize', () => {
            let box3D = null;

            if (typeof box3DParameter == 'string') {
                box3D = document.getElementById(box3DParameter);
            } else if (box3DParameter) {
                box3D = box3DParameter;
            }

            if (box3D) {
                const width = box3D.clientWidth;
                const height = box3D.clientHeight;
                //const width = 512;
                //const height = 512;
                const devicePixelRatio = window.devicePixelRatio;

                if (threeConstants.camera) {
                    threeConstants.camera.aspect = width / height;
                    threeConstants.camera.updateProjectionMatrix();
                }

                if (threeConstants.webGLRenderer) {
                    threeConstants.webGLRenderer.setSize(width, height);
                    threeConstants.webGLRenderer.setPixelRatio(devicePixelRatio);

                    renderOnce();
                }
            }
        });

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();

        const pivotTex = new THREE.TextureLoader().load('/icons/dry-clean.png');

        pivotTex.needsUpdate = true;

        const pivotMat = new THREE.SpriteMaterial({ map: pivotTex, depthTest: false, depthWrite: false, transparent: true });
        threeConstants.pivotSprite = new THREE.Sprite(pivotMat);
        threeConstants.pivotSprite.scale.set(2, 2, 2); // world units; đủ nhỏ để không che
        threeConstants.pivotSprite.visible = false;
        threeConstants.scene.add(threeConstants.pivotSprite);

        // Track if user is dragging vs clicking
        let downPosition = { x: 0, y: 0 };
        let isDragging = false;

        // For clean unbinding later
        threeConstants.pickAbort = new AbortController();
        const { signal } = threeConstants.pickAbort;

        let animatingPivot = false;                 // NEW
        let animStartT = 0;                         // NEW
        const ANIM_DURATION = 0.25;                 // NEW (giây, tăng nếu muốn chậm hơn)
        let startTarget, startPos, endTarget, endPos; // NEW

        function cancelPivotAnim() {                // NEW
            if (animatingPivot) {
                animatingPivot = false;
            }
        }

        // --- NEW: state for smooth animation ---
        // const desiredTarget = threeConstants.controls.target.clone();
        // const desiredOffset = threeConstants.camera.position.clone().sub(threeConstants.controls.target);

        // Record pointer down position to detect drag distance
        canvas.addEventListener('pointerdown', (e) => {
            downPosition.x = e.clientX;
            downPosition.y = e.clientY;
            isDragging = false;
            cancelPivotAnim();
        }, { signal });

        // NEW: nếu user lăn bánh xe hay chạm (mobile) thì dừng tween
        canvas.addEventListener('wheel', cancelPivotAnim, { signal, passive: true });      // NEW
        canvas.addEventListener('touchstart', cancelPivotAnim, { signal, passive: true }); // NEW

        // If OrbitControls emits 'change' while pointer is down, treat as dragging
        // threeConstants.controls.addEventListener('change', () => {
        //     // Optional: mark dragging if moved far since pointerdown
        //     // Leave empty; we’ll decide on pointerup by distance
        //     renderOnce();
        // }, { signal });

        // Handle pointer up as a "click" if movement is tiny
        canvas.addEventListener('pointerup', (e) => {
            const dx = e.clientX - downPosition.x;
            const dy = e.clientY - downPosition.y;

            const movedPx = Math.hypot(dx, dy);

            // Treat as click if tiny move (adjust 3~6 px as you like)
            if (movedPx > 5) {
                return;
            }

            // Left button only
            if (e.button !== 0) {
                return;
            }

            if (typeof canvasParameter == 'string') {
                canvas = document.getElementById(canvasParameter);
            } else if (canvasParameter) {
                canvas = canvasParameter;
            }

            if (!canvas) {
                return;
            }

            // NDC
            const gboundingClientRect = canvas.getBoundingClientRect();

            ndc.x = ((e.clientX - gboundingClientRect.left) / gboundingClientRect.width) * 2 - 1;
            ndc.y = -((e.clientY - gboundingClientRect.top) / gboundingClientRect.height) * 2 + 1;

            // Raycast
            raycaster.setFromCamera(ndc, threeConstants.camera);

            const hits = raycaster.intersectObject(threeConstants.model, true)

            if (!hits.length) {
                return;
            }

            // NEW: offset pivot một chút theo normal để tránh trùng mặt (z-fighting)
            const h = hits[0];                                                             // NEW
            const hit = h.point.clone();                                                   // NEW
            if (h.face && h.object) {                                                      // NEW
                const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);    // NEW
                hit.add(n.multiplyScalar(0.01));                                             // NEW
            }

            // 1) Move marker to hit
            threeConstants.pivotSprite.position.copy(hit);
            threeConstants.pivotSprite.visible = true;

            // 2) Change pivot (controls.target) WITHOUT moving the camera
            const ctrl = threeConstants.controls;
            const cam = threeConstants.camera;
            // const offset = cam.position.clone().sub(ctrl.target); // keep camera offset
            // ctrl.target.copy(hit);
            // cam.position.copy(hit).add(offset); // keep view stable (no jump)
            // ctrl.update();

            // (Optional) Remember this as new home
            // ctrl.saveState();

            // desiredTarget.copy(hit);
            // threeConstants.desiredOffset = cam.position.clone().sub(ctrl.target);

            startTarget = ctrl.target.clone();           // NEW
            startPos = cam.position.clone();          // NEW
            endTarget = hit.clone();                   // NEW

            // Giữ nguyên offset hiện tại giữa camera & target (để góc nhìn ổn định)
            const offset = cam.position.clone().sub(ctrl.target); // NEW
            endPos = hit.clone().add(offset);       // NEW

            animStartT = performance.now();          // NEW
            animatingPivot = true;                       // NEW
        }, { signal, passive: true });

        // Keep marker facing camera (sprite already does billboard), but
        // make it scale a bit with distance so it’s not too big up close.
        (function autoScalePivot() {
            requestAnimationFrame(autoScalePivot);
            if (threeConstants.pivotSprite && !threeConstants.pivotSprite.visible) {
                return;
            }

            try {
                const cam = threeConstants.camera;
                const dist = cam.position.distanceTo(threeConstants.pivotSprite.position);

                // World height tại khoảng cách dist
                const fov = cam.fov * Math.PI / 180;
                const viewHeight = 2 * Math.tan(fov / 2) * dist;

                if (typeof canvasParameter == 'string') {
                    canvas = document.getElementById(canvasParameter);
                } else if (canvasParameter) {
                    canvas = canvasParameter;
                }

                if (canvas) {
                    // Muốn sprite cao ~ N pixel trên màn hình
                    const desiredPx = 24; // chỉnh 24–48 tuỳ mắt
                    const hWorld = viewHeight * (desiredPx / canvas.clientHeight);

                    threeConstants.pivotSprite.scale.set(hWorld, hWorld, 1);   // <-- dùng hWorld, bỏ 3.5 cố định
                }
            } catch (e) { }
        })();

        // --- NEW: smooth camera + target animation ---
        (function pivotTweenLoop() {
            requestAnimationFrame(pivotTweenLoop);

            if (!animatingPivot) {
                return;
            }

            const now = performance.now();
            let t = (now - animStartT) / (ANIM_DURATION * 1000);
            if (t > 1) t = 1;

            // easeOutCubic
            const e = 1 - Math.pow(1 - t, 3);

            const ctrl = threeConstants.controls;
            const cam = threeConstants.camera;

            if (!ctrl || !cam) return; // FIX: tránh crash khi destroy3D() giữa chừng

            // Nội suy target & camera
            ctrl.target.lerpVectors(startTarget, endTarget, e);
            cam.position.lerpVectors(startPos, endPos, e);

            ctrl.update();

            if (t >= 1) {
                animatingPivot = false; // xong tween → trả quyền điều khiển lại cho OrbitControls
            }
        })();
    });
}

export {
    isMobile,
    init3D,
    loadGLB,
    updateSize3D,
    destroy3D,
    isLandscape,
    isPortrait,
    applyEnvPreset,
    setEnvIntensity,
    isLaptop,
    init3DRenderStreaming,
    applyEnvPresetRenderStreaming,
    setEnvIntensityRenderStreaming,
    destroy3DRenderStreaming,
    HDR_PRESETS
}