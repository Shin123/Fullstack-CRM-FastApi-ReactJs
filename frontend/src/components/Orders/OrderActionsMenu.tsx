import { IconButton } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { BsThreeDotsVertical } from 'react-icons/bs'

import type { OrderPublic } from '@/client'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import DeleteOrder from './DeleteOrder'
import UpdateOrderStatus from './UpdateOrderStatus'

interface OrderActionsMenuProps {
  order: OrderPublic
}

const OrderActionsMenu = ({ order }: OrderActionsMenuProps) => {
  const navigate = useNavigate()

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton aria-label="Order actions" variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <MenuItem
          value="view"
          onClick={() =>
            navigate({
              to: '/orders/$orderId',
              params: { orderId: order.id },
            })
          }
        >
          View Details
        </MenuItem>
        <MenuItem value="update">
          <UpdateOrderStatus order={order} triggerLabel="Quick Update" />
        </MenuItem>
        <MenuItem value="delete">
          <DeleteOrder orderId={order.id} />
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}

export default OrderActionsMenu
