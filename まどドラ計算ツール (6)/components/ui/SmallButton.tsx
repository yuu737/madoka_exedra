
import React from 'react';

interface SmallButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const SmallButton: React.FC<SmallButtonProps> = ({ label, ...props }) => (
  <button
    type="button"
    className="ml-2 px-2 py-1 text-xs bg-primary-dark hover:bg-primary-dark/80 text-on-surface rounded shadow transition-colors h-8 self-end mb-[1px]"
    {...props}
  >
    {label}
  </button>
);
