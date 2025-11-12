import { Skeleton, Table } from '@chakra-ui/react'

const PendingProducts = () => {
  return (
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
        {Array.from({ length: 5 }, (_, i) => (
          <Table.Row key={i}>
            {Array.from({ length: 8 }, (_, j) => (
              <Table.Cell key={j}>
                <Skeleton height="20px" />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export default PendingProducts
