import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

const maxAdjustCount = 20; // Số lần tối đa thử auto adjust

const AutoLight3D = ({ children, url, isModelLoaded }) => {
    let adjustCount = 0;
    
    const directionalLightRef = useRef();
    const [intensity, setIntensity] = useState(1.5);

    // Hàm auto check sáng
    const { gl, scene, camera } = useThree();

    // useEffect(() => {
    //     if (isModelLoaded) {
    //         let checkFrame = 0;

    //         function autoAdjustLight() {
    //             checkFrame++;
    //             adjustCount++;
    //             // render 1 frame để lấy pixel (bắt buộc)
    //             gl.render(scene, camera);

    //             // Lấy đúng context WebGL
    //             const webgl = gl.getContext && gl.getContext();

    //             if (!webgl || typeof webgl.readPixels !== 'function') {
    //                 // Không hỗ trợ, thoát!
    //                 return;
    //             }

    //             // Tạo render target, đọc pixel giữa màn hình
    //             const pixels = new Uint8Array(4);
    //             const x = Math.floor(gl.domElement.width / 2);
    //             const y = Math.floor(gl.domElement.height / 2);

    //             webgl.readPixels(
    //                 x,
    //                 y,
    //                 1, 1,
    //                 webgl.RGBA,
    //                 webgl.UNSIGNED_BYTE,
    //                 pixels

    //             );
    //             const avg = (pixels[0] + pixels[1] + pixels[2]) / 3;
    //             const targetBrightness = 50; // Giá trị sáng trung bình mong muốn (thường 100-140 là hợp lý)
    //             const margin = 10; // Độ chênh lệch cho phép
    //             const maxIntensity = 5;
    //             const minIntensity = 1;

    //             // Điều kiện dừng: số lần thử hoặc intensity đã max/min hoặc đã đạt mức sáng tốt
    //             if (
    //                 adjustCount > maxAdjustCount ||
    //                 (avg >= targetBrightness - margin && avg <= targetBrightness + margin) ||
    //                 (intensity >= maxIntensity && avg < targetBrightness - margin) ||
    //                 (intensity <= minIntensity && avg > targetBrightness + margin)
    //             ) {
    //                 // Đã đạt ngưỡng hoặc tới giới hạn, dừng
    //                 return;
    //             }

    //             // Nếu sáng trung bình < 80 → tăng sáng
    //             if (avg < targetBrightness - margin && intensity < maxIntensity) {
    //                 // Nếu tối quá, tăng sáng
    //                 setIntensity(i => i + 0.5);
    //                 setTimeout(autoAdjustLight, 80);
    //             } else if (avg > targetBrightness + margin && intensity > minIntensity) {
    //                 // Nếu sáng quá, giảm sáng
    //                 setIntensity(i => i - 0.5);
    //                 setTimeout(autoAdjustLight, 80);
    //             }
    //         }

    //         setTimeout(autoAdjustLight, 500); // đợi model load xong
    //         // eslint-disable-next-line
    //     }
    // }, [url, isModelLoaded, gl, scene, camera]);

    return (
        <>
            <directionalLight ref={directionalLightRef} intensity={intensity} position={[5, 10, 5]} />
            <ambientLight intensity={intensity * 0.7} />
            <Environment preset="sunset" />
            {children}
        </>
    );
}

export default React.memo(AutoLight3D);