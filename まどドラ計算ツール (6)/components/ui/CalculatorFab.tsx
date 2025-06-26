
import React from 'react';
import { CalculatorIcon } from './Icons';

interface CalculatorFabProps {
  onOpen: () => void;
}

export const CalculatorFab: React.FC<CalculatorFabProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-primary-DEFAULT hover:bg-primary-light text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2 focus:ring-offset-background z-40 transition-transform duration-150 ease-in-out hover:scale-110 active:scale-95"
      aria-label="電卓を開く"
      title="電卓を開く"
    >
      <CalculatorIcon className="w-7 h-7 sm:w-8 sm:h-8" />
    </button>
  );
};
