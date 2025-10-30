import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">RapidGig Platform</h1>
        <p className="text-xl text-gray-600 mb-8">Welcome to the platform!</p>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Frontend:</span>
              <span className="text-green-600 font-semibold">✓ Running</span>
            </div>
            <div className="flex justify-between">
              <span>Components:</span>
              <span className="text-green-600 font-semibold">✓ Loaded</span>
            </div>
            <div className="flex justify-between">
              <span>Types:</span>
              <span className="text-green-600 font-semibold">✓ Fixed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;