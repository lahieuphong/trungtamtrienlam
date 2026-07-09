import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import threeState from './3d_variable'; // 🔗 dùng state chung

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

function loadGLB(url, loading3DProcessBarParameter, loading3DValueParameter) {
    return new Promise(resolve => {
        const gLTFLoader = new GLTFLoader();

        gLTFLoader.load(url, function (gltf) {
            threeState.model = gltf.scene;

            threeState.model.rotation.set(0, 0, 0);

            threeState.model.scale.set(1, 1, 1);

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
        });
    });
}

function init3D(url, box3DParameter, canvasParameter, loading3DParameter, loading3DProcessBarParameter, loading3DValueParameter) {
    return new Promise(async resolve => {
        if (threeState.isInit3D) {
            return;
        }

        threeState.isInit3D = true;

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

        threeState.scene = new THREE.Scene();

        threeState.scene.background = new THREE.Color(0xffffff);

        threeState.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

        threeState.camera.position.set(0, 0, 5); // Đặt camera ở vị trí (0, 0, 5) để nhìn vào trung tâm
        threeState.camera.lookAt(0, 0, 0);

        const light = new THREE.HemisphereLight(0xffffff, 0x444444);
        threeState.scene.add(light);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 10, 5);
        threeState.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        threeState.scene.add(ambientLight);

        // camera.position.z = 5;

        // if (isMobile()) {
        //     threeState.webGLRenderer = new THREE.WebGLRenderer({
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
        //     threeState.webGLRenderer = new THREE.WebGLRenderer({
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

        threeState.webGLRenderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false, // ❌ Tắt khử răng cưa để tiết kiệm hiệu năng
            preserveDrawingBuffer: false, // ❌ Không cần giữ buffer nếu không chụp ảnh từ canvas
            precision: "mediump", // 🔽 Giảm độ chính xác xuống mức trung bình
            logarithmicDepthBuffer: false, // ❌ Tắt logarithmic depth để giảm tính toán độ sâu
            outputEncoding: THREE.LinearEncoding, // 🔽 Linear rẻ hơn sRGB
            toneMapping: THREE.NoToneMapping, // ✅ Giữ nguyên nếu không cần tone
            powerPreference: "low-power", // 🔽 Ưu tiên hiệu năng thấp, tiết kiệm pin
            depth: true // ✅ Giữ lại depth buffer nếu cần vật thể chồng lớp

            // antialias: false,                // ❌ Không khử răng cưa
            // alpha: false,                    // ❌ Không cần trong suốt => giảm hiệu năng
            // preserveDrawingBuffer: false,   // ❌ Không giữ buffer
            // precision: "lowp",              // 🔽 Thấp hơn "mediump" (tùy thiết bị hỗ trợ)
            // logarithmicDepthBuffer: false,  // ❌ Không cần tính toán log depth
            // outputEncoding: THREE.LinearEncoding, // 🔽 Rẻ nhất
            // toneMapping: THREE.NoToneMapping,     // ❌ Không cần tone mapping
            // powerPreference: "low-power",         // 🔽 Ưu tiên tiết kiệm pin
            // depth: false,                   // ❌ Nếu không có vật thể chồng lớp (sẽ render nhanh hơn)
            // stencil: false                  // ❌ Tắt stencil buffer nếu không cần
        });

        threeState.webGLRenderer.shadowMap.enabled = true;
        threeState.webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // mịn

        threeState.webGLRenderer.setPixelRatio(window.devicePixelRatio);

        threeState.webGLRenderer.setSize(width, height);

        let loading3D = null;

        if (typeof loading3DParameter == 'string') {
            loading3D = document.getElementById(loading3DParameter);
            loading3D.style.display = 'block';
        } else if (loading3DParameter) {
            loading3D = loading3DParameter;
            loading3D.style.display = 'block';
        }

        Promise.all([loadGLB(url, loading3DProcessBarParameter, loading3DValueParameter)]).then((result1, result2) => {
            threeState.scene.add(threeState.model);

            if (typeof loading3DParameter == 'string') {
                loading3D = document.getElementById(loading3DParameter);
                loading3D.style.display = 'none';
            } else if (loading3DParameter) {
                loading3D = loading3DParameter;
                loading3D.style.display = 'none';
            }

            threeState.isInit3D = false;

            resolve(true);
        }).catch(err => {
            console.log(err);
        });

        threeState.scene.rotation.set(0, 0, 0);

        threeState.controls = new OrbitControls(threeState.camera, threeState.webGLRenderer.domElement);
        threeState.controls.minDistance = 0.2;
        threeState.controls.maxDistance = 1000;

        threeState.camera.up.set(0, 1, 0);

        threeState.controls.reset();
        threeState.controls.target.set(0, 0, 0);
        threeState.controls.update();

        function animate() {
            requestAnimationFrame(animate);

            threeState.controls.update();

            threeState.webGLRenderer.render(threeState.scene, threeState.camera);
        }

        animate();

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
                const devicePixelRatio = window.devicePixelRatio;

                threeState.camera.aspect = width / height;
                threeState.camera.updateProjectionMatrix();
                threeState.webGLRenderer.setSize(width, height);
                threeState.webGLRenderer.setPixelRatio(devicePixelRatio);
            }
        });
    });
}

export {
    init3D
}