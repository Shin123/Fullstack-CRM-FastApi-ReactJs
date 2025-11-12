import {
  Badge,
  Container,
  EmptyState,
  Flex,
  Heading,
  Image,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Table,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FiSearch } from 'react-icons/fi'
import { z } from 'zod'

import {
  CategoriesService,
  type ProductStatus,
  ProductsService,
} from '@/client'
import AddProduct from '@/components/Products/AddProduct'
import { ProductActionsMenu } from '@/components/Products/ProductActionsMenu'
import PendingProducts from '@/components/Products/PendingProducts'
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination.tsx'
import { useCurrency } from '@/hooks/useCurrency'

const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const

const productsSearchSchema = z.object({
  page: z.number().catch(1),
  status: z.enum(PRODUCT_STATUSES).or(z.literal('')).catch(''),
  categoryId: z.string().catch(''),
  query: z.string().catch(''),
})

type ProductsSearch = z.infer<typeof productsSearchSchema>

const PER_PAGE = 5

function getProductsQueryOptions({
  page,
  status,
  categoryId,
}: {
  page: number
  status?: ProductStatus | ''
  categoryId?: string
}) {
  return {
    queryFn: () =>
      ProductsService.readProducts({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        status: status || undefined,
        categoryId: categoryId || undefined,
      }),
    queryKey: ['products', { page, status, categoryId }],
  }
}

export const Route = createFileRoute('/_layout/products')({
  component: Products,
  validateSearch: (search) => productsSearchSchema.parse(search),
})

function ProductsTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, status, categoryId, query } = Route.useSearch()
  const [searchTerm, setSearchTerm] = useState(query)
  const updateSearchQuery = useCallback(
    (value: string) => {
      navigate({
        search: (prev: ProductsSearch) => ({
          ...prev,
          query: value,
          page: 1,
        }),
      })
    },
    [navigate]
  )

  useEffect(() => {
    setSearchTerm(query)
  }, [query])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm === query) {
        return
      }
      updateSearchQuery(searchTerm)
    }, 1000)

    return () => clearTimeout(handler)
  }, [searchTerm, query, updateSearchQuery])

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getProductsQueryOptions({ page, status, categoryId }),
    placeholderData: (prevData) => prevData,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => CategoriesService.readCategories({ limit: 1000 }),
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: ProductsSearch) => ({ ...prev, page }),
    })

  const setStatus = (status: string) =>
    navigate({
      search: (prev: ProductsSearch) => ({ ...prev, status, page: 1 }),
    })

  const setCategoryId = (categoryId: string) =>
    navigate({
      search: (prev: ProductsSearch) => ({ ...prev, categoryId, page: 1 }),
    })

  const { formatCurrency } = useCurrency()

  const products = data?.data ?? []
  const count = data?.count ?? 0
  const categories = categoriesData?.data ?? []
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  const normalizedQuery = query?.trim().toLowerCase() ?? ''
  const filteredProducts = normalizedQuery
    ? products.filter((product) => {
        const nameMatch = product.name?.toLowerCase().includes(normalizedQuery)
        const skuMatch = product.sku?.toLowerCase().includes(normalizedQuery)
        return nameMatch || skuMatch
      })
    : products

  if (isLoading) {
    return <PendingProducts />
  }

  return (
    <>
      <Flex gap={4} mb={4} direction={{ base: 'column', md: 'row' }}>
        <Input
          placeholder="Search by name or SKU"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (searchTerm !== query) {
                updateSearchQuery(searchTerm)
              }
            }
          }}
        />
        <NativeSelectRoot w={{ base: '100%', md: '220px' }}>
          <NativeSelectField
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
        <NativeSelectRoot w={{ base: '100%', md: '220px' }}>
          <NativeSelectField
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
      </Flex>
      {filteredProducts.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch />
            </EmptyState.Indicator>
            <VStack textAlign="center">
              <EmptyState.Title>No products found</EmptyState.Title>
              <EmptyState.Description>
                Add a new product or adjust your filters.
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : null}

      {filteredProducts.length > 0 && (
        <>
          <Table.Root size={{ base: 'sm', md: 'md' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Image</Table.ColumnHeader>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>SKU</Table.ColumnHeader>
                <Table.ColumnHeader>Price</Table.ColumnHeader>
                <Table.ColumnHeader>Stock</Table.ColumnHeader>
                <Table.ColumnHeader>Category</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredProducts.map((product) => (
                <Table.Row
                  key={product.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                >
                  <Table.Cell>
                    <Image
                      src={
                        product.thumbnail_image ||
                        '/assets/images/placeholder.png'
                      }
                      alt={product.name}
                      boxSize="50px"
                      objectFit="cover"
                    />
                  </Table.Cell>
                  <Table.Cell>{product.name}</Table.Cell>
                  <Table.Cell>{product.sku}</Table.Cell>
                  <Table.Cell>
                    {formatCurrency(product.price)}
                  </Table.Cell>
                  <Table.Cell>{product.stock}</Table.Cell>
                  <Table.Cell>
                    {product.category_id
                      ? categoryMap.get(product.category_id) || 'N/A'
                      : 'N/A'}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge>{product.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <ProductActionsMenu product={product} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Flex justifyContent="flex-end" mt={4}>
            <PaginationRoot
              count={count}
              pageSize={PER_PAGE}
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
    </>
  )
}

function Products() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Products Management
      </Heading>
      <AddProduct />
      <ProductsTable />
    </Container>
  )
}
