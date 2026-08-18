import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@pm/shared';
import { Button, Field, Input } from '../components/ui';
import { useRegister } from '../features/auth/hooks';
import { ApiError } from '../lib/api';
import { AuthLayout } from '../features/auth/AuthLayout';

export default function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    await signUp.mutateAsync(values);
    navigate('/', { replace: true });
  });

  const serverError = signUp.error instanceof ApiError ? signUp.error.message : null;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Spin up a board and invite your team in a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name?.message}>
          <Input autoComplete="name" placeholder="Ada Lovelace" {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number."
        >
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>

        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={signUp.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
