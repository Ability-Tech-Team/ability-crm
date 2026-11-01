import React from 'react';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, className = '' }) => (
  <div className={`flex items-center gap-2 mb-2 ${className}`}>
    <Icon size={20} className="text-sky-600" />
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
  </div>
);

export default SectionHeader;