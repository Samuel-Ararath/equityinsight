'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { formatRupiahShort, parseNumberInput } from '@/lib/format'

/** Plain text field for identity data. */
export function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Dropdown select field. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    </div>
  )
}

/**
 * Numeric field with its own string state (so users can type freely) that
 * reports a parsed number to the parent. Shows a live Rupiah preview when
 * `money` is set.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  money = false,
  suffix,
  tooltip,
  placeholder,
  optional = false,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  money?: boolean
  suffix?: string
  tooltip?: string
  placeholder?: string
  optional?: boolean
}) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '')

  // Keep local text in sync if the value is reset externally (e.g. cleared).
  useEffect(() => {
    if (!Number.isFinite(value)) {
      // External reset: local text parses to a number but the value was cleared.
      if (text !== '' && Number.isFinite(parseNumberInput(text))) setText('')
      return // otherwise let the user keep partial input
    }
    if (parseNumberInput(text) !== value) setText(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        <span className="flex items-center gap-1.5">
          {label}
          {optional && <span className="text-xs font-normal text-muted-foreground">(opsional)</span>}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
      </Label>
      <div className="relative">
        {money && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          placeholder={placeholder}
          value={text}
          className={money ? 'pl-9' : suffix ? 'pr-9' : undefined}
          onChange={(e) => {
            setText(e.target.value)
            onChange(parseNumberInput(e.target.value))
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {money && Number.isFinite(value) && (
        <span className="text-xs text-muted-foreground tabular-nums">{formatRupiahShort(value)}</span>
      )}
    </div>
  )
}
