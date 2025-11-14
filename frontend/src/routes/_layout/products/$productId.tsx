import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Separator,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'

import type { InventoryTransactionPublic, ProductPublic } from '@/client'
import {
  CategoriesService,
  InventoryService,
  ProductsService,
  UsersService,
} from '@/client'
import AdjustProductStock from '@/components/Products/AdjustProductStock'
import DeleteProduct from '@/components/Products/DeleteProduct'
import EditProduct from '@/components/Products/EditProduct'
import { useCurrency } from '@/hooks/useCurrency'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export const Route = createFileRoute('/_layout/products/$productId')({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { productId } = Route.useParams()
  const { formatCurrency } = useCurrency()

  const {
    data: product,
    isLoading,
    error,
  } = useQuery<ProductPublic>({
    queryKey: ['product', { id: productId }],
    queryFn: () => ProductsService.readProduct({ productId }),
  })

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useQuery<{ data: InventoryTransactionPublic[] }>({
      queryKey: ['inventory-transactions', productId],
      queryFn: () =>
        InventoryService.readInventoryTransactions({
          productId,
          limit: 10,
        }),
      enabled: !!productId,
    })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => CategoriesService.readCategories({ limit: 500 }),
  })
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categoriesData?.data?.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [categoriesData?.data])

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => UsersService.readUsers({ limit: 200 }),
  })
  const userMap = useMemo(() => {
    const map = new Map<string, string>()
    usersData?.data?.forEach((user) => {
      const displayName = user.full_name || user.email || 'Unnamed User'
      map.set(user.id, displayName)
    })
    return map
  }, [usersData?.data])

  if (isLoading) {
    return (
      <Container maxW="5xl" py={12}>
        <Stack gap={4}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton height="80px" key={index} />
          ))}
        </Stack>
      </Container>
    )
  }

  if (error || !product) {
    return (
      <Container maxW="4xl" py={12}>
        <Text color="red.500">Unable to load product details.</Text>
      </Container>
    )
  }

  const transactions = transactionsData?.data ?? []

  return (
    <Container maxW="6xl" py={12}>
      <Flex align="center" justify="space-between" gap={4} mb={8}>
        <Box>
          <Heading size="lg">{product.name}</Heading>
          <Text color="gray.500">SKU: {product.sku}</Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          <EditProduct product={product} />
          <AdjustProductStock product={product} />
          <DeleteProduct id={product.id} />
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={8}>
        <SummaryCard title="Status">
          <Badge>{product.status}</Badge>
        </SummaryCard>
        <SummaryCard title="Stock">
          <Text fontWeight="semibold">{product.stock}</Text>
        </SummaryCard>
        <SummaryCard title="Price">
          <Text fontWeight="semibold">
            {product.price != null ? formatCurrency(product.price) : 'Not set'}
          </Text>
        </SummaryCard>
      </SimpleGrid>

      <Stack gap={8}>
        <DetailSection title="General Information">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={2}>
                Thumbnail
              </Text>
              <Image
                src={
                  product.thumbnail_image || '/assets/images/placeholder.png'
                }
                alt={product.name}
                maxW="240px"
                borderRadius="md"
                objectFit="cover"
              />
            </Box>
            <InfoRow label="Name" value={product.name} />
            <InfoRow label="SKU" value={product.sku} />
            <InfoRow label="Badge" value={product.badge ?? '—'} />
            <InfoRow
              label="Category"
              value={
                product.category_id
                  ? categoryMap.get(product.category_id) || product.category_id
                  : '—'
              }
            />
            <InfoRow
              label="Original Price"
              value={
                product.price_origin != null
                  ? formatCurrency(product.price_origin)
                  : '—'
              }
            />
            <InfoRow
              label="Status"
              value={
                product.status
                  ? product.status.charAt(0).toUpperCase() +
                    product.status.slice(1)
                  : '—'
              }
            />
          </SimpleGrid>
        </DetailSection>

        {product.description ? (
          <DetailSection title="Description">
            <Text color="gray.700">{product.description}</Text>
          </DetailSection>
        ) : null}

        {product.images?.length ? (
          <DetailSection title="Images">
            <Flex gap={4} wrap="wrap">
              {product.images.map((src) => (
                <Image
                  key={src}
                  src={src}
                  alt={product.name}
                  boxSize="120px"
                  objectFit="cover"
                  borderRadius="md"
                />
              ))}
            </Flex>
          </DetailSection>
        ) : null}

        <Separator />

        <DetailSection
          title="Inventory Transactions"
          subtitle="Latest 10 records"
        >
          <Flex
            justify="space-between"
            align="center"
            mb={4}
            gap={3}
            wrap="wrap"
          >
            <Text fontSize="sm" color="gray.500">
              Latest 10 records shown. Use the full inventory view for more.
            </Text>
            <Button asChild size="sm" variant="outline">
              <RouterLink
                to="/products/adjust-stock"
                search={{ productId: product.id }}
              >
                View All Transactions
              </RouterLink>
            </Button>
          </Flex>
          {isLoadingTransactions ? (
            <Text color="gray.500">Loading transactions...</Text>
          ) : transactions.length === 0 ? (
            <Text color="gray.500">No transactions recorded yet.</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Type</Table.ColumnHeader>
                  <Table.ColumnHeader>Quantity</Table.ColumnHeader>
                  <Table.ColumnHeader>Actor</Table.ColumnHeader>
                  <Table.ColumnHeader>Order</Table.ColumnHeader>
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
                    <Table.Cell>{tx.order_id ?? '—'}</Table.Cell>
                    <Table.Cell>{tx.memo ?? '—'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </DetailSection>
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
    <Text fontSize="lg">{children}</Text>
  </Box>
)

const DetailSection = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) => (
  <Box borderWidth="1px" borderRadius="md" p={4}>
    <Flex justify="space-between" align="center" mb={2} gap={4}>
      <Heading size="md">{title}</Heading>
      {subtitle ? (
        <Text fontSize="xs" color="gray.500">
          {subtitle}
        </Text>
      ) : null}
    </Flex>
    {children}
  </Box>
)

const InfoRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <Flex justify="space-between" gap={4}>
    <Text color="gray.500">{label}</Text>
    <Text fontWeight="semibold">{value}</Text>
  </Flex>
)

export default ProductDetailPage
