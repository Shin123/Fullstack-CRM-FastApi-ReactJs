import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { FaExchangeAlt } from 'react-icons/fa'

import type {
  ApiError,
  OrderPublic,
  OrderUpdate,
  PaymentStatus,
  OrderStatus,
} from '@/client'
import { OrdersService } from '@/client'
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

const ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'confirmed',
  'paid',
  'fulfilled',
  'cancelled',
]

const PAYMENT_STATUSES: PaymentStatus[] = [
  'unpaid',
  'pending',
  'paid',
  'refunded',
]

interface UpdateOrderStatusProps {
  order: OrderPublic
  triggerLabel?: string
}

interface FormValues {
  status: OrderStatus | ''
  payment_status: PaymentStatus | ''
  assigned_to?: string | null
}

const UpdateOrderStatus = ({
  order,
  triggerLabel = 'Update Order',
}: UpdateOrderStatusProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      status: order.status ?? 'draft',
      payment_status: order.payment_status ?? 'unpaid',
      assigned_to: order.assigned_to ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: OrderUpdate = {
        status: values.status || null,
        payment_status: values.payment_status || null,
        assigned_to:
          values.assigned_to && values.assigned_to.trim() !== ''
            ? values.assigned_to
            : null,
      }
      return OrdersService.updateOrder({
        orderId: order.id,
        requestBody: payload,
      })
    },
    onSuccess: () => {
      showSuccessToast('Order updated.')
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', { id: order.id }] })
      reset()
    },
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutation.mutate(values)
  }

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'sm' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Adjust the order status information below.</Text>
            <VStack gap={4}>
              <Field label="Order Status">
                <NativeSelectRoot width="100%">
                  <NativeSelectField id="status" {...register('status')}>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>
              </Field>
              <Field label="Payment Status">
                <NativeSelectRoot width="100%">
                  <NativeSelectField
                    id="payment_status"
                    {...register('payment_status')}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>
              </Field>
              <Field label="Assigned To">
                <Input
                  id="assigned_to"
                  placeholder="user@example.com"
                  {...register('assigned_to')}
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
              <Button type="submit" variant="solid" loading={isSubmitting}>
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

export default UpdateOrderStatus
