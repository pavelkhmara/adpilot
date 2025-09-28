import React from 'react'

const SkeletonRow = () => {
    return (
      <tr className="border-t animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 w-full bg-gray-100 rounded" />
        </td>
      ))}
    </tr>
    )
}

export default SkeletonRow;