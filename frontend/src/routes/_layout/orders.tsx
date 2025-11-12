import {
  Badge,
  Container,
  EmptyState,
  Flex,
  Heading,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { z } from 'zod'

import type { CustomerPublic } from '@/client'
import {
  CustomersService,
  OrdersService,
  type OrderStatus,
  type PaymentStatus,
} from '@/client'
import AddOrder from '@/components/Orders/AddOrder'
import OrderActionsMenu from '@/components/Orders/OrderActionsMenu'
import PendingOrders from '@/components/Pending/PendingOrders'
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination.tsx'
import { Outlet } from '@tanstack/react-router'

const ORDER_STATUSES = [
  'draft',
  'confirmed',
  'paid',
  'fulfilled',
  'cancelled',
] as const satisfies readonly OrderStatus[]

const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'refunded',
] as const satisfies readonly PaymentStatus[]

const ordersSearchSchema = z.object({
  page: z.number().catch(1),
  query: z.string().catch(''),
  status: z.enum(ORDER_STATUSES).or(z.literal('')).catch(''),
  paymentStatus: z.enum(PAYMENT_STATUSES).or(z.literal('')).catch(''),
  customerId: z.string().catch(''),
  assignedTo: z.string().catch(''),
  fromDate: z.string().catch(''),
  toDate: z.string().catch(''),
})

type OrdersSearch = z.infer<typeof ordersSearchSchema>

const PER_PAGE = 10

function getOrdersQueryOptions(search: OrdersSearch) {
  const {
    page,
    status,
    paymentStatus,
    customerId,
    assignedTo,
    fromDate,
    toDate,
  } = search

  return {
    queryFn: () =>
      OrdersService.readOrders({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        status: status ? (status as OrderStatus) : undefined,
        paymentStatus: paymentStatus
          ? (paymentStatus as PaymentStatus)
          : undefined,
        customerId: customerId || undefined,
        assignedTo: assignedTo || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    queryKey: [
      'orders',
      { page, status, paymentStatus, customerId, assignedTo, fromDate, toDate },
    ],
  }
}

const formatCurrency = (value?: string) => {
  if (!value) return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatStatusLabel = (value?: string | null) => {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export const Route = createFileRoute('/_layout/orders')({
  component: Orders,
  validateSearch: (search) => ordersSearchSchema.parse(search),
})

function OrdersTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const [searchTerm, setSearchTerm] = useState(search.query)

  const updateSearch = useCallback(
    (updates: Partial<OrdersSearch>) => {
      navigate({
        search: (prev: OrdersSearch) => ({ ...prev, ...updates }),
      })
    },
    [navigate]
  )

  useEffect(() => {
    setSearchTerm(search.query)
  }, [search.query])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm === search.query) return
      updateSearch({ query: searchTerm, page: 1 })
    }, 800)
    return () => clearTimeout(timeout)
  }, [searchTerm, search.query, updateSearch])

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getOrdersQueryOptions(search),
    placeholderData: (prevData) => prevData,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => CustomersService.readCustomers({ limit: 500 }),
  })

  const customerMap = useMemo(() => {
    const map = new Map<string, CustomerPublic>()
    customersData?.data.forEach((customer) => {
      map.set(customer.id, customer)
    })
    return map
  }, [customersData])

  const orders = data?.data ?? []
  const count = data?.count ?? 0

  const normalizedQuery = search.query.trim().toLowerCase()
  const filteredOrders = normalizedQuery
    ? orders.filter((order) => {
        const orderNumberMatch = order.order_number
          .toLowerCase()
          .includes(normalizedQuery)
        const customer = customerMap.get(order.customer_id)
        const customerMatch =
          customer?.name?.toLowerCase().includes(normalizedQuery) ||
          customer?.email?.toLowerCase().includes(normalizedQuery)
        return orderNumberMatch || customerMatch
      })
    : orders

  if (isLoading) {
    return <PendingOrders />
  }

  return (
    <>
      <Flex gap={4} mb={4} direction={{ base: 'column', md: 'row' }}>
        <Input
          placeholder="Search by order # or customer"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (searchTerm !== search.query) {
                updateSearch({ query: searchTerm, page: 1 })
              }
            }
          }}
        />
        <NativeSelectRoot w={{ base: '100%', md: '200px' }}>
          <NativeSelectField
            value={search.status}
            onChange={(e) =>
              updateSearch({
                status: e.target.value as OrdersSearch['status'],
                page: 1,
              })
            }
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
        <NativeSelectRoot w={{ base: '100%', md: '220px' }}>
          <NativeSelectField
            value={search.paymentStatus}
            onChange={(e) =>
              updateSearch({
                paymentStatus: e.target.value as OrdersSearch['paymentStatus'],
                page: 1,
              })
            }
          >
            <option value="">All payments</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
      </Flex>

      {filteredOrders.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch />
            </EmptyState.Indicator>
            <VStack textAlign="center">
              <EmptyState.Title>No orders found</EmptyState.Title>
              <EmptyState.Description>
                Try adjusting filters or create a new order.
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <>
          <Table.Root size={{ base: 'sm', md: 'md' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Order #</Table.ColumnHeader>
                <Table.ColumnHeader>Customer</Table.ColumnHeader>
                <Table.ColumnHeader>Total</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Payment</Table.ColumnHeader>
                <Table.ColumnHeader>Assigned</Table.ColumnHeader>
                <Table.ColumnHeader>Created</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredOrders.map((order) => (
                <Table.Row key={order.id} opacity={isPlaceholderData ? 0.5 : 1}>
                  <Table.Cell>
                    <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                      <Text color="primary.500" fontWeight="medium">
                        {order.order_number}
                      </Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    {customerMap.get(order.customer_id)?.name ??
                      order.customer_id}
                  </Table.Cell>
                  <Table.Cell>{formatCurrency(order.grand_total)}</Table.Cell>
                  <Table.Cell>
                    <Badge>{formatStatusLabel(order.status)}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="purple">
                      {formatStatusLabel(order.payment_status)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{order.assigned_to ?? 'Unassigned'}</Table.Cell>
                  <Table.Cell>{formatDate(order.created_at)}</Table.Cell>
                  <Table.Cell>
                    <OrderActionsMenu order={order} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Flex justifyContent="flex-end" mt={4}>
            <PaginationRoot
              count={count}
              pageSize={PER_PAGE}
              onPageChange={({ page }) => updateSearch({ page })}
            >
              <Flex>
                <PaginationPrevTrigger />
                <PaginationItems />
                <PaginationNextTrigger />
              </Flex>
            </PaginationRoot>
          </Flex>
        </>
      )}
    </>
  )
}

function Orders() {
  const location = useRouterState({
    select: (state) => state.location,
  })
  const isDetailRoute =
    location.pathname !== '/orders' && location.pathname.startsWith('/orders')

  return (
    <>
      {!isDetailRoute && (
        <Container maxW="full">
          <Heading size="lg" pt={12}>
            Orders Management
          </Heading>
          <AddOrder />
          <OrdersTable />
        </Container>
      )}
      <Outlet />
    </>
  )
}
