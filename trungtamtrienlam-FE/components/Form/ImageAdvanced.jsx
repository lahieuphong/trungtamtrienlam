"use client"

import { forwardRef, useEffect, useState } from "react"
import Image from 'next/image';

/**
 * Component ImageAdvanced cơ bản
 * @param {Object} props - Props của component
 */
const ImageAdvanced = forwardRef(
    (
        {
            src,
            alt,
            width,
            height,
            noneImg = '/NoImage.png',
            type = 'default',
            className = '',
            classNameDiv = '',
            isDashedBorder = false,
            sizes,
            onError,
            ...imageProps
        },
        ref
    ) => {
        const fallbackSrc = type == 'avatar' ? '/default-avartar.jpg' : noneImg
        const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
        const isFill = !width || !height

        useEffect(() => {
            setImgSrc(src || fallbackSrc)
        }, [src, fallbackSrc])

        return (
            <div className={classNameDiv ? classNameDiv : "w-full flex items-center justify-center"}>
                <Image
                    {...imageProps}
                    ref={ref}
                    src={imgSrc}
                    alt={alt || ''}
                    width={isFill ? undefined : Number(width)}
                    height={isFill ? undefined : Number(height)}
                    fill={isFill}
                    // sizes={isFill ? (sizes || "100vw") : undefined}
                    title={alt}
                    onError={event => {
                        setImgSrc(fallbackSrc)
                        onError?.(event)
                    }}
                    // className={isDashedBorder ? "border-2 border-dashed border-gray-200" : className}
                    className={`${isDashedBorder ? 'border-2 border-dashed border-gray-200' : ''} ${className}  `}
                />
            </div>
        )
    },
)

ImageAdvanced.displayName = "Image"

export default ImageAdvanced