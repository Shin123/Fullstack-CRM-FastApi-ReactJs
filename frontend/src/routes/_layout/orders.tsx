import { Container, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/orders')({
  component: Orders,
})

function Orders() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Orders Management
      </Heading>
    </Container>
  )
}
