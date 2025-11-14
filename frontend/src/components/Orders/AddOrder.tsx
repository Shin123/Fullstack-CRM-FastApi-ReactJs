import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  DialogActionTrigger,
  HStack,
  IconButton,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { type SubmitHandler, useFieldArray, useForm } from 'react-hook-form'
import { FaPlus } from 'react-icons/fa'
import { FiTrash2 } from 'react-icons/fi'

import type {
  ApiError,
  CustomerPublic,
  OrderCreate,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductPublic,
} from '@/client'
import { CustomersService, OrdersService, ProductsService } from '@/client'
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

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'cod',
  'card',
  'bank_transfer',
]

interface OrderItemForm {
  product_id: string
  quantity: number
}

interface OrderFormValues {
  customer_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  shipping_address?: string
  billing_address?: string
  notes?: string
  discount_total?: string
  tax_total?: string
  shipping_fee?: string
  items: OrderItemForm[]
}

const AddOrder = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<OrderFormValues>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      customer_id: '',
      status: 'draft',
      payment_status: 'unpaid',
      payment_method: 'cash',
      items: [{ product_id: '', quantity: 1 }],
      shipping_address: '',
      billing_address: '',
      notes: '',
      discount_total: '',
      tax_total: '',
      shipping_fee: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => CustomersService.readCustomers({ limit: 100 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () => ProductsService.readProducts({ limit: 100 }),
  })

  const customers = customersData?.data ?? []
  const products = productsData?.data ?? []

  const mutation = useMutation({
    mutationFn: (values: OrderFormValues) => {
      const payload: OrderCreate = {
        customer_id: values.customer_id,
        status: values.status,
        payment_status: values.payment_status,
        payment_method: values.payment_method,
        shipping_address:
          values.shipping_address && values.shipping_address.trim() !== ''
            ? values.shipping_address
            : undefined,
        billing_address:
          values.billing_address && values.billing_address.trim() !== ''
            ? values.billing_address
            : undefined,
        notes:
          values.notes && values.notes.trim() !== '' ? values.notes : undefined,
        discount_total:
          values.discount_total && values.discount_total.trim() !== ''
            ? Number(values.discount_total)
            : undefined,
        tax_total:
          values.tax_total && values.tax_total.trim() !== ''
            ? Number(values.tax_total)
            : undefined,
        shipping_fee:
          values.shipping_fee && values.shipping_fee.trim() !== ''
            ? Number(values.shipping_fee)
            : undefined,
        items: values.items
          .filter((item) => item.product_id)
          .map((item) => ({
            product_id: item.product_id,
            quantity: Number(item.quantity) || 1,
          })),
      }

      return OrdersService.createOrder({ requestBody: payload })
    },
    onSuccess: () => {
      showSuccessToast('Order created.')
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const onSubmit: SubmitHandler<OrderFormValues> = (values) => {
    mutation.mutate(values)
  }

  const selectedProducts = useMemo(() => {
    const map = new Map<string, ProductPublic>()
    products.forEach((product) => {
      map.set(product.id, product)
    })
    return map
  }, [products])

  const totalItems = watch('items')

  const lowStockWarnings = useMemo(() => {
    return totalItems
      .map((item) => {
        const product = selectedProducts.get(item.product_id)
        if (!product) {
          return null
        }
        const requestedQty = Number(item.quantity) || 0
        const availableStock = product.stock ?? 0
        if (requestedQty > availableStock) {
          return {
            productId: product.id,
            name: product.name,
            requested: requestedQty,
            stock: availableStock,
          }
        }
        return null
      })
      .filter(Boolean) as {
      productId: string
      name: string
      requested: number
      stock: number
    }[]
  }, [selectedProducts, totalItems])

  const canSubmit =
    totalItems.every((item) => item.product_id && item.quantity > 0) &&
    watch('customer_id')

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'lg' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        if (open === false) {
          reset()
        }
        setIsOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button my={4}>
          <FaPlus fontSize="16px" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent maxH="90vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <DialogBody maxH="60vh" overflowY="auto">
            <VStack gap={6} align="stretch">
              <Field
                required
                label="Customer"
                invalid={!!errors.customer_id}
                errorText={errors.customer_id?.message}
              >
                <NativeSelectRoot width="100%">
                  <NativeSelectField
                    id="customer_id"
                    {...register('customer_id', {
                      required: 'Customer is required',
                    })}
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer: CustomerPublic) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone})
                      </option>
                    ))}
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>
              </Field>

              <HStack gap={4} flexWrap="wrap">
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
                <Field label="Payment Method">
                  <NativeSelectRoot width="100%">
                    <NativeSelectField
                      id="payment_method"
                      {...register('payment_method')}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </NativeSelectField>
                    <NativeSelectIndicator />
                  </NativeSelectRoot>
                </Field>
              </HStack>

              <Field label="Shipping Address">
                <Textarea
                  id="shipping_address"
                  placeholder="123 Main St, City"
                  {...register('shipping_address')}
                />
              </Field>

              <Field label="Billing Address">
                <Textarea
                  id="billing_address"
                  placeholder="123 Main St, City"
                  {...register('billing_address')}
                />
              </Field>

              <Field label="Notes">
                <Textarea
                  id="notes"
                  placeholder="Special instructions"
                  {...register('notes')}
                />
              </Field>

              <HStack gap={4} flexWrap="wrap">
                <Field label="Shipping Fee">
                  <Input
                    id="shipping_fee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('shipping_fee')}
                  />
                </Field>
                <Field label="Tax Total">
                  <Input
                    id="tax_total"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('tax_total')}
                  />
                </Field>
                <Field label="Discount Total">
                  <Input
                    id="discount_total"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('discount_total')}
                  />
                </Field>
              </HStack>

              <Box>
                <Text fontWeight="semibold" mb={3}>
                  Order Items
                </Text>
                <VStack gap={3} align="stretch">
                  {fields.map((field, index) => {
                    const currentItem = totalItems[index]
                    const product = currentItem?.product_id
                      ? selectedProducts.get(currentItem.product_id)
                      : undefined
                    const availableStock = product?.stock ?? 0
                    const requestedQty = Number(currentItem?.quantity) || 0
                    const exceedsStock =
                      product && requestedQty > availableStock

                    return (
                      <HStack
                        key={field.id}
                        gap={3}
                        align="stretch"
                        flexWrap="wrap"
                      >
                        <Field
                          required
                          label="Product"
                          invalid={!!errors.items?.[index]?.product_id}
                          errorText={errors.items?.[index]?.product_id?.message}
                        >
                          <NativeSelectRoot width="100%">
                            <NativeSelectField
                              {...register(
                                `items.${index}.product_id` as const,
                                {
                                  required: 'Product is required',
                                }
                              )}
                            >
                              <option value="">Select product</option>
                              {products.map((product: ProductPublic) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </option>
                              ))}
                            </NativeSelectField>
                            <NativeSelectIndicator />
                          </NativeSelectRoot>
                        </Field>
                        <Field
                          required
                          label="Qty"
                          invalid={!!errors.items?.[index]?.quantity}
                          errorText={errors.items?.[index]?.quantity?.message}
                        >
                          <Input
                            type="number"
                            min={1}
                            {...register(`items.${index}.quantity` as const, {
                              required: 'Quantity is required',
                              valueAsNumber: true,
                              min: {
                                value: 1,
                                message: 'Minimum quantity is 1',
                              },
                            })}
                          />
                          {product ? (
                            <Text fontSize="xs" color="fg.muted" mt={1}>
                              Stock available: {availableStock}
                            </Text>
                          ) : null}
                          {exceedsStock ? (
                            <Text fontSize="xs" color="orange.600" mt={1}>
                              Exceeds stock by {requestedQty - availableStock}.
                              Order can still be saved and adjusted later.
                            </Text>
                          ) : null}
                        </Field>
                        {fields.length > 1 && (
                          <IconButton
                            aria-label="Remove item"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => remove(index)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        )}
                      </HStack>
                    )
                  })}
                  <Button
                    variant="subtle"
                    onClick={() => append({ product_id: '', quantity: 1 })}
                  >
                    + Add another product
                  </Button>
                </VStack>
              </Box>

              {totalItems.length > 0 && (
                <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.subtle">
                  <Text fontWeight="semibold" mb={2}>
                    Order Preview
                  </Text>
                  <VStack align="stretch" gap={1}>
                    {totalItems.map((item, index) => {
                      const product = selectedProducts.get(item.product_id)
                      return (
                        <Text key={fields[index].id} fontSize="sm">
                          {product ? product.name : 'Select a product'} ×{' '}
                          {item.quantity || 0}
                        </Text>
                      )
                    })}
                  </VStack>
                </Box>
              )}
              {lowStockWarnings.length > 0 && (
                <Alert.Root status="warning" variant="subtle">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      <VStack align="stretch" gap={1}>
                        {lowStockWarnings.map((warning) => (
                          <Text key={warning.productId} fontSize="sm">
                            {warning.name}: requested {warning.requested} but
                            only {warning.stock} in stock. Confirming later will
                            create negative inventory.
                          </Text>
                        ))}
                      </VStack>
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
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
                type="submit"
                variant="solid"
                loading={isSubmitting}
                disabled={!canSubmit}
              >
                Save Order
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddOrder
