import React, { useCallback, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import BoxModel3D from './BoxModel3D';
import AutoLight3D from './AutoLight3D';
import AutoFitCamera3D from './AutoFitCamera3D';
import LoadingModel3D from './LoadingModel3D';

const Model3D = ({ url, onLoaded }) => {
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const onIsSetModelLoaded = useCallback(() => {

        setIsModelLoaded(true);

        if (onLoaded) {
            onLoaded();
        }
    }, []);

    return (
        <Canvas style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
        }}>
            <AutoLight3D isModelLoaded={isModelLoaded} url={url}>
                <AutoFitCamera3D url={url}>
                    <Suspense fallback={<LoadingModel3D />}>
                        <BoxModel3D url={url} onLoaded={onIsSetModelLoaded} />
                    </Suspense>
                </AutoFitCamera3D>
            </AutoLight3D>
        </Canvas>
    )
}

export default React.memo(Model3D);