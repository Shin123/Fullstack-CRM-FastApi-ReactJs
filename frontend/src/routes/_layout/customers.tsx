import {
  Container,
  EmptyState,
  Flex,
  Heading,
  Input,
  Table,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FiSearch } from 'react-icons/fi'
import { z } from 'zod'

import { CustomersService } from '@/client'
import AddCustomer from '@/components/Customers/AddCustomer'
import CustomerActionsMenu from '@/components/Customers/CustomerActionsMenu'
import PendingCustomers from '@/components/Pending/PendingCustomers'
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination.tsx'

const customersSearchSchema = z.object({
  page: z.number().catch(1),
  query: z.string().catch(''),
})

type CustomersSearch = z.infer<typeof customersSearchSchema>

const PER_PAGE = 5

function getCustomersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      CustomersService.readCustomers({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ['customers', { page }],
  }
}

export const Route = createFileRoute('/_layout/customers')({
  component: Customers,
  validateSearch: (search) => customersSearchSchema.parse(search),
})

function CustomersTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, query } = Route.useSearch()
  const [searchTerm, setSearchTerm] = useState(query)

  const updateSearchQuery = useCallback(
    (value: string) => {
      navigate({
        search: (prev: CustomersSearch) => ({
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
    const timeout = setTimeout(() => {
      if (searchTerm === query) return
      updateSearchQuery(searchTerm)
    }, 800)

    return () => clearTimeout(timeout)
  }, [searchTerm, query, updateSearchQuery])

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getCustomersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (nextPage: number) =>
    navigate({
      search: (prev: CustomersSearch) => ({ ...prev, page: nextPage }),
    })

  const customers = data?.data ?? []
  const count = data?.count ?? 0

  const normalizedQuery = query.trim().toLowerCase()
  const filteredCustomers = normalizedQuery
    ? customers.filter((customer) => {
        const nameMatch = customer.name?.toLowerCase().includes(normalizedQuery)
        const emailMatch = customer.email
          ?.toLowerCase()
          .includes(normalizedQuery)
        const phoneMatch = customer.phone
          ?.toLowerCase()
          .includes(normalizedQuery)
        return nameMatch || emailMatch || phoneMatch
      })
    : customers

  if (isLoading) {
    return <PendingCustomers />
  }

  return (
    <>
      <Flex gap={4} mb={4} direction={{ base: 'column', md: 'row' }}>
        <Input
          placeholder="Search by name, email, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (searchTerm !== query) {
                updateSearchQuery(searchTerm)
              }
            }
          }}
        />
      </Flex>

      {filteredCustomers.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch />
            </EmptyState.Indicator>
            <VStack textAlign="center">
              <EmptyState.Title>No customers found</EmptyState.Title>
              <EmptyState.Description>
                Add a new customer or adjust your search.
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <>
          <Table.Root size={{ base: 'sm', md: 'md' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Phone</Table.ColumnHeader>
                <Table.ColumnHeader>Address</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredCustomers.map((customer) => (
                <Table.Row
                  key={customer.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                >
                  <Table.Cell>{customer.name}</Table.Cell>
                  <Table.Cell>{customer.email ?? 'N/A'}</Table.Cell>
                  <Table.Cell>{customer.phone}</Table.Cell>
                  <Table.Cell>{customer.address ?? 'N/A'}</Table.Cell>
                  <Table.Cell>
                    <CustomerActionsMenu customer={customer} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Flex justifyContent="flex-end" mt={4}>
            <PaginationRoot
              count={count}
              pageSize={PER_PAGE}
              onPageChange={({ page: nextPage }) => setPage(nextPage)}
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

function Customers() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Customers Management
      </Heading>
      <AddCustomer />
      <CustomersTable />
    </Container>
  )
}
