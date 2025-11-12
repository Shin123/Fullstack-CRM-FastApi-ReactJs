import { Skeleton, Table } from '@chakra-ui/react'

const PendingCategories = () => (
  <Table.Root size={{ base: 'sm', md: 'md' }}>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeader>Name</Table.ColumnHeader>
        <Table.ColumnHeader>Slug</Table.ColumnHeader>
        <Table.ColumnHeader>Description</Table.ColumnHeader>
        <Table.ColumnHeader>Actions</Table.ColumnHeader>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {[...Array(5)].map((_, index) => (
        <Table.Row key={index}>
          <Table.Cell>
            <Skeleton h="20px" />
          </Table.Cell>
          <Table.Cell>
            <Skeleton h="20px" />
          </Table.Cell>
          <Table.Cell>
            <Skeleton h="20px" />
          </Table.Cell>
          <Table.Cell>
            <Skeleton h="20px" />
          </Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>
)

export default PendingCategories
