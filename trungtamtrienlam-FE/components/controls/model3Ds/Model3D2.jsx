import { Maximize2Icon } from "lucide-react";
import { useEffect } from "react";

import { init3DRenderStreaming, destroy3DRenderStreaming } from "../../../public/js/modules/3d.js";
import threeConstants from "../../../public/js/constants/threeConstants.js";

let timeOutInit3D = null;

const Model3D2 = ({ id, url, classNameBox3D, canvasId, loadingId, loadingProcessBarId, loadingValueId }) => {
    useEffect(() => {
        timeOutInit3D = setTimeout(() => {
            requestAnimationFrame(() => {
                if (
                    document.getElementById(id)
                    && !threeConstants.isInit3D
                ) {
                    // init3DRenderStreaming(url, id, canvasId, loadingId, loadingProcessBarId, loadingValueId).then(() => {

                    // });

                    init3DRenderStreaming(url, canvasId);
                }

                if (timeOutInit3D) {
                    clearTimeout(timeOutInit3D);

                    timeOutInit3D = null;
                }
            });
        }, 500);

        return () => {
            destroy3DRenderStreaming();

            if (timeOutInit3D) {
                clearTimeout(timeOutInit3D);

                timeOutInit3D = null;
            }
        };
    }, []);

    return <div className="w-full h-full relative">
        <div className={`w-full h-full flex justify-center items-center ${classNameBox3D}`} id={id}>
            {/* <canvas id={canvasId}>

            </canvas> */}
            <video className="flex-1 w-full h-full" autoPlay playsInline muted id={canvasId} style={{
                touchAction: 'none',
                imageRendering: 'pixelated',
                objectFit: 'cover'
            }}>

            </video>
        </div>
        <div className="absolute z-[1] left-0 top-[50%] w-full text-center transform -translate-y-1/2 hidden" id={loadingId}>
            <div className="flex items-center justify-center">
                <span id={loadingValueId} className="text-xs text-[#1F1F1F]"></span>
                <span className="text-xs text-[#1F1F1F]">%</span>
            </div>
            <div className="w-full h-[5px] border border-1 border-[#E5E5E5] rounded-full">
                <div className="w-full h-full rounded-full bg-[#597EF7] -translate-x-full" id={loadingProcessBarId}>

                </div>
            </div>
        </div>
    </div>
}

export default Model3D2;