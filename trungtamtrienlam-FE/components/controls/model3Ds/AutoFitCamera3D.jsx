import React, { useEffect, useRef } from 'react';
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AutoFitCamera3D = ({ children, url, angleDeg = 45, distanceZoom = 0.8 }) => {
    const controlsRef = useRef();
    const { camera, gl } = useThree();
    const { scene } = useGLTF(url);

    // useEffect(() => {
    //     // 1. Lấy bounding box model
    //     const box = new THREE.Box3().setFromObject(scene);
    //     const size = box.getSize(new THREE.Vector3());
    //     const center = box.getCenter(new THREE.Vector3());

    //     // 2. Tính khoảng cách camera sao cho vừa model (fit width/height)
    //     const fov = camera.fov * (Math.PI / 180);
    //     const aspect = gl.domElement.width / gl.domElement.height;
    //     const halfWidth = size.x / 2;
    //     const halfHeight = size.y / 2;
    //     const halfDepth = size.z / 2;

    //     // Fit chiều rộng/ngang
    //     const fovX = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    //     const distanceX = halfWidth / Math.tan(fovX / 2);
    //     // Fit chiều cao
    //     const distanceY = halfHeight / Math.tan(fov / 2);

    //     let distance = Math.max(distanceX, distanceY, halfDepth * 2.5);
    //     distance *= distanceZoom; // +10% margin

    //     // 3. Đặt camera theo góc nghiêng angleDeg, ở phía trước mặt model (trục -Y, Z lên)
    //     const theta = angleDeg * Math.PI / 180;
    //     const camY = center.y + Math.cos(theta) * distance;
    //     const camZ = center.z + Math.sin(theta) * distance;

    //     camera.position.set(center.x, camY, camZ);
    //     camera.lookAt(center);

    //     // 4. Set target cho OrbitControls về tâm model
    //     if (controlsRef.current) {
    //         controlsRef.current.target.copy(center);
    //         controlsRef.current.update();
    //     }
    //     // eslint-disable-next-line
    // }, [scene, camera, gl, angleDeg, url, distanceZoom]);

    return (
        <>
            {children}
            <OrbitControls ref={controlsRef} makeDefault />
        </>
    );
}

export default React.memo(AutoFitCamera3D);