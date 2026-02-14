import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="text-violet-600 hover:text-violet-700 font-medium"
        >
          ← Back to home
        </Link>
      </div>
    </>
  )
}
