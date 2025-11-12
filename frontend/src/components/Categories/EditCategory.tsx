import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaExchangeAlt } from "react-icons/fa"

import type {
  ApiError,
  CategoryPublic,
  CategoryUpdate,
} from "@/client"
import { CategoriesService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditCategoryProps {
  category: CategoryPublic
}

export const EditCategory = ({ category }: EditCategoryProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      ...category,
      description: category.description ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CategoryUpdate) =>
      CategoriesService.updateCategory({
        categoryId: category.id,
        requestBody: data,
      }),
    onSuccess: (_data, variables) => {
      showSuccessToast("Category updated.")
      if (variables) {
        reset({
          ...variables,
          description: variables.description ?? undefined,
        })
      } else {
        reset()
      }
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })

  const onSubmit: SubmitHandler<CategoryUpdate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          Edit Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the category details below.</Text>
            <VStack gap={4}>
              <Field
                required
                label="Name"
                invalid={!!errors.name}
                errorText={errors.name?.message}
              >
                <Input
                  id="name"
                  {...register("name", {
                    required: "Name is required",
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
                  {...register("slug", {
                    required: "Slug is required",
                  })}
                />
              </Field>
              <Field
                label="Description"
                invalid={!!errors.description}
                errorText={errors.description?.message}
              >
                <Textarea id="description" {...register("description")} />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button variant="solid" type="submit" loading={isSubmitting}>
                Save
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
