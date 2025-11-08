import { Container, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/products')({
  component: Products,
})

function Products() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Products Management
      </Heading>
    </Container>
  )
}
