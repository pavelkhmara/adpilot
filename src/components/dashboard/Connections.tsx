import React from 'react'

export default function Connections() {
  return (
    <section className="grid md:grid-cols-3 gap-3">
          <div className="rounded-2xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div className="font-medium">Google Ads</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm">Manage</button>
          </div>
          <div className="rounded-2xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div className="font-medium">Meta Ads</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm">Manage</button>
          </div>
          <div className="rounded-2xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div className="font-medium">GA4</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm">Manage</button>
          </div>
        </section>
  )
}
