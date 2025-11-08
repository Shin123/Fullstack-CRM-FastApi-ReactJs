import { Container, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/customers')({
  component: Customers,
})

function Customers() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Customers Management
      </Heading>
    </Container>
  )
}
