import RenderFileToken from '../controls/renderFileTokens/RenderFileToken'
import ImageAdvanced from '../Form/ImageAdvanced'


const AvatarWithFrame = ({
  avatarPath,
  PersonalFrames = [], // PNG khung cá nhân
  DepartmentFrames = [], // PNG khung phòng ban
  size = 180,
  avatarScale = 0.65, // avatar nhỏ hơn khi có khung
  avatarOffsetY = 0, // dịch avatar: + xuống, - lên
  deptScaleX = 1.2, // scale ngang khung phòng ban
  deptScaleY = 1.2, // scale dọc khung phòng ban
  personalScale = 1, // scale khung cá nhân
  frameDeptOffsetY = -8, // dịch khung phòng ban
  framePersonalOffsetY = 0, // dịch khung cá nhân
  defaultShape = 'circle', // 👈 khi không có khung: "circle" | "roundedSquare"
  altAvatar = null
}) => {
  if (!avatarPath) return null

  const hasFrames = PersonalFrames?.length > 0 || DepartmentFrames?.length > 0
  const avatarSize = hasFrames ? size * avatarScale : size

  // Map tới file SVG mask
  const maskShapes = {
    hexagon: '/hexagon-mask.svg',
    circle: '/circle-mask.svg',
    roundedSquare: '/rounded-square-mask.svg'
  }

  // Nếu có khung thì ép dùng hexagon, còn không thì theo defaultShape
  const activeMask = hasFrames ? maskShapes.hexagon : maskShapes[defaultShape]

  return (
    <div
      className='relative flex items-center justify-center overflow-visible'
      style={{ width: size, height: size }}
    >
      {/* Personal Frames */}
      {PersonalFrames?.length > 0 &&
        PersonalFrames.map((frame, idx) => (
          <img
            key={`personal-${idx}`}
            src={`${process.env.NEXT_PUBLIC_API_CLOUND_URL}${frame.PathAvatarFrame}`}
            alt='Personal Frame'
            className='absolute pointer-events-none'
            style={{
              width: size * personalScale,
              height: size * personalScale,
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translateY(${framePersonalOffsetY}px)`,
              zIndex: 10,
              objectFit: 'contain'
            }}
          />
        ))}

      {/* Avatar with mask */}
      <div
        className='absolute'
        style={{
          width: avatarSize,
          height: avatarSize,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${avatarOffsetY}px)`,
          WebkitMaskImage: `url(${activeMask})`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: 'cover',
          maskImage: `url(${activeMask})`,
          maskRepeat: 'no-repeat',
          maskSize: 'cover',
          zIndex: 5,
          overflow: 'hidden'
        }}
      >
        <RenderFileToken
          pathFile={avatarPath}
          isPrivate={false}
          key={avatarPath}
          Component={({ src }) => (
            <ImageAdvanced
              src={src || '/placeholder.svg'}
              alt={altAvatar || 'User Avatar'}
              width={avatarSize}
              height={avatarSize}
              className='object-cover object-center w-full h-full'
            />
          )}
        />
      </div>

      {/* Department Frames */}
      {DepartmentFrames?.length > 0 &&
        DepartmentFrames.map((frame, idx) => (
          <div
            key={`dept-${idx}`}
            className='absolute inset-0 flex items-center justify-center pointer-events-none'
            style={{ zIndex: 20 + idx }}
          >
            <img
              src={`${process.env.NEXT_PUBLIC_API_CLOUND_URL}${frame.PathAvatarFrame}`}
              alt='Department Frame'
              style={{
                width: size,
                height: size,
                objectFit: 'contain',
                transform: `translateY(${frameDeptOffsetY}px) scale(${deptScaleX}, ${deptScaleY})`
              }}
            />
          </div>
        ))}
    </div>
  )
}

export default AvatarWithFrame
