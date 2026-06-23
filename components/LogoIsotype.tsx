
import React from 'react';

export const LogoIsotype = ({ className = "w-8 h-8", color }: { className?: string, color?: string }) => (
    <img 
        src="/isotype.png" 
        alt="INsitu AI Logo" 
        className={className} 
        style={{ objectFit: 'contain' }}
    />
);

export default LogoIsotype;
