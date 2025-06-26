
import React from 'react';
import { SelectOption } from '../../types';

interface SelectProps<T = string> extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: SelectOption<T>[];
  error?: string;
  containerClassName?: string;
}

export const Select = <T extends string,>({ label, id, options, error, containerClassName, ...props }: SelectProps<T>): React.ReactElement => {
  return (
    <div className={`${containerClassName}`}> {/* Removed mb-4 from here */}
      <label htmlFor={id} className="block text-sm font-medium text-on-surface-muted mb-1">
        {label}
      </label>
      <select
        id={id}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-primary-DEFAULT focus:border-primary-DEFAULT text-on-surface sm:text-sm ${error ? 'border-red-500' : ''}`}
        {...props}
      >
        {options.map(option => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};
