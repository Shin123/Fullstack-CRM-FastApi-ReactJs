import {
  Button,
  ButtonGroup,
  Flex,
  Input,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import type {
  ApiError,
  InventoryTransactionPublic,
  ProductPublic,
} from '@/client'
import { InventoryService } from '@/client'
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
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import useCustomToast from '@/hooks/useCustomToast'
import { handleError } from '@/utils'

interface AdjustProductStockProps {
  product: ProductPublic
}

interface AdjustmentFormValues {
  quantity: string
  memo?: string
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

const AdjustProductStock = ({ product }: AdjustProductStockProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AdjustmentFormValues>({
    defaultValues: {
      quantity: '',
      memo: '',
    },
  })

  const { data: transactionData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['inventory-transactions', product.id],
    queryFn: () =>
      InventoryService.readInventoryTransactions({
        productId: product.id,
        limit: 10,
      }),
    enabled: isOpen,
  })

  const transactions: InventoryTransactionPublic[] =
    transactionData?.data ?? []

  const mutation = useMutation({
    mutationFn: (values: AdjustmentFormValues) => {
      const parsedQuantity = Number(values.quantity)
      if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
        throw new Error('Quantity must be a non-zero number')
      }
      return InventoryService.createInventoryAdjustment({
        requestBody: {
          product_id: product.id,
          quantity: parsedQuantity,
          memo: values.memo?.trim() || undefined,
        },
      })
    },
    onSuccess: () => {
      showSuccessToast('Stock updated.')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({
        queryKey: ['inventory-transactions', product.id],
      })
      reset()
      setIsOpen(false)
    },
    onError: (error: ApiError | Error) => {
      if (error instanceof Error && error.message) {
        setError('quantity', { type: 'validate', message: error.message })
        return
      }
      handleError(error as ApiError)
    },
  })

  const onSubmit = (values: AdjustmentFormValues) => {
    const parsedQuantity = Number(values.quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      setError('quantity', {
        type: 'validate',
        message: 'Quantity must be a non-zero number',
      })
      return
    }
    mutation.mutate(values)
  }

  return (
    <DialogRoot
      size={{ base: 'sm', md: 'lg' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
        if (!open) {
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="fg.muted">
                {product.name} — Current stock:{' '}
                <Text as="span" fontWeight="semibold" color="fg">
                  {product.stock}
                </Text>
              </Text>
              <Field
                label="Quantity"
                helperText="Positive numbers increase stock, negative numbers decrease it."
                errorText={errors.quantity?.message}
              >
                <Input
                  type="number"
                  step="1"
                  placeholder="e.g. 5 or -3"
                  {...register('quantity', {
                    required: 'Quantity is required',
                  })}
                />
              </Field>
              <Field label="Memo (optional)">
                <Textarea
                  placeholder="Add a short note for audit trail"
                  {...register('memo')}
                />
              </Field>
              <VStack align="stretch" gap={2}>
                <Text fontWeight="medium">Recent Transactions</Text>
                {isLoadingTransactions ? (
                  <Text fontSize="sm" color="fg.muted">
                    Loading history...
                  </Text>
                ) : transactions.length === 0 ? (
                  <Text fontSize="sm" color="fg.muted">
                    No transactions yet.
                  </Text>
                ) : (
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Date</Table.ColumnHeader>
                        <Table.ColumnHeader>Type</Table.ColumnHeader>
                        <Table.ColumnHeader>Qty</Table.ColumnHeader>
                        <Table.ColumnHeader>Memo</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {transactions.map((tx) => (
                        <Table.Row key={tx.id}>
                          <Table.Cell>{formatDateTime(tx.created_at)}</Table.Cell>
                          <Table.Cell textTransform="capitalize">
                            {tx.type}
                          </Table.Cell>
                          <Table.Cell color={tx.quantity < 0 ? 'red.500' : 'green.600'}>
                            {tx.quantity}
                          </Table.Cell>
                          <Table.Cell>{tx.memo || '—'}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </VStack>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button variant="subtle" colorPalette="gray" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button
                type="submit"
                variant="solid"
                loading={isSubmitting || mutation.isPending}
              >
                Save Adjustment
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default AdjustProductStock
