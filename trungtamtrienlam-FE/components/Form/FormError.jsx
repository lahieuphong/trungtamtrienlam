/**
 * Component FormError để hiển thị thông báo lỗi
 * @param {Object} props - Props của component
 * @param {string} props.message - Thông báo lỗi
 * @param {string} props.className - Class CSS bổ sung
 */
export default function FormError({ message, className = "" }) {
  if (!message) return null

  return <p className={`mt-1 text-sm text-red-600 ${className}`}>{message}</p>
}
