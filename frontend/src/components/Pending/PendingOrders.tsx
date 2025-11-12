import { Skeleton, Table } from '@chakra-ui/react'

const PendingOrders = () => {
  return (
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
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <Table.Row key={rowIndex}>
            {Array.from({ length: 8 }).map((_, colIndex) => (
              <Table.Cell key={colIndex}>
                <Skeleton height="20px" />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export default PendingOrders

