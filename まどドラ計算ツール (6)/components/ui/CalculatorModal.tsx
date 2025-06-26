
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResizeHandleIcon } from './Icons';

interface CalculatorModalProps {
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
}

const MAX_INPUT_LENGTH = 16;
const MAX_DECIMAL_PRECISION = 8;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 240;
// DEFAULT_WIDTH and DEFAULT_HEIGHT will be set dynamically based on screen size
// Fallback defaults if window is not available immediately.
const FALLBACK_DEFAULT_WIDTH = 320;
const FALLBACK_DEFAULT_HEIGHT = 480;


const getOperatorSymbol = (op: string | null): string => {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op || '';
};

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  onClose,
  initialPosition: initialPositionProp,
  initialSize: initialSizeProp
}) => {
  const [currentValue, setCurrentValue] = useState<string>("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [shouldResetCurrentValue, setShouldResetCurrentValue] = useState<boolean>(false);
  const [isErrorState, setIsErrorState] = useState<boolean>(false);

  const [position, setPosition] = useState(initialPositionProp || { x: 10, y: 10 });
  
  // Initialize size state with fallback, will be updated in useEffect for client-side calculation
  const [size, setSize] = useState(
    initialSizeProp || { width: FALLBACK_DEFAULT_WIDTH, height: FALLBACK_DEFAULT_HEIGHT }
  );

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const dragStartRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSizeProp && typeof window !== 'undefined') {
      const calculatedWidth = Math.max(MIN_WIDTH, window.innerWidth / 2);
      const calculatedHeight = Math.max(MIN_HEIGHT, window.innerHeight / 2);
      setSize({ width: calculatedWidth, height: calculatedHeight });
    }
  }, [initialSizeProp]);


  const formatDisplayValue = (value: string | null): string => {
    if (value === null || value === "") return "0";
    if (value === "Error") return "Error";

    let displayStr = value;

    if (displayStr.includes('.')) {
        const decimalIndex = displayStr.indexOf('.');
        const integerPartLength = decimalIndex;
        const decimalPartLength = displayStr.length - decimalIndex - 1;

        if (integerPartLength + decimalPartLength > MAX_INPUT_LENGTH -1 ) {
             if (decimalPartLength > MAX_DECIMAL_PRECISION) {
                const num = parseFloat(displayStr);
                if (!isNaN(num)) {
                    displayStr = num.toFixed(MAX_DECIMAL_PRECISION);
                    if (displayStr.includes('.')) {
                        displayStr = displayStr.replace(/0+$/, '').replace(/\.$/, '');
                    }
                }
             }
        }
    }

    if (displayStr.length > MAX_INPUT_LENGTH) {
      const num = parseFloat(displayStr);
      if (!isNaN(num) && (Math.abs(num) >= 1e16 || (Math.abs(num) < 1e-6 && num !== 0))) {
        const precisionForExp = Math.max(1, MAX_INPUT_LENGTH - 7);
        return num.toExponential(precisionForExp);
      }
    }
    return displayStr;
  };

  const performCalculation = (): string | null => {
    if (previousValue === null || operator === null || currentValue === "Error") return null;
    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);

    if (isNaN(prev) || isNaN(curr)) {
      setCurrentValue("Error"); setIsErrorState(true); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(true);
      return "Error";
    }

    let result: number;
    switch (operator) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '*': result = prev * curr; break;
      case '/':
        if (curr === 0) {
          setCurrentValue("Error"); setIsErrorState(true); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(true); 
          return "Error";
        }
        result = prev / curr;
        break;
      default: return null; // Should not happen with valid operator
    }

    let stringResult = String(result);
    if (stringResult.includes('.')) {
        const decimalIndex = stringResult.indexOf('.');
        const decimalPartLength = stringResult.length - decimalIndex - 1;
        if (decimalPartLength > MAX_DECIMAL_PRECISION) {
            stringResult = result.toFixed(MAX_DECIMAL_PRECISION).replace(/0+$/, '').replace(/\.$/, '');
        }
    }
    if (stringResult.length > MAX_INPUT_LENGTH && !stringResult.includes('e')) {
        const num = parseFloat(stringResult);
        if (!isNaN(num) && (Math.abs(num) >= 1e16 || (Math.abs(num) < 1e-6 && num !== 0))) {
           stringResult = num.toExponential(Math.max(1, MAX_INPUT_LENGTH - 7));
        }
    }
    setCurrentValue(stringResult);
    setPreviousValue(null);
    setOperator(null);
    setIsErrorState(false);
    return stringResult;
  };

  const handleDigitClick = (digit: string) => {
    if (isErrorState) {
      setCurrentValue(digit); setIsErrorState(false); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(false); return;
    }
    if (shouldResetCurrentValue) {
      setCurrentValue(digit); setShouldResetCurrentValue(false);
    } else {
      if (currentValue.length < MAX_INPUT_LENGTH) {
        setCurrentValue(currentValue === "0" ? digit : currentValue + digit);
      }
    }
  };

  const handleDecimalClick = () => {
    if (isErrorState) {
      setCurrentValue("0."); setIsErrorState(false); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(false); return;
    }
    if (shouldResetCurrentValue) {
      setCurrentValue("0."); setShouldResetCurrentValue(false);
    } else if (!currentValue.includes(".") && currentValue.length < MAX_INPUT_LENGTH -1) {
      setCurrentValue(currentValue + ".");
    }
  };

  const handleOperatorClick = (op: string) => {
    if (isErrorState && currentValue === "Error") return;
    if (isErrorState && currentValue !== "Error") setIsErrorState(false);

    let valueToSetAsPrevious = currentValue;

    if (previousValue !== null && operator !== null && !shouldResetCurrentValue) {
      const resultOfCalc = performCalculation();
      if (isErrorState || resultOfCalc === null || resultOfCalc === "Error") {
          // If performCalculation returned null but didn't set error state (e.g. precondition fail), set error.
          if (!isErrorState) { 
              setCurrentValue("Error"); setIsErrorState(true); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(true);
          }
          return;
      }
      valueToSetAsPrevious = resultOfCalc;
    }

    setPreviousValue(valueToSetAsPrevious);
    setOperator(op);
    setShouldResetCurrentValue(true);
  };

  const handleEqualsClick = () => {
    if (isErrorState || previousValue === null || operator === null) return;
    performCalculation(); // Result is stored in currentValue by performCalculation
    setShouldResetCurrentValue(true);
  };

  const handleAllClearClick = () => {
    setCurrentValue("0"); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(false); setIsErrorState(false);
  };

  const handleDeleteClick = () => {
    if (isErrorState) { handleAllClearClick(); return; }
    if (shouldResetCurrentValue && operator && previousValue !== null) {
      setCurrentValue(previousValue); setPreviousValue(null); setOperator(null); setShouldResetCurrentValue(false); return;
    }
    setCurrentValue(currentValue.length > 1 ? currentValue.slice(0, -1) : "0");
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    if (!calculatorRef.current) return;
    setIsDragging(true);
    const rect = calculatorRef.current.getBoundingClientRect();
    dragStartRef.current = {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };
  
  const handleResizeStart = (clientX: number, clientY: number) => {
    setIsResizing(true);
    resizeStartRef.current = {
      startX: clientX,
      startY: clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  };

  const handleInteractionMove = useCallback((clientX: number, clientY: number, event?: TouchEvent) => {
    if (isDragging && dragStartRef.current && calculatorRef.current) {
      if (event) event.preventDefault();
      let newX = clientX - dragStartRef.current.offsetX;
      let newY = clientY - dragStartRef.current.offsetY;

      const parentWidth = window.innerWidth;
      const parentHeight = window.innerHeight;

      newX = Math.max(0, Math.min(newX, parentWidth - size.width));
      newY = Math.max(0, Math.min(newY, parentHeight - size.height));

      setPosition({ x: newX, y: newY });
    }
    if (isResizing && resizeStartRef.current) {
      if (event) event.preventDefault();
      const dx = clientX - resizeStartRef.current.startX;
      const dy = clientY - resizeStartRef.current.startY;

      const maxWidth = window.innerWidth - position.x;
      const maxHeight = window.innerHeight - position.y;

      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, resizeStartRef.current.startWidth + dx));
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, resizeStartRef.current.startHeight + dy));
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, size.width, size.height, position.x, position.y]);

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, []);
  
  // Mouse event handlers
  const onDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button[aria-label="電卓を閉じる"]')) return;
      handleDragStart(e.clientX, e.clientY);
      e.preventDefault();
  };
  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      handleResizeStart(e.clientX, e.clientY);
      e.preventDefault();
  };

  // Touch event handlers
  const onDragTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button[aria-label="電卓を閉じる"]')) return;
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      // No preventDefault here to allow click on close button
    }
  };
  const onResizeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      handleResizeStart(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault(); // Prevent scroll/zoom on resize handle
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY, e);
        }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleInteractionEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleInteractionEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, isResizing, handleInteractionMove, handleInteractionEnd]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        // Check if the event target is inside the calculator or if the calculator itself has focus.
        // Also allow escape if body is focused (e.g. after closing a modal)
        let isEventOriginatingFromCalculator = false;
        if (calculatorRef.current) {
            if (calculatorRef.current.contains(event.target as Node)) {
                isEventOriginatingFromCalculator = true;
            }
             // Check if the calculator itself has focus (tabIndex=-1 makes it focusable programmatically or via click)
            if (document.activeElement === calculatorRef.current) {
                isEventOriginatingFromCalculator = true;
            }
        }
       
        if (!isEventOriginatingFromCalculator && event.target !== document.body && event.key !== 'Escape') {
            return;
        }


      if (event.key >= '0' && event.key <= '9') { handleDigitClick(event.key); }
      else if (event.key === '.') { handleDecimalClick(); }
      else if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') { event.preventDefault(); handleOperatorClick(event.key); }
      else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); handleEqualsClick(); }
      else if (event.key === 'Backspace') { handleDeleteClick(); }
      else if (event.key === 'Escape') { onClose(); }
      else if (event.key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey && !event.altKey) { handleAllClearClick(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentValue, previousValue, operator, shouldResetCurrentValue, isErrorState, onClose]);

  const buttonClass = "p-1.5 text-xs sm:p-2 sm:text-sm md:text-base rounded-md focus:outline-none focus:ring-1 focus:ring-primary-light transition-colors duration-150 ease-in-out flex-grow basis-0 flex items-center justify-center";
  const numButtonClass = `${buttonClass} bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-on-surface`;
  const opButtonClass = `${buttonClass} bg-primary-dark hover:bg-primary-DEFAULT active:bg-primary-light text-on-surface`;
  const specialButtonClass = `${buttonClass} bg-red-700 hover:bg-red-600 active:bg-red-500 text-white`;
  const equalsButtonClass = `${buttonClass} bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-bold shadow-lg hover:shadow-xl ring-2 ring-yellow-300 ring-offset-2 ring-offset-surface`;


  let textToDisplay;
  if (isErrorState) { textToDisplay = "Error"; }
  else if (operator && previousValue !== null) {
      textToDisplay = shouldResetCurrentValue ?
          `${formatDisplayValue(previousValue)} ${getOperatorSymbol(operator)}` :
          `${formatDisplayValue(previousValue)} ${getOperatorSymbol(operator)} ${formatDisplayValue(currentValue)}`;
  } else { textToDisplay = formatDisplayValue(currentValue); }

  return (
    <div
        ref={calculatorRef}
        className="fixed bg-surface rounded-lg shadow-2xl flex flex-col z-[70] overflow-hidden select-none"
        style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            minWidth: `${MIN_WIDTH}px`,
            minHeight: `${MIN_HEIGHT}px`,
         }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="calculator-title"
        tabIndex={-1}
    >
      <div
        className="flex justify-between items-center p-1.5 sm:p-2 bg-gray-700 cursor-move"
        onMouseDown={onDragMouseDown}
        onTouchStart={onDragTouchStart}
      >
        <h3 id="calculator-title" className="text-sm sm:text-base md:text-lg font-semibold text-primary-light">電卓</h3>
        <button
            onClick={onClose}
            className="text-on-surface-muted hover:text-on-surface text-lg sm:text-xl"
            aria-label="電卓を閉じる"
        >&times;</button>
      </div>

      <div className="bg-gray-800 text-white p-1.5 sm:p-2 rounded-b-lg flex flex-col items-end justify-center mx-1 my-1" style={{minHeight: '44px', flexShrink: 0}}>
        <div
          className="font-mono break-all w-full text-right"
          style={{ overflowWrap: 'break-word', wordBreak: 'break-all', fontSize: 'clamp(0.875rem, calc(0.7rem + 1.5vw), 1.5rem)' }}
          aria-live="polite"
        >
          {textToDisplay}
        </div>
      </div>

      <div className="grid grid-cols-4 grid-rows-5 gap-1 p-1 sm:p-2 flex-grow">
        <button onClick={handleAllClearClick} className={`${specialButtonClass} col-span-2`} aria-label="オールクリア">AC</button>
        <button onClick={handleDeleteClick} className={`${specialButtonClass}`} aria-label="削除">DEL</button>
        <button onClick={() => handleOperatorClick('/')} className={`${opButtonClass}`} aria-label="割る">÷</button>

        <button onClick={() => handleDigitClick('7')} className={`${numButtonClass}`}>7</button>
        <button onClick={() => handleDigitClick('8')} className={`${numButtonClass}`}>8</button>
        <button onClick={() => handleDigitClick('9')} className={`${numButtonClass}`}>9</button>
        <button onClick={() => handleOperatorClick('*')} className={`${opButtonClass}`} aria-label="掛ける">×</button>

        <button onClick={() => handleDigitClick('4')} className={`${numButtonClass}`}>4</button>
        <button onClick={() => handleDigitClick('5')} className={`${numButtonClass}`}>5</button>
        <button onClick={() => handleDigitClick('6')} className={`${numButtonClass}`}>6</button>
        <button onClick={() => handleOperatorClick('-')} className={`${opButtonClass}`} aria-label="引く">−</button>

        <button onClick={() => handleDigitClick('1')} className={`${numButtonClass}`}>1</button>
        <button onClick={() => handleDigitClick('2')} className={`${numButtonClass}`}>2</button>
        <button onClick={() => handleDigitClick('3')} className={`${numButtonClass}`}>3</button>
        <button onClick={() => handleOperatorClick('+')} className={`${opButtonClass}`} aria-label="足す">+</button>

        <button onClick={() => handleDigitClick('0')} className={`${numButtonClass} col-span-2`}>0</button>
        <button onClick={handleDecimalClick} className={`${numButtonClass}`} aria-label="小数点">.</button>
        <button onClick={handleEqualsClick} className={`${equalsButtonClass}`} aria-label="計算実行">=</button>
      </div>
      <div
        className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 cursor-nwse-resize text-on-surface-muted opacity-50 hover:opacity-100"
        onMouseDown={onResizeMouseDown}
        onTouchStart={onResizeTouchStart}
        title="サイズ変更"
      >
        <ResizeHandleIcon className="w-full h-full" />
      </div>
    </div>
  );
};
