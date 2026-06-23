
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className = "" }: SkeletonProps) => {
  return (
    <div className={`relative overflow-hidden bg-white/5 backdrop-blur-sm rounded-lg border border-white/5 shadow-inner ${className}`}>
      {/* Subtle under-pulse */}
      <div className="absolute inset-0 animate-pulse bg-white/5" />
      {/* Premium Shimmer animation overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
};

export default Skeleton;
