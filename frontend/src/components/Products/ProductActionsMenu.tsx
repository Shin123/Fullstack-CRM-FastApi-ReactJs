import { IconButton } from '@chakra-ui/react'
import { BsThreeDotsVertical } from 'react-icons/bs'

import type { ProductPublic } from '@/client'
import { MenuContent, MenuRoot, MenuTrigger } from '@/components/ui/menu'
import DeleteProduct from './DeleteProduct'
import EditProduct from './EditProduct'

interface ProductActionsMenuProps {
  product: ProductPublic
}

export const ProductActionsMenu = ({ product }: ProductActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          variant="ghost"
          color="inherit"
          aria-label="Product Actions"
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditProduct product={product} />
        <DeleteProduct id={product.id} />
      </MenuContent>
    </MenuRoot>
  )
}
