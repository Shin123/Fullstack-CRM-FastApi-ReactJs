import { IconButton } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { BsThreeDotsVertical } from 'react-icons/bs'

import type { ProductPublic } from '@/client'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import AdjustProductStock from './AdjustProductStock'
import DeleteProduct from './DeleteProduct'
import EditProduct from './EditProduct'

interface ProductActionsMenuProps {
  product: ProductPublic
}

export const ProductActionsMenu = ({ product }: ProductActionsMenuProps) => {
  const navigate = useNavigate()

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
        <MenuItem
          value="view"
          onClick={() =>
            navigate({
              to: '/products/$productId',
              params: { productId: product.id },
            })
          }
        >
          View Details
        </MenuItem>
        <MenuItem value="edit">
          <EditProduct product={product} />
        </MenuItem>
        <MenuItem value="adjust">
          <AdjustProductStock product={product} />
        </MenuItem>
        <MenuItem value="delete">
          <DeleteProduct id={product.id} />
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}
