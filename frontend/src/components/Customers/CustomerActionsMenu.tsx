import { IconButton } from '@chakra-ui/react'
import { BsThreeDotsVertical } from 'react-icons/bs'

import type { CustomerPublic } from '@/client'
import { MenuContent, MenuRoot, MenuTrigger } from '@/components/ui/menu'
import DeleteCustomer from './DeleteCustomer'
import EditCustomer from './EditCustomer'

interface CustomerActionsMenuProps {
  customer: CustomerPublic
}

const CustomerActionsMenu = ({ customer }: CustomerActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          aria-label="Customer actions"
          variant="ghost"
          color="inherit"
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditCustomer customer={customer} />
        <DeleteCustomer id={customer.id} />
      </MenuContent>
    </MenuRoot>
  )
}

export default CustomerActionsMenu
