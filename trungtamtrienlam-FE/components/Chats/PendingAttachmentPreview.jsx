import {
  Cuboid,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Presentation,
  X
} from 'lucide-react'

const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
  'heic',
  'heif',
  'apng',
  'jfif',
  'tif',
  'tiff',
  'arw',
  'dng'
]

const VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'wmv',
  'flv',
  'm4v',
  'mpeg',
  'mpg'
]

const AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'flac',
  'wma',
  'opus'
]

const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx', 'csv', 'ods', 'numbers']
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'odt', 'rtf', 'pages']
const PRESENTATION_EXTENSIONS = ['ppt', 'pptx', 'odp', 'key']
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
const MODEL_3D_EXTENSIONS = [
  'glb',
  'gltf',
  'obj',
  'fbx',
  'stl',
  'ply',
  'dae',
  'usdz',
  '3ds',
  'blend'
]
const CODE_EXTENSIONS = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'html',
  'css',
  'scss',
  'py',
  'cs',
  'java',
  'php',
  'go',
  'sql',
  'xml',
  'yml',
  'yaml',
  'md',
  'txt'
]

const getFileName = file =>
  String(file?.name || file?.FileName || file?.fileName || 'Tệp đính kèm')

const getFileExtension = file => {
  const name = getFileName(file)
  const extension = name.includes('.') ? name.split('.').pop() : ''

  if (extension) return extension.toUpperCase()
  if (file?.type) return String(file.type).split('/').pop()?.toUpperCase() || 'FILE'

  return 'FILE'
}

const hasExtension = (extension, extensions) => extensions.includes(extension)

const getFileVisual = file => {
  const extension = getFileExtension(file).toLowerCase()
  const type = String(file?.type || '').toLowerCase()

  if (type.startsWith('image/') || hasExtension(extension, IMAGE_EXTENSIONS)) {
    return { Icon: FileImage, className: 'bg-emerald-500 text-white' }
  }

  if (type.startsWith('video/') || hasExtension(extension, VIDEO_EXTENSIONS)) {
    return { Icon: FileVideo, className: 'bg-violet-500 text-white' }
  }

  if (type.startsWith('audio/') || hasExtension(extension, AUDIO_EXTENSIONS)) {
    return { Icon: FileAudio, className: 'bg-fuchsia-500 text-white' }
  }

  if (hasExtension(extension, SPREADSHEET_EXTENSIONS)) {
    return { Icon: FileSpreadsheet, className: 'bg-green-600 text-white' }
  }

  if (hasExtension(extension, MODEL_3D_EXTENSIONS)) {
    return { Icon: Cuboid, className: 'bg-cyan-600 text-white' }
  }

  if (hasExtension(extension, ARCHIVE_EXTENSIONS)) {
    return { Icon: FileArchive, className: 'bg-amber-500 text-white' }
  }

  if (hasExtension(extension, DOCUMENT_EXTENSIONS)) {
    return { Icon: FileType, className: 'bg-blue-600 text-white' }
  }

  if (hasExtension(extension, PRESENTATION_EXTENSIONS)) {
    return { Icon: Presentation, className: 'bg-orange-500 text-white' }
  }

  if (extension === 'pdf') {
    return { Icon: FileText, className: 'bg-red-500 text-white' }
  }

  if (extension === 'json') {
    return { Icon: FileJson, className: 'bg-yellow-500 text-white' }
  }

  if (hasExtension(extension, CODE_EXTENSIONS)) {
    return { Icon: FileCode, className: 'bg-sky-600 text-white' }
  }

  return { Icon: File, className: 'bg-slate-500 text-white' }
}

const PendingAttachmentPreview = ({
  files = [],
  onRemoveFile,
  compact = false
}) => {
  if (!files.length) return null

  const maxWidthClass = compact ? 'max-w-[220px]' : 'max-w-[260px]'

  return (
    <div className='mb-2 flex flex-wrap gap-2'>
      {files.map((file, index) => {
        const fileName = getFileName(file)
        const extension = getFileExtension(file)
        const { Icon, className } = getFileVisual(file)

        return (
          <div
            key={`${fileName}-${index}`}
            className={`group relative flex min-w-0 ${maxWidthClass} items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 pr-7 shadow-sm`}
            title={fileName}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${className}`}
            >
              <Icon size={16} strokeWidth={2.2} />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium leading-4 text-gray-900'>
                {fileName}
              </div>
              <div className='mt-0.5 text-[11px] font-semibold uppercase leading-3 text-gray-500'>
                {extension}
              </div>
            </div>

            <button
              type='button'
              onClick={() => onRemoveFile?.(index)}
              className='absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 hover:text-gray-900'
              aria-label={`Gỡ tệp ${fileName}`}
              title='Gỡ tệp'
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default PendingAttachmentPreview