import React, { memo, useEffect, useState } from 'react'

import RenderFileTokenUtil from '../../../utils/renderFileTokenUtil'
import { useLoadAuthToken } from '@/contexts/AuthTokenContext'

const RenderFileTokenContent = memo(({ imageSrc, Component }) => {
  // console.log('RenderFileTokenContent');

  return <Component src={imageSrc} />
})

const RenderFileToken = ({
  pathFile,
  isPrivate,
  Component
}) => {
  const [imageSrc, setImageSrc] = useState(null)
  const { authToken } = useLoadAuthToken()

  useEffect(() => {
    // console.log('RenderFileTokenUtil.getPublicToken');
    let isActive = true

    if (!pathFile) {

      setImageSrc(null)
      
      return () => {
        isActive = false
      }
    }

    setImageSrc(null)

    RenderFileTokenUtil.getPublicToken().then(res => {
      if (!isActive) {
        return
      }

      if (res) {
        const newImageSrc = RenderFileTokenUtil.generateUrl(
          pathFile,
          encodeURIComponent(res),
          isPrivate
        )

        setImageSrc(newImageSrc)
      }
    }).catch(() => {
      if (isActive) {
        setImageSrc(null)
      }
    })

    return () => {
      isActive = false
    }
  }, [authToken, pathFile, isPrivate])

  if (!imageSrc) {
    return null
  }

  return (
    <RenderFileTokenContent imageSrc={imageSrc} Component={Component} />
  )
}

export default RenderFileToken
