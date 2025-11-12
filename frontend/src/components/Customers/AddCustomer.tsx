import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
  Input,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { FaPlus } from 'react-icons/fa'

import type { ApiError, CustomerCreate } from '@/client'
import { CustomersService } from '@/client'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import useCustomToast from '@/hooks/useCustomToast'
import { handleError } from '@/utils'

const AddCustomer = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CustomerCreate>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CustomerCreate) =>
      CustomersService.createCustomer({ requestBody: values }),
    onSuccess: () => {
      showSuccessToast('Customer created.')
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const onSubmit: SubmitHandler<CustomerCreate> = (data) => {
    mutation.mutate({
      ...data,
      email: data.email && data.email.trim() !== '' ? data.email : null,
      address: data.address && data.address.trim() !== '' ? data.address : null,
    })
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
          <FaPlus fontSize="16px" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent maxH="85vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <DialogBody maxH="55vh" overflowY="auto">
            <Text mb={4}>Enter the customer information below.</Text>
            <VStack gap={4}>
              <Field
                required
                label="Full Name"
                invalid={!!errors.name}
                errorText={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register('name', { required: 'Name is required' })}
                />
              </Field>
              <Field
                required
                label="Phone"
                invalid={!!errors.phone}
                errorText={errors.phone?.message}
              >
                <Input
                  id="phone"
                  placeholder="+1 555 555 5555"
                  {...register('phone', { required: 'Phone is required' })}
                />
              </Field>
              <Field
                label="Email"
                invalid={!!errors.email}
                errorText={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                />
              </Field>
              <Field label="Address">
                <Textarea
                  id="address"
                  placeholder="123 Main St, City"
                  {...register('address')}
                />
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
              <Button
                variant="solid"
                type="submit"
                disabled={!isValid}
                loading={isSubmitting}
              >
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

export default AddCustomer
