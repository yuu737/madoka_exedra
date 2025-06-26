import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  titleActions?: React.ReactNode; // New prop for actions in the title bar
}

export const Card: React.FC<CardProps> = ({ children, title, icon, titleActions }) => {
  return (
    <div className="bg-surface shadow-xl rounded-lg overflow-hidden">
      {title && (
        <div className="p-5 sm:p-6 border-b border-gray-700 bg-gray-700/50 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-primary-light flex items-center">
            {icon && <span className="mr-3">{icon}</span>}
            {title}
          </h2>
          {titleActions && <div className="flex items-center">{titleActions}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
};
