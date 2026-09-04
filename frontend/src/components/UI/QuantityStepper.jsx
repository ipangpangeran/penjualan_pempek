import React from 'react';
import { Minus, Plus } from 'lucide-react';

const QuantityStepper = ({
  value,
  onChange,
  min = 1,
  max = 9999,
  className = '',
  size = 'md',
}) => {
  const currentVal = parseInt(value) || min;

  const handleDecrease = (e) => {
    e.preventDefault();
    if (currentVal > min) {
      onChange(currentVal - 1);
    }
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    if (currentVal < max) {
      onChange(currentVal + 1);
    }
  };

  const handleInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      onChange('');
    } else {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  const handleBlur = () => {
    if (!value || parseInt(value) < min) {
      onChange(min);
    }
  };

  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-8.5 h-8';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const inputWidth = size === 'sm' ? 'w-10 h-7' : 'w-12 h-8';

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-brand-border bg-brand-bg-input shadow-2xs overflow-hidden select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={currentVal <= min}
        className={`${btnSize} flex items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-table-hover active:bg-brand-border disabled:opacity-20 disabled:cursor-not-allowed transition-colors touch-manipulation`}
        aria-label="Kurangi Qty"
      >
        <Minus className={iconSize} />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={`${inputWidth} bg-transparent text-center text-xs font-bold text-brand-text focus:outline-none focus:bg-brand-card font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />

      <button
        type="button"
        onClick={handleIncrease}
        disabled={currentVal >= max}
        className={`${btnSize} flex items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-table-hover active:bg-brand-border disabled:opacity-20 disabled:cursor-not-allowed transition-colors touch-manipulation`}
        aria-label="Tambah Qty"
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
};

export default QuantityStepper;
