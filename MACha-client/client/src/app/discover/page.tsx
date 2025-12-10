'use client';

import ProtectedRoute from "@/components/guards/ProtectedRoute";

function DiscoverContent() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex max-w-[1920px] mx-auto">

        {/* Main Content - Discover */}
        <main className="flex-1 lg:ml-[280px] xl:ml-[360px] lg:mr-[280px] xl:mr-[360px]">
          <div className="max-w-[680px] mx-auto pt-6 pb-6 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                Discovery
              </h1>
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <ProtectedRoute>
      <DiscoverContent />
    </ProtectedRoute>
  );
}

