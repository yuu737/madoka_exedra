
import React from 'react';

interface ResultDisplayProps {
  label: string;
  value?: string | number | undefined; // Represents the total value if baseValue/changeValue are used
  unit?: string;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  baseValue?: string | number;
  changeValue?: string | number;
  changeValueColor?: string;
  totalValueLabel?: string; // e.g., "計"
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  label,
  value,
  unit,
  isLoading,
  className = '',
  valueClassName = '',
  baseValue,
  changeValue,
  changeValueColor,
  totalValueLabel = "計" // Default total label
}) => {
  const displayTotalValue = isLoading ? "計算中..." : (value === undefined || value === null || (typeof value === 'number' && isNaN(value)) ? "---" : value.toString());
  
  const renderValue = () => {
    if (isLoading) {
      return <span className={`font-semibold text-lg ${valueClassName}`}>計算中...</span>;
    }
    if (baseValue !== undefined && changeValue !== undefined) {
      const numChange = Number(changeValue);
      const sign = numChange >= 0 ? '+' : '−';
      const absChange = Math.abs(numChange);
      const displayBase = (baseValue === undefined || baseValue === null || (typeof baseValue === 'number' && isNaN(baseValue))) ? "---" : baseValue.toString();

      return (
        <>
          {displayBase}
          <span className={`ml-1 ${changeValueColor || (numChange >= 0 ? 'text-blue-500' : 'text-red-500')}`}>
            {sign}{absChange.toString()}
          </span>
          <span className="text-xs text-on-surface-muted ml-1">
            ({totalValueLabel}: {displayTotalValue})
          </span>
        </>
      );
    }
    return displayTotalValue;
  };

  return (
    <div className={`p-3 bg-gray-700/50 rounded-md shadow ${className}`}>
      <span className="text-sm text-on-surface-muted">{label}: </span>
      <span className={`font-semibold text-lg ${valueClassName}`}>
        {renderValue()}
      </span>
      {unit && !isLoading && displayTotalValue !== "---" && !(baseValue !== undefined && changeValue !== undefined) && <span className="text-sm text-on-surface-muted ml-1">{unit}</span>}
      {unit && !isLoading && displayTotalValue !== "---" && (baseValue !== undefined && changeValue !== undefined) && <span className="text-sm text-on-surface-muted ml-0.5">{unit}</span>}
    </div>
  );
};
