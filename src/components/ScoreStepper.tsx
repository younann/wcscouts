'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  max?: number;
}

export function ScoreStepper({ value, onChange, disabled, max = 20 }: Props) {
  return (
    <div className="flex items-center gap-3 select-none">
      <button
        type="button"
        className="stepper-btn disabled:opacity-40"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="decrease"
      >
        <Minus className="h-6 w-6" />
      </button>
      <span className="stepper-val">{value}</span>
      <button
        type="button"
        className="stepper-btn disabled:opacity-40"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="increase"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
