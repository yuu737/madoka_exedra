

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  error?: string;
  containerClassName?: string;
  numeric?: boolean;
  forceNumericKeyboard?: boolean; 
  step?: number;
  min?: number;
  max?: number;
  sliderMin?: number;
  sliderMax?: number;
  inputClassName?: string;
  type?: 'text' | 'number' | 'password' | 'email';
}

// Constants for step button acceleration
const INITIAL_FIXED_STEP_DELAY_MS = 1000; 
const DELAY_BEFORE_ACCELERATION_START_MS = 500; 
const ACCELERATION_PHASE_INITIAL_DELAY_MS = 150; 
const MIN_STEP_DELAY_MS = 25; 
const ACCELERATION_FACTOR = 0.92; 

const MIN_INPUT_WIDTH_REM = 7; 
const MIN_SLIDER_WIDTH_REM = 3; 

const MIN_RESERVED_WIDTH_FOR_INPUT_TEXT_PX = 75;
const UNIT_VISIBILITY_PADDING_PX = 16; 

const DOUBLE_CLICK_PREVENTION_MS = 100; // Threshold for preventing double calls

export const Input: React.FC<InputProps> = ({
  label,
  id,
  value,
  onChange,
  unit,
  error,
  containerClassName,
  numeric = false,
  forceNumericKeyboard = false, 
  step = 1, 
  min,
  max,
  sliderMin,
  sliderMax,
  inputClassName,
  type = 'text',
  ...props
}) => {
  const effectiveType = numeric ? 'text' : type;
  const determinedInputMode = forceNumericKeyboard ? 'decimal' : (numeric ? 'decimal' : undefined);

  const rafId = useRef<number | null>(null);
  const lastStepTime = useRef<number>(0);
  const currentStepDelay = useRef<number>(ACCELERATION_PHASE_INITIAL_DELAY_MS);
  const pressStartTime = useRef<number>(0);
  const isPressingRef = useRef(false);
  const lastCallTimestampRef = useRef<number>(0); // Ref for debounce

  const performStepRef = useRef<((dir: 'increment' | 'decrement') => void) | null>(null);
  const continuousStepLogicRef = useRef<((direction: 'increment' | 'decrement') => void) | null>(null);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  const overallContainerRef = useRef<HTMLDivElement>(null); 
  const internalUnitRef = useRef<HTMLSpanElement>(null); 
  const [showInternalUnit, setShowInternalUnit] = useState(true);

  const getPrecisionForStep = (currentStep: number): number => {
    const stepString = String(currentStep);
    const decimalIndex = stepString.indexOf('.');
    return decimalIndex >= 0 ? stepString.length - decimalIndex - 1 : 0;
  };

  const formatValueToStepPrecision = useCallback((num: number): string => {
    const precision = getPrecisionForStep(step);
    return num.toFixed(precision);
  }, [step]);

  const clampValue = useCallback((num: number): number => {
    let clamped = num;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);

  performStepRef.current = (dir: 'increment' | 'decrement'): void => {
    const amount = step;
    const currentValue = parseFloat(value);
    let newValueNum: number;

    if (isNaN(currentValue)) {
      if (min !== undefined) newValueNum = min;
      else if (dir === 'increment') newValueNum = amount;
      else newValueNum = -amount;
    } else {
      newValueNum = currentValue + (dir === 'increment' ? amount : -amount);
    }

    newValueNum = clampValue(newValueNum);
    onChange(formatValueToStepPrecision(newValueNum));
  };


  continuousStepLogicRef.current = (direction: 'increment' | 'decrement'): void => { 
    if (!isPressingRef.current) return;

    const now = Date.now();
    const elapsedPressTime = now - pressStartTime.current;
    const elapsedTimeSinceLastStep = now - lastStepTime.current;

    if (elapsedPressTime < DELAY_BEFORE_ACCELERATION_START_MS) {
      if (elapsedTimeSinceLastStep >= INITIAL_FIXED_STEP_DELAY_MS) {
        if(performStepRef.current) {
          performStepRef.current(direction); 
        }
        lastStepTime.current = now;
      }
    } else {
      if (elapsedTimeSinceLastStep >= currentStepDelay.current) {
        if(performStepRef.current) {
            performStepRef.current(direction); 
        }
        lastStepTime.current = now;
        currentStepDelay.current = Math.max(MIN_STEP_DELAY_MS, currentStepDelay.current * ACCELERATION_FACTOR);
      }
    }
    const nextFrameCallback = (_time: DOMHighResTimeStamp) => {
      if (continuousStepLogicRef.current && isPressingRef.current) {
         continuousStepLogicRef.current(direction); 
      }
    };
    rafId.current = requestAnimationFrame(nextFrameCallback);
  };

  const handleMouseDownStep = (directionArg: 'increment' | 'decrement') => {
    const now = Date.now();
    if (now - lastCallTimestampRef.current < DOUBLE_CLICK_PREVENTION_MS) {
      return; // Debounce rapid calls
    }
    lastCallTimestampRef.current = now;

    if (props.disabled) return;
    isPressingRef.current = true;
    if(performStepRef.current) performStepRef.current(directionArg);
    lastStepTime.current = Date.now();
    pressStartTime.current = Date.now();
    currentStepDelay.current = ACCELERATION_PHASE_INITIAL_DELAY_MS;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    
    const startContinuousSteps = (_time: DOMHighResTimeStamp) => {
       if (continuousStepLogicRef.current && isPressingRef.current) {
         continuousStepLogicRef.current(directionArg);
       }
    };
    rafId.current = requestAnimationFrame(startContinuousSteps);
  };

  const handleMouseUpStep = () => {
    isPressingRef.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (numeric) { 
      if (rawValue === '' || rawValue === '-' || /^-?\d*\.?\d*$/.test(rawValue)) {
        onChange(rawValue);
      }
    } else { 
      onChange(rawValue);
    }
  };

  const handleBlur = () => {
    if (numeric) { 
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            if (value.trim() !== '' && value.trim() !== '-') {
                 onChange(min !== undefined ? clampValue(min).toString() : '0');
            } else if (value.trim() === '-') {
                onChange('');
            }
            return;
        }
        
        const normalizedString = numValue.toString();
        if (value !== normalizedString) {
            onChange(normalizedString);
        }
    }
  };

  useLayoutEffect(() => {
    if (!numeric && unit && overallContainerRef.current) {
      const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
          const containerWidth = entry.contentRect.width;
          const unitWidth = internalUnitRef.current ? internalUnitRef.current.offsetWidth : 0;
          
          if (containerWidth < unitWidth + MIN_RESERVED_WIDTH_FOR_INPUT_TEXT_PX + UNIT_VISIBILITY_PADDING_PX) {
            setShowInternalUnit(false);
          } else {
            setShowInternalUnit(true);
          }
        }
      });
      observer.observe(overallContainerRef.current);
      
      // Initial check
      if (overallContainerRef.current && internalUnitRef.current) {
         const containerWidth = overallContainerRef.current.offsetWidth;
         const unitWidth = internalUnitRef.current.offsetWidth;
         if (containerWidth < unitWidth + MIN_RESERVED_WIDTH_FOR_INPUT_TEXT_PX + UNIT_VISIBILITY_PADDING_PX) {
            setShowInternalUnit(false);
          } else {
            setShowInternalUnit(true);
          }
      }


      return () => observer.disconnect();
    } else {
      setShowInternalUnit(true); 
    }
  }, [numeric, unit]); 

  const currentSliderMin = sliderMin !== undefined ? sliderMin : (min !== undefined ? min : 0);
  const currentSliderMax = sliderMax !== undefined ? sliderMax : (max !== undefined ? max : 100);
  const showSlider = numeric && currentSliderMin < currentSliderMax;

  const getSliderValuePercentage = useCallback(() => {
    if (!showSlider) return 0;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= currentSliderMin) return 0;
    if (numValue >= currentSliderMax) return 100;
    return ((numValue - currentSliderMin) / (currentSliderMax - currentSliderMin)) * 100;
  }, [value, currentSliderMin, currentSliderMax, showSlider]);

  const handleSliderChange = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!sliderTrackRef.current || !showSlider || props.disabled) return;

    const trackRect = sliderTrackRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const offsetX = Math.max(0, Math.min(clientX - trackRect.left, trackRect.width));
    const percentage = offsetX / trackRect.width;

    let newValue = currentSliderMin + percentage * (currentSliderMax - currentSliderMin);
    newValue = Math.round(newValue / step) * step; // Snap to step
    newValue = clampValue(newValue);
    onChange(formatValueToStepPrecision(newValue));
  }, [currentSliderMin, currentSliderMax, showSlider, onChange, formatValueToStepPrecision, clampValue, props.disabled, step]);

  const handleSliderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (props.disabled) return;
    setIsDraggingSlider(true);
    handleSliderChange(event);
  };

  const handleSliderMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingSlider || props.disabled) return;
    handleSliderChange(event as unknown as React.MouseEvent<HTMLDivElement>);
  }, [isDraggingSlider, handleSliderChange, props.disabled]);

  const handleSliderMouseUp = useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  useEffect(() => {
    if (isDraggingSlider) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
      document.addEventListener('touchmove', handleSliderMouseMove as unknown as EventListener);
      document.addEventListener('touchend', handleSliderMouseUp as unknown as EventListener);
    } else {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderMouseMove as unknown as EventListener);
      document.removeEventListener('touchend', handleSliderMouseUp as unknown as EventListener);
    }
    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderMouseMove as unknown as EventListener);
      document.removeEventListener('touchend', handleSliderMouseUp as unknown as EventListener);
    };
  }, [isDraggingSlider, handleSliderMouseMove, handleSliderMouseUp]);

  const sliderPercentage = getSliderValuePercentage();

  let textInputWrapperClasses = 'w-full'; 
  let textInputItselfClasses = 'rounded-md'; 
  let sliderContainerClasses = ''; 
  let stepButtonContainerClasses = ''; 

  if (numeric) {
    textInputItselfClasses = 'rounded-l-md rounded-r-none border-r-0';

    if (showSlider) {
      textInputWrapperClasses = `flex-grow flex-shrink-0 basis-0 min-w-[${MIN_INPUT_WIDTH_REM}rem]`;
      sliderContainerClasses = `relative flex-grow flex-shrink basis-0 h-full bg-gray-700 border border-gray-600 border-l-0 border-r-0 rounded-none cursor-pointer flex items-center focus:z-10 px-2 min-w-[${MIN_SLIDER_WIDTH_REM}rem]`;
      stepButtonContainerClasses = 'rounded-r-md border-l-0 flex-shrink-0'; 
    } else {
      textInputWrapperClasses = 'flex-grow'; 
      stepButtonContainerClasses = 'rounded-r-md border-l-0 flex-shrink-0';
    }
  }

  return (
    <div className={`mb-3 ${containerClassName}`}>
      <label htmlFor={id} className="block text-sm font-medium text-on-surface-muted mb-1">
        {label}
      </label>
      <div className="relative flex items-center h-9" ref={overallContainerRef}>
        <div className={`relative ${textInputWrapperClasses} h-full`}>
          <input
            id={id}
            type={effectiveType}
            inputMode={determinedInputMode}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 shadow-sm focus:ring-primary-DEFAULT focus:border-primary-DEFAULT text-on-surface placeholder-gray-500 sm:text-sm h-full
                        ${textInputItselfClasses}
                        ${error ? 'border-red-500' : ''}
                        ${inputClassName}`}
            {...props}
          />
        </div>

        {showSlider && (
          <div
            ref={sliderTrackRef}
            className={sliderContainerClasses}
            onMouseDown={handleSliderMouseDown}
            onTouchStart={(e) => {
              if (props.disabled) return;
              setIsDraggingSlider(true);
              handleSliderChange(e as unknown as React.TouchEvent<HTMLDivElement>);
            }}
            role="slider"
            aria-valuemin={currentSliderMin}
            aria-valuemax={currentSliderMax}
            aria-valuenow={parseFloat(value) || (currentSliderMin + currentSliderMax)/2 }
            aria-labelledby={id}
            tabIndex={props.disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (props.disabled) return;
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                if(performStepRef.current) performStepRef.current('decrement');
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                if(performStepRef.current) performStepRef.current('increment');
              }
            }}
          >
            <div className="w-full h-1 rounded-full flex overflow-hidden">
              <div className="h-full bg-cyan-300" style={{ width: `${sliderPercentage}%` }}></div>
              <div className="h-full bg-gray-500" style={{ width: `${100 - sliderPercentage}%` }}></div>
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-500 rounded-full shadow-md cursor-grab"
              style={{ left: `calc(${sliderPercentage}% - 0.5rem)` }} 
            ></div>
            
            {(() => {
              if (currentSliderMin === currentSliderMax) return null; 
              const averageValue = (currentSliderMin + currentSliderMax) / 2;
              const formattedAverageValue = formatValueToStepPrecision(averageValue);
              
              const shouldRenderMarker = currentSliderMin < currentSliderMax;

              if (!shouldRenderMarker) return null;

              return (
                <>
                  <span
                    className="absolute text-xs text-yellow-400 pointer-events-none"
                    style={{
                      left: `50%`,
                      bottom: `calc(50% + 2px)`, 
                      transform: 'translateX(-50%)',
                      lineHeight: '1', 
                    }}
                    aria-hidden="true"
                  >
                    {formattedAverageValue}
                  </span>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-px h-1 bg-yellow-400 pointer-events-none" 
                    style={{ left: `50%`, transform: 'translateX(-50%)' }} 
                    aria-hidden="true"
                  />
                </>
              );
            })()}
          </div>
        )}
        
        {numeric && unit && !props.disabled && (
          <span className={`ml-2 text-sm text-on-surface-muted flex items-center flex-shrink-0`}>{unit}</span>
        )}

        {numeric && (
          <div className={`flex flex-row h-full border border-gray-600 ${stepButtonContainerClasses} overflow-hidden flex-shrink-0 ${unit && !props.disabled ? 'ml-2' : ''}`}>
            <button
              type="button"
              onMouseDown={() => handleMouseDownStep('decrement')}
              onMouseUp={handleMouseUpStep}
              onMouseLeave={handleMouseUpStep}
              onTouchStart={() => handleMouseDownStep('decrement')}
              onTouchEnd={handleMouseUpStep}
              className="px-2 bg-gray-600 hover:bg-gray-500 text-on-surface focus:outline-none h-full flex items-center justify-center text-xs w-7 border-r border-gray-500"
              tabIndex={-1}
              aria-label={`Decrement ${label}`}
              disabled={props.disabled}
            >
              -
            </button>
            <button
              type="button"
              onMouseDown={() => handleMouseDownStep('increment')}
              onMouseUp={handleMouseUpStep}
              onMouseLeave={handleMouseUpStep}
              onTouchStart={() => handleMouseDownStep('increment')}
              onTouchEnd={handleMouseUpStep}
              className="px-2 bg-gray-600 hover:bg-gray-500 text-on-surface focus:outline-none h-full flex items-center justify-center text-xs w-7"
              tabIndex={-1}
              aria-label={`Increment ${label}`}
              disabled={props.disabled}
            >
              +
            </button>
          </div>
        )}
        
        {!numeric && unit && showInternalUnit && (
          <span 
            ref={internalUnitRef} 
            className={`absolute inset-y-0 right-0 ml-2 pr-3 text-sm text-on-surface-muted flex items-center pointer-events-none`}
          >
            {unit}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};