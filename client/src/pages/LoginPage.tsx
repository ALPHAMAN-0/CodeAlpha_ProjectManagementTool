import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@pm/shared';
import { Button, Field, Input } from '../components/ui';
import { useLogin } from '../features/auth/hooks';
import { ApiError } from '../lib/api';
import { AuthLayout } from '../features/auth/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
    navigate(redirectTo, { replace: true });
  });

  const serverError = login.error instanceof ApiError ? login.error.message : null;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where your team left off."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>

        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={login.isPending} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Demo account: <span className="font-mono text-slate-700">demo@example.com</span> /{' '}
        <span className="font-mono text-slate-700">Demo1234</span>
      </p>
    </AuthLayout>
  );
}
