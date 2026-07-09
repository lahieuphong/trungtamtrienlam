import React from 'react';
import { useProgress } from "@react-three/drei";

const LoadingModel3D = () => {
    const { progress, loaded, total, active } = useProgress();

    return (
        <div className="bg-[blue]">
            <p className=''>Loading...</p>
            <progress className='' value={progress} max={100} />
        </div>
    );
}

export default React.memo(LoadingModel3D);