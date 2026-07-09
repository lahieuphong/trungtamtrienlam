import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';

const BoxModel3D = ({ url, onLoaded }) => {
    const { scene } = useGLTF(url); // Replace with your 3D model path
    const ref = useRef();

    useEffect(() => {
        if (onLoaded) {
            onLoaded();
        }
    }, [onLoaded, scene]);

    return <primitive ref={ref} object={scene} dispose={null} />;
}

export default React.memo(BoxModel3D);