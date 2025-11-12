import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Separator,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { CustomerPublic, OrderPublic } from '@/client'
import { CustomersService, OrdersService } from '@/client'
import DeleteOrder from '@/components/Orders/DeleteOrder'
import UpdateOrderStatus from '@/components/Orders/UpdateOrderStatus'

const formatCurrency = (value?: string) => {
  if (!value) return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export const Route = createFileRoute('/_layout/orders/$orderId')({
  component: OrderDetail,
})

function OrderDetail() {
  const { orderId } = Route.useParams()

  const {
    data: order,
    isLoading,
    error,
  } = useQuery<OrderPublic>({
    queryKey: ['order', { id: orderId }],
    queryFn: () => OrdersService.readOrder({ orderId }),
  })

  const { data: customer } = useQuery<CustomerPublic>({
    queryKey: ['customer', order?.customer_id],
    queryFn: () =>
      CustomersService.readCustomer({ customerId: order!.customer_id }),
    enabled: !!order?.customer_id,
  })

  if (isLoading) {
    return (
      <Container maxW="5xl" py={12}>
        <Stack gap={4}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton height="80px" key={idx} />
          ))}
        </Stack>
      </Container>
    )
  }

  if (error || !order) {
    return (
      <Container maxW="4xl" py={12}>
        <Text color="red.500">Unable to load order details.</Text>
      </Container>
    )
  }

  return (
    <Container maxW="full" py={12}>
      <Flex align="center" justify="space-between" mb={6} gap={4}>
        <Box>
          <Heading size="lg">Order {order.order_number}</Heading>
          <Text color="gray.500">
            Created at {formatDate(order.created_at)}
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          <UpdateOrderStatus order={order} triggerLabel="Update Order" />
          <DeleteOrder orderId={order.id} />
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={8}>
        <SummaryCard title="Status">
          <Badge>{order.status ?? '—'}</Badge>
        </SummaryCard>
        <SummaryCard title="Payment">
          <Badge colorPalette="purple">{order.payment_status ?? '—'}</Badge>
        </SummaryCard>
        <SummaryCard title="Assigned To">
          <Text>{order.assigned_to ?? 'Unassigned'}</Text>
        </SummaryCard>
      </SimpleGrid>

      <Stack gap={6}>
        <DetailSection title="Customer">
          <Text fontWeight="semibold">
            {customer?.name ?? order.customer_id}
          </Text>
          <Text color="gray.600">{customer?.email ?? 'No email'}</Text>
          <Text color="gray.600">{customer?.phone ?? 'No phone'}</Text>
          <Text color="gray.600">
            {order.shipping_address ?? 'No shipping address'}
          </Text>
        </DetailSection>

        <DetailSection title="Totals">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <InfoRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            <InfoRow
              label="Discount"
              value={formatCurrency(order.discount_total)}
            />
            <InfoRow label="Tax" value={formatCurrency(order.tax_total)} />
            <InfoRow
              label="Shipping Fee"
              value={formatCurrency(order.shipping_fee)}
            />
            <InfoRow
              label="Grand Total"
              value={formatCurrency(order.grand_total)}
            />
          </SimpleGrid>
        </DetailSection>

        <DetailSection title="Items">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Product</Table.ColumnHeader>
                <Table.ColumnHeader>SKU</Table.ColumnHeader>
                <Table.ColumnHeader>Quantity</Table.ColumnHeader>
                <Table.ColumnHeader>Unit Price</Table.ColumnHeader>
                <Table.ColumnHeader>Total</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {order.items.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.product_name}</Table.Cell>
                  <Table.Cell>{item.sku ?? '—'}</Table.Cell>
                  <Table.Cell>{item.quantity}</Table.Cell>
                  <Table.Cell>{formatCurrency(item.unit_price)}</Table.Cell>
                  <Table.Cell>{formatCurrency(item.total_price)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </DetailSection>

        <DetailSection title="Timeline">
          <InfoRow
            label="Confirmed At"
            value={formatDate(order.confirmed_at)}
          />
          <InfoRow label="Paid At" value={formatDate(order.paid_at)} />
          <InfoRow
            label="Fulfilled At"
            value={formatDate(order.fulfilled_at)}
          />
          <InfoRow
            label="Cancelled At"
            value={formatDate(order.cancelled_at)}
          />
        </DetailSection>

        {order.notes && (
          <DetailSection title="Notes">
            <Text>{order.notes}</Text>
          </DetailSection>
        )}
      </Stack>
    </Container>
  )
}

const SummaryCard = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <Box borderWidth="1px" borderRadius="md" p={4}>
    <Text fontSize="sm" color="gray.500">
      {title}
    </Text>
    <Text fontWeight="semibold" mt={2}>
      {children}
    </Text>
  </Box>
)

const DetailSection = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <Box borderWidth="1px" borderRadius="md" p={4}>
    <Text fontWeight="semibold" mb={2}>
      {title}
    </Text>
    <Separator mb={4} />
    <Stack gap={2}>{children}</Stack>
  </Box>
)

const InfoRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <Flex justify="space-between" fontSize="sm">
    <Text color="gray.600">{label}</Text>
    <Text fontWeight="medium">{value}</Text>
  </Flex>
)
