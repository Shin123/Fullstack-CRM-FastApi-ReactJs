import {
  Button,
  ButtonGroup,
  Combobox,
  DialogActionTrigger,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Text,
  VStack,
  useFilter,
  useListCollection,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { FaExchangeAlt } from 'react-icons/fa'

import type {
  ApiError,
  OrderPublic,
  OrderUpdate,
  PaymentStatus,
  OrderStatus,
} from '@/client'
import { OrdersService, UsersService } from '@/client'
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
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      status: order.status ?? 'draft',
      payment_status: order.payment_status ?? 'unpaid',
      assigned_to: order.assigned_to ?? '',
    },
  })
  const [assigneeInputValue, setAssigneeInputValue] = useState('')
  const assignedValue = watch('assigned_to') ?? ''

  const { data: usersData } = useQuery({
    queryKey: ['users', 'assignees'],
    queryFn: () => UsersService.readUsers({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })

  const userItems = useMemo(
    () =>
      usersData?.data?.map((user) => {
        const primary = user.full_name || user.email || 'Unnamed User'
        const label = user.email ? `${primary} (${user.email})` : primary
        return { id: user.id, label, value: user.id }
      }) ?? [],
    [usersData?.data]
  )

  const { contains } = useFilter({ sensitivity: 'base' })

  const {
    collection,
    filter: filterCollection,
    set: setCollection,
  } = useListCollection({ initialItems: userItems, filter: contains })
  console.log(collection, 'collection')

  useEffect(() => {
    setCollection(userItems)
  }, [setCollection, userItems])

  useEffect(() => {
    const matchedItem =
      userItems.find((item) => item.value === assignedValue)?.label ?? ''
    setAssigneeInputValue(matchedItem)
  }, [assignedValue, userItems])

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
                <Combobox.Root
                  width="100%"
                  positioning={{ sameWidth: true }}
                  value={assignedValue ? [assignedValue] : []}
                  inputValue={assigneeInputValue}
                  collection={collection}
                  onInputValueChange={({ inputValue }) => {
                    setAssigneeInputValue(inputValue)
                    filterCollection(inputValue)
                    if (!inputValue) {
                      setValue('assigned_to', '', { shouldDirty: true })
                    }
                  }}
                  onValueChange={({ value }) => {
                    const nextValue = value[0] ?? ''
                    setValue('assigned_to', nextValue, { shouldDirty: true })
                    const matchedItem =
                      userItems.find((item) => item.value === nextValue)
                        ?.label ?? ''
                    setAssigneeInputValue(matchedItem)
                  }}
                >
                  <Combobox.Control>
                    <Combobox.Input placeholder="Select assignee" />
                    <Combobox.IndicatorGroup>
                      <Combobox.ClearTrigger />
                      <Combobox.Trigger />
                    </Combobox.IndicatorGroup>
                  </Combobox.Control>
                  <Combobox.Positioner>
                    <Combobox.Content zIndex="popover">
                      <Combobox.Empty>No users found</Combobox.Empty>
                      {collection.items.map((item) => (
                        <Combobox.Item item={item} key={item.value}>
                          {item.label}
                          <Combobox.ItemIndicator />
                        </Combobox.Item>
                      ))}
                    </Combobox.Content>
                  </Combobox.Positioner>
                </Combobox.Root>
                <input type="hidden" {...register('assigned_to')} />
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
