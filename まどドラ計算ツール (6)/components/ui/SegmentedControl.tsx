
import React from 'react';

interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: SegmentedControlProps<T>): React.ReactElement => {
  const heightClass = size === 'sm' ? 'h-8' : 'h-9';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center space-x-2">
      {label && <span className={`text-on-surface-muted ${textSizeClass}`}>{label}</span>}
      <div className={`flex ${heightClass} bg-gray-700 rounded-md p-0.5`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 ${textSizeClass} font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-700 focus:ring-primary-light
                        ${value === option.value 
                            ? 'bg-primary-light text-primary-dark shadow-md' // Updated: Brighter style for selected
                            : 'text-on-surface-muted hover:bg-gray-600 hover:text-on-surface'
                        }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
