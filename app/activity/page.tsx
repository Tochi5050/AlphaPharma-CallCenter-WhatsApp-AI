import React from 'react'
import ActivityList from './ActivityList'

const Activity = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full bg-gray-50 flex flex-col items-center justify-center">
      {/* 
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Chronological log of all agent actions
        </p>
      </div>
      <ActivityList />
      */}
      <div className="text-center space-y-2 select-none">
        <p className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wide flex items-center justify-center gap-2">
          Coming soon <span className="inline-block animate-bounce text-2xl">🔥</span>
        </p>
      </div>
    </div>
  )
}

export default Activity
