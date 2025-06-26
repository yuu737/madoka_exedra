
import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string; 
  srLabel?: boolean; 
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  srLabel = false,
  checked,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const switchBaseSizeClasses = size === 'sm' 
    ? { trackW: 'w-11', trackH: 'h-6', knob: 'w-4 h-4', text: 'text-xs', textLeft: 'left-1', textRight: 'right-1' } 
    : { trackW: 'w-14', trackH: 'h-7', knob: 'w-5 h-5', text: 'text-sm', textLeft: 'left-1.5', textRight: 'right-1.5' };
  
  const knobTranslateClasses = checked 
    ? (size === 'sm' ? 'translate-x-5' : 'translate-x-7') 
    : (size === 'sm' ? 'translate-x-1' : 'translate-x-1');


  return (
    <div className="flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`${
          checked ? 'bg-primary-DEFAULT' : 'bg-gray-600'
        } relative inline-flex flex-shrink-0 ${switchBaseSizeClasses.trackH} ${switchBaseSizeClasses.trackW} border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary-DEFAULT disabled:opacity-50 disabled:cursor-not-allowed items-center`}
      >
        {/* Text for ON state */}
        <span
          aria-hidden="true"
          className={`absolute ${switchBaseSizeClasses.textLeft} pointer-events-none ${switchBaseSizeClasses.text} font-normal text-white transition-opacity duration-200 ease-in-out ${
            checked ? 'opacity-100' : 'opacity-0'
          }`}
        >
          ON
        </span>

        {/* Knob */}
        <span
          aria-hidden="true"
          className={`${knobTranslateClasses} inline-block ${switchBaseSizeClasses.knob} bg-white rounded-full shadow transform ring-0 transition ease-in-out duration-200 pointer-events-none`}
        />

        {/* Text for OFF state */}
        <span
          aria-hidden="true"
          className={`absolute ${switchBaseSizeClasses.textRight} pointer-events-none ${switchBaseSizeClasses.text} font-normal text-white transition-opacity duration-200 ease-in-out ${
            !checked ? 'opacity-100' : 'opacity-0'
          }`}
        >
          OFF
        </span>
      </button>
      <label htmlFor={id} id={`${id}-label`} className={srLabel ? "sr-only" : "ml-2 text-sm text-on-surface-muted cursor-pointer"} onClick={() => !disabled && onChange(!checked)}>
        {label}
      </label>
    </div>
  );
};
