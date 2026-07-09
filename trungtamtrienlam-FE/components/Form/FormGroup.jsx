/**
 * Component FormGroup để bao bọc các trường form với label
 * @param {Object} props - Props của component
 * @param {string} props.label - Nhãn của trường form
 * @param {boolean} props.required - Trường form có bắt buộc hay không
 * @param {string} props.htmlFor - ID của trường form
 * @param {React.ReactNode} props.children - Nội dung bên trong
 * @param {string} props.className - Class CSS bổ sung
 * @param {string} props.labelClassName - Class CSS bổ sung cho label
 * @param {string} props.description - Mô tả cho trường form
 */
export default function FormGroup({
  label,
  required = false,
  htmlFor,
  children,
  className = "",
  labelClassName = "",
  description = "",
  style = {}
}) {
  return (
    <div className={`mb-4 ${className}`} style={style}>
      {label && (
        <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  )
}
