import React from 'react';

const SIZES = {
  sm: { width: 9, height: 5, thumb: 5 },   // w-8 h-4 thumb w-4 h-4
  md: { width: 10, height: 6, thumb: 6 },  // w-10 h-6 thumb w-6 h-6 (default)
  lg: { width: 14, height: 8, thumb: 8 },  // w-14 h-8 thumb w-8 h-8
};

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label = '',
  className = '',
  size = "md",
  ...props
}) {
  // Lấy size object
  const sz = typeof size === "string" ? SIZES[size] : size;
  // Tạo class Tailwind động
  const trackClass = `w-${sz.width} h-${sz.height}`;
  const thumbClass = `w-${sz.thumb} h-${sz.thumb}`;
  const transX = sz.width - sz.thumb; // px dịch phải khi ON

  const [internalChecked, setInternalChecked] = React.useState(!!checked);

  React.useEffect(() => {
    if (checked !== undefined) setInternalChecked(!!checked);
  }, [checked]);

  const handleToggle = (e) => {
    if (disabled) return;
    const newChecked = !(checked ?? internalChecked);
    if (onChange) onChange(newChecked, e);
    if (checked === undefined) setInternalChecked(newChecked);
  };

  const isChecked = checked !== undefined ? checked : internalChecked;

  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleToggle}
          className="sr-only"
          disabled={disabled}
          {...props}
        />
        {/* Track */}
        <span
          className={`
            block rounded-full transition-colors duration-200
            ${trackClass}
            ${isChecked ? 'bg-green-500' : 'bg-gray-300'}
          `}
        />
        {/* Thumb */}
        <span
          className={`
            absolute top-0 left-0 rounded-full transition-transform duration-200 shadow
            border-2 bg-white
            ${thumbClass}
            ${isChecked
              ? `border-green-500`
              : `border-gray-300`}
          `}
          style={{
            transform: isChecked
              ? `translateX(${transX * 0.25}rem)` // Tailwind 1 unit = 0.25rem
              : `translateX(0)`,
          }}
        />
      </span>
      {label && <span className="text-base">{label}</span>}
    </label>
  );
}
