import { Container, Heading } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/categories')({
  component: Categories,
})

function Categories() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Categories Management
      </Heading>
    </Container>
  )
}
