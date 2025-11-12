import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"

import type { CategoryPublic } from "@/client"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"
import { DeleteCategory } from "./DeleteCategory"
import { EditCategory } from "./EditCategory"

interface CategoryActionsMenuProps {
  category: CategoryPublic
}

export const CategoryActionsMenu = ({ category }: CategoryActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton aria-label="Category actions" variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditCategory category={category} />
        <DeleteCategory categoryId={category.id} />
      </MenuContent>
    </MenuRoot>
  )
}
