
import React from 'react';
import Skeleton from './Skeleton';

const ResultSkeleton = () => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="glass-card border-none p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-3/4 max-w-md" />
            <Skeleton className="h-4 w-1/2 max-w-sm" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card border-none p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>

          <div className="glass-card border-none p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="glass-card border-none p-6 space-y-6">
            <Skeleton className="h-6 w-32" />
            <div className="flex justify-center p-4">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>

          <div className="glass-card border-none p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSkeleton;
