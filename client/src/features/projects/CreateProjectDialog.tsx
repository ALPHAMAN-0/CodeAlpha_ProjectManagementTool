import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createProjectSchema, type CreateProjectInput } from '@pm/shared';
import { Button, Field, Input, Textarea } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useCreateProject } from './hooks';

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateProject();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { project } = await create.mutateAsync(values);
    toast.success(`"${project.name}" created`);
    reset();
    onOpenChange(false);
    // Straight into the new board - it already has starter columns.
    navigate(`/projects/${project.id}`);
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="New project"
      description="It starts with To do / In progress / Done columns."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Project name" error={errors.name?.message}>
          <Input autoFocus placeholder="Apollo launch" {...register('name')} />
        </Field>
        <Field label="Description" error={errors.description?.message} hint="Optional.">
          <Textarea rows={3} placeholder="What is this project for?" {...register('description')} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
