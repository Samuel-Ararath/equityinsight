'use client'

import { cn } from '@/lib/utils'

type SliderProps = {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
}

// Native range slider styled with a gold-filled track that follows the value.
function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none',
        '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow',
        '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-gold',
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--gold) 0%, var(--gold) ${pct}%, var(--secondary) ${pct}%, var(--secondary) 100%)`,
      }}
    />
  )
}

export { Slider }
