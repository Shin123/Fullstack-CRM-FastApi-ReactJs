import {
  Button,
  ButtonGroup,
  IconButton,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { FiEdit2 } from "react-icons/fi"

import type { OrderPublic, OrderUpdate } from "@/client"
import { OrdersService } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface EditOrderNotesProps {
  order: OrderPublic
}

const EditOrderNotes = ({ order }: EditOrderNotesProps) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (isOpen) {
      setNotes(order.notes ?? "")
    }
  }, [isOpen, order.notes])

  const mutation = useMutation({
    mutationFn: (payload: Partial<OrderUpdate>) =>
      OrdersService.updateOrder({
        orderId: order.id,
        requestBody: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", { id: order.id }] })
      setIsOpen(false)
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({
      notes: notes.trim() || undefined,
    })
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <IconButton aria-label="Edit notes" size="sm" variant="ghost">
          <FiEdit2 />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Stack gap={1}>
              <Text fontSize="sm" color="gray.500">
                Notes
              </Text>
              <Textarea
                value={notes}
                minH="120px"
                onChange={(event) => setNotes(event.target.value)}
              />
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

export default EditOrderNotes
