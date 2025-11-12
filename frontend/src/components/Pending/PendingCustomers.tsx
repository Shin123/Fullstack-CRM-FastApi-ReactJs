import { Skeleton, Table } from '@chakra-ui/react'

const PendingCustomers = () => {
  return (
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
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          <Table.Row key={rowIdx}>
            {Array.from({ length: 5 }).map((_, cellIdx) => (
              <Table.Cell key={cellIdx}>
                <Skeleton height="20px" />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export default PendingCustomers
