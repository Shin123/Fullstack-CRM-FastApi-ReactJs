import {
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { z } from 'zod'

import type {
  InventoryTransactionPublic,
  InventoryTransactionType,
} from '@/client'
import { InventoryService, ProductsService, UsersService } from '@/client'
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination'

const PAGE_SIZE = 50
const inventorySearchSchema = z.object({
  productId: z.string().catch(''),
})

export const Route = createFileRoute('/_layout/products/adjust-stock')({
  component: InventoryTransactionsPage,
  validateSearch: (search) => inventorySearchSchema.parse(search),
})

function InventoryTransactionsPage() {
  const search = Route.useSearch()
  type Filters = {
    productId: string
    actorId: string
    txType: string
    fromDate: string
    toDate: string
    orderId: string
    page: number
  }
  const [filters, setFilters] = useState<Filters>({
    productId: search.productId ?? '',
    actorId: '',
    txType: '',
    fromDate: '',
    toDate: '',
    orderId: '',
    page: 1,
  })

  const filterParams = useMemo(() => {
    const txType = filters.txType
      ? (filters.txType as InventoryTransactionType)
      : undefined
    const fromDate = filters.fromDate
      ? new Date(filters.fromDate).toISOString()
      : undefined
    const toDate = filters.toDate
      ? new Date(filters.toDate).toISOString()
      : undefined
    return { txType, fromDate, toDate }
  }, [filters.txType, filters.fromDate, filters.toDate])

  const { data: productsData } = useQuery({
    queryKey: ['products', 'options', 'inventory'],
    queryFn: () => ProductsService.readProducts({ limit: 500 }),
  })
  const productMap = useMemo(() => {
    const map = new Map<string, string>()
    productsData?.data?.forEach((product) => {
      map.set(product.id, product.name)
    })
    return map
  }, [productsData?.data])

  const { data: usersData } = useQuery({
    queryKey: ['users', 'options', 'inventory'],
    queryFn: () => UsersService.readUsers({ limit: 200 }),
  })
  const userMap = useMemo(() => {
    const map = new Map<string, string>()
    usersData?.data?.forEach((user) => {
      map.set(user.id, user.full_name || user.email || 'Unnamed User')
    })
    return map
  }, [usersData?.data])

  const {
    data: transactionsData,
    isLoading,
    isFetching,
  } = useQuery<{
    data: InventoryTransactionPublic[]
    count: number
  }>({
    queryKey: ['inventory-transactions', filters, filterParams],
    queryFn: () =>
      InventoryService.readInventoryTransactions({
        productId: filters.productId || undefined,
        orderId: filters.orderId || undefined,
        txType: filterParams.txType,
        fromDate: filterParams.fromDate,
        toDate: filterParams.toDate,
        skip: (filters.page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  })

  const transactions = transactionsData?.data ?? []
  const count = transactionsData?.count ?? 0

  const updateFilters = (patch: Partial<Omit<Filters, 'page'>>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: 1,
    }))
  }

  const setPage = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }))
  }

  return (
    <Container maxW="7xl" py={12}>
      <Stack gap={6}>
        <Heading size="lg">Inventory Transactions</Heading>
        <Text color="gray.500">
          Search across all stock adjustments using the filters below.
        </Text>
        <Stack gap={4} borderWidth="1px" borderRadius="md" p={4}>
          <HStack gap={3} flexWrap="wrap">
            <NativeSelectRoot width={{ base: '100%', md: '220px' }}>
              <NativeSelectField
                value={filters.productId}
                onChange={(e) => updateFilters({ productId: e.target.value })}
              >
                <option value="">All Products</option>
                {productsData?.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
            <NativeSelectRoot width={{ base: '100%', md: '220px' }}>
              <NativeSelectField
                value={filters.actorId}
                onChange={(e) => updateFilters({ actorId: e.target.value })}
              >
                <option value="">All Actors</option>
                {usersData?.data?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
            <NativeSelectRoot width={{ base: '100%', md: '180px' }}>
              <NativeSelectField
                value={filters.txType}
                onChange={(e) => updateFilters({ txType: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="sale">Sale</option>
                <option value="return">Return</option>
                <option value="adjustment">Adjustment</option>
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
            <Input
              placeholder="Order ID"
              value={filters.orderId}
              onChange={(e) => updateFilters({ orderId: e.target.value })}
              width={{ base: '100%', md: '200px' }}
            />
          </HStack>
          <HStack gap={3} flexWrap="wrap">
            <Input
              type="datetime-local"
              value={filters.fromDate}
              onChange={(e) => updateFilters({ fromDate: e.target.value })}
              width={{ base: '100%', md: '220px' }}
            />
            <Input
              type="datetime-local"
              value={filters.toDate}
              onChange={(e) => updateFilters({ toDate: e.target.value })}
              width={{ base: '100%', md: '220px' }}
            />
            <Button
              variant="subtle"
              onClick={() =>
                setFilters({
                  productId: '',
                  actorId: '',
                  txType: '',
                  fromDate: '',
                  toDate: '',
                  orderId: '',
                  page: 1,
                })
              }
            >
              Reset
            </Button>
          </HStack>
        </Stack>

        {isLoading ? (
          <Stack gap={4}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton height="60px" key={idx} />
            ))}
          </Stack>
        ) : transactions.length === 0 ? (
          <Text color="gray.500">No transactions found for the filters.</Text>
        ) : (
          <>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Product</Table.ColumnHeader>
                  <Table.ColumnHeader>Type</Table.ColumnHeader>
                  <Table.ColumnHeader>Quantity</Table.ColumnHeader>
                  <Table.ColumnHeader>Actor</Table.ColumnHeader>
                  <Table.ColumnHeader>Order</Table.ColumnHeader>
                  <Table.ColumnHeader>Memo</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {transactions.map((tx) => (
                  <Table.Row key={tx.id} opacity={isFetching ? 0.6 : 1}>
                    <Table.Cell>
                      {new Date(tx.created_at).toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>
                      {tx.product_id ? (
                        <RouterLink
                          to="/products/$productId"
                          params={{ productId: tx.product_id }}
                          style={{ fontWeight: 600, color: '#14b8a6' }}
                        >
                          {productMap.get(tx.product_id) || tx.product_id}
                        </RouterLink>
                      ) : (
                        '—'
                      )}
                    </Table.Cell>
                    <Table.Cell textTransform="capitalize">
                      {tx.type}
                    </Table.Cell>
                    <Table.Cell
                      color={tx.quantity < 0 ? 'red.500' : 'green.600'}
                    >
                      {tx.quantity}
                    </Table.Cell>
                    <Table.Cell>
                      {tx.actor_id
                        ? userMap.get(tx.actor_id) || tx.actor_id
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>
                      {tx.order_id ? (
                        <RouterLink
                          to="/orders/$orderId"
                          params={{ orderId: tx.order_id }}
                          style={{ color: '#14b8a6' }}
                        >
                          {tx.order_id}
                        </RouterLink>
                      ) : (
                        '—'
                      )}
                    </Table.Cell>
                    <Table.Cell>{tx.memo ?? '—'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
            <Flex justify="flex-end">
              <PaginationRoot
                count={count}
                pageSize={PAGE_SIZE}
                page={filters.page}
                onPageChange={({ page }) => setPage(page)}
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
      </Stack>
    </Container>
  )
}

export default InventoryTransactionsPage
