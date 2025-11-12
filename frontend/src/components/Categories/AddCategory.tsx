import { Button, Input, Textarea, VStack } from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FaPlus } from 'react-icons/fa'

import { ApiError, CategoriesService, CategoryCreate } from '../../client'
import useCustomToast from '@/hooks/useCustomToast'
import { handleError } from '@/utils'
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Field } from '../ui/field'

interface AddCategoryProps {
  // In a real app, you might need to pass some props
}

export const AddCategory = ({}: AddCategoryProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<CategoryCreate>({
    mode: 'onBlur',
    criteriaMode: 'all',
  })

  const mutation = useMutation({
    mutationFn: (data: CategoryCreate) =>
      CategoriesService.createCategory({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showSuccessToast('Category created.')
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      reset()
    },
  })

  const onSubmit = (data: CategoryCreate) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'md' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button my={4}>
          <FaPlus />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4}>
            <Field
              required
              label="Name"
              invalid={!!errors.name}
              errorText={errors.name?.message}
            >
              <Input
                id="name"
                {...register('name', {
                  required: 'Name is required',
                })}
              />
            </Field>
            <Field
              required
              label="Slug"
              invalid={!!errors.slug}
              errorText={errors.slug?.message}
            >
              <Input
                id="slug"
                {...register('slug', {
                  required: 'Slug is required',
                })}
              />
            </Field>
            <Field label="Description">
              <Textarea id="description" {...register('description')} />
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter gap={2}>
          <DialogActionTrigger asChild>
            <Button
              variant="subtle"
              colorPalette="gray"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </DialogActionTrigger>
          <Button
            variant="solid"
            type="submit"
            disabled={!isValid}
            loading={isSubmitting}
          >
            Save
          </Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
