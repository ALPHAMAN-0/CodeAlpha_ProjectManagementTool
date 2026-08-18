import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '../../components/ui';
import { useMe } from './hooks';

/** Gate for app routes. Remembers where the user was headed. */
export function RequireAuth() {
  const { user, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Keeps a signed-in user off /login and /register. */
export function RedirectIfAuthed() {
  const { user, isLoading } = useMe();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
