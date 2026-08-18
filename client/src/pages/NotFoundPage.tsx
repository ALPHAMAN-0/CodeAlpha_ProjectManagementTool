import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-indigo-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The link may be broken, or the project may have been deleted.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to your projects
        </Link>
      </div>
    </div>
  );
}
