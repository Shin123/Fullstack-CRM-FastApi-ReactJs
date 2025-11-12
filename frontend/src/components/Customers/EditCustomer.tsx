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
import { FaExchangeAlt } from 'react-icons/fa'

import type { ApiError, CustomerPublic, CustomerUpdate } from '@/client'
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

interface CustomerFormValues {
  name: string
  phone: string
  email?: string | null
  address?: string | null
}

interface EditCustomerProps {
  customer: CustomerPublic
}

const EditCustomer = ({ customer }: EditCustomerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      console.log(values, 'values')
      const payload: CustomerUpdate = {
        name: values.name,
        phone: values.phone,
        email: values.email && values.email.trim() !== '' ? values.email : null,
        address:
          values.address && values.address.trim() !== ''
            ? values.address
            : null,
      }

      return CustomersService.updateCustomer({
        customerId: customer.id,
        requestBody: payload,
      })
    },
    onSuccess: (_data, values) => {
      showSuccessToast('Customer updated.')
      reset(values)
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({
        queryKey: ['customer', { id: customer.id }],
      })
    },
  })

  const onSubmit: SubmitHandler<CustomerFormValues> = (values) => {
    mutation.mutate(values)
  }

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'md' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          Edit Customer
        </Button>
      </DialogTrigger>
      <DialogContent maxH="85vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <DialogBody maxH="55vh" overflowY="auto">
            <Text mb={4}>Update the customer information.</Text>
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
              <Field label="Email">
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

export default EditCustomer
