import {
  Container,
  EmptyState,
  Flex,
  Heading,
  Table,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FiSearch } from 'react-icons/fi'
import { z } from 'zod'

import { CategoriesService } from '@/client'
import AddCategory from '@/components/Categories/AddCategory'
import { CategoryActionsMenu } from '@/components/Categories/CategoryActionsMenu'
import PendingCategories from '@/components/Pending/PendingCategories'
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination.tsx'

const categoriesSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getCategoriesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      CategoriesService.readCategories({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ['categories', { page }],
  }
}

export const Route = createFileRoute('/_layout/categories')({
  component: Categories,
  validateSearch: (search) => categoriesSearchSchema.parse(search),
})

function CategoriesTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getCategoriesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: { [key: string]: string }) => ({ ...prev, page }),
    })

  const categories = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingCategories />
  }

  if (categories.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>No categories yet</EmptyState.Title>
            <EmptyState.Description>
              Add a new category to get started.
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <>
      <Table.Root size={{ base: 'sm', md: 'md' }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="30%">Name</Table.ColumnHeader>
            <Table.ColumnHeader w="30%">Slug</Table.ColumnHeader>
            <Table.ColumnHeader w="30%">Description</Table.ColumnHeader>
            <Table.ColumnHeader w="10%">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {categories.map((category) => (
            <Table.Row key={category.id} opacity={isPlaceholderData ? 0.5 : 1}>
              <Table.Cell truncate maxW="30%">
                {category.name}
              </Table.Cell>
              <Table.Cell truncate maxW="30%">
                {category.slug}
              </Table.Cell>
              <Table.Cell
                color={!category.description ? 'gray' : 'inherit'}
                truncate
                maxW="30%"
              >
                {category.description || 'N/A'}
              </Table.Cell>
              <Table.Cell width="10%">
                <CategoryActionsMenu category={category} />
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
  )
}

function Categories() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Categories Management
      </Heading>
      <AddCategory />
      <CategoriesTable />
    </Container>
  )
}
