import {
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'

import type { OrderPublic, OrderUpdate } from '@/client'
import { OrdersService } from '@/client'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EditOrderAddressesProps {
  order: OrderPublic
}

const EditOrderAddresses = ({ order }: EditOrderAddressesProps) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [shipping, setShipping] = useState('')
  const [billing, setBilling] = useState('')

  useEffect(() => {
    if (isOpen) {
      setShipping(order.shipping_address ?? '')
      setBilling(order.billing_address ?? '')
    }
  }, [isOpen, order.billing_address, order.shipping_address])

  const mutation = useMutation({
    mutationFn: (payload: Partial<OrderUpdate>) =>
      OrdersService.updateOrder({
        orderId: order.id,
        requestBody: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', { id: order.id }] })
      setIsOpen(false)
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({
      shipping_address: shipping.trim() || undefined,
      billing_address: billing.trim() || undefined,
    })
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <IconButton aria-label="Edit addresses" size="sm" variant="ghost">
          <FiEdit2 />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Edit Addresses</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Stack gap={3}>
              <Flex direction="column" gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Shipping Address
                </Text>
                <Textarea
                  value={shipping}
                  onChange={(event) => setShipping(event.target.value)}
                />
              </Flex>
              <Flex direction="column" gap={1}>
                <Text fontSize="sm" color="gray.500">
                  Billing Address
                </Text>
                <Textarea
                  value={billing}
                  onChange={(event) => setBilling(event.target.value)}
                />
              </Flex>
            </Stack>
          </DialogBody>
          <DialogFooter>
            <ButtonGroup>
              <DialogTrigger asChild>
                <Button
                  variant="subtle"
                  type="button"
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
              </DialogTrigger>
              <Button type="submit" loading={mutation.isPending}>
                Save
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default EditOrderAddresses
