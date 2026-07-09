import { Image, Video, Music, Boxes, FileText, FileArchive } from 'lucide-react';

import { FileHelpers } from "../helpers/fileHelpers";

class FileUtils {
    static renderIconFile(fileName) {
        if (FileHelpers.checkValidFileImage(fileName)) {
            return <Image size={30} />;
        }

        if (FileHelpers.checkValidFileVideo(fileName)) {
            return <Video size={30} />;
        }

        if (FileHelpers.checkValidFileAudio(fileName)) {
            return <Music size={30} />;
        }

        if (FileHelpers.checkValidFileDocument(fileName)) {
            return <FileText size={30} />;
        }

        if (FileHelpers.checkValidFile3D(fileName)) {
            return <Boxes size={30} />;
        }

        if (FileHelpers.checkValidFileZip(fileName)) {
            return (
                <div className="w-10 h-10 rounded-md flex items-center justify-center">
                    <FileArchive size={30} className="text-gray-600" />
                </div>
            );
        }

        return <FileText size={30} />;
    }

    static renderImageFile(fileName, props) {
        if (FileHelpers.checkValidFileAudio(fileName)) {
            return <img className="w-14 h-14" src='/images/icons/audio.svg' {...props} />;
        }

        if (FileHelpers.checkValidFileImage(fileName)) {
            return <img className="w-14 h-14" src='/images/icons/png.svg' {...props} />;
        }

        if (FileHelpers.checkValidFileVideo(fileName)) {
            return <img className="w-14 h-14" src='/images/icons/mp4.svg' {...props} />;
        }

        if (FileHelpers.checkValidFileDocument(fileName)) {
            return <img className="w-14 h-14" src='/images/icons/doc.svg' {...props} />;
        }

        return <img className="w-14 h-14" src='/images/icons/doc.svg' {...props} />;
    }
}

export default FileUtils;