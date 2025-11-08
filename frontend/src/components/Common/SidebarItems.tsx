import { Box, Flex, Icon, Text } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink } from '@tanstack/react-router'
import {
  FiBriefcase,
  FiHome,
  FiSettings,
  FiShoppingCart,
  FiTag,
  FiUsers,
} from 'react-icons/fi'
import type { IconType } from 'react-icons/lib'

import type { UserPublic } from '@/client'

const mainItems = [
  { icon: FiHome, title: 'Dashboard', path: '/' },
  { icon: FiBriefcase, title: 'Items', path: '/items' },
]

const storeItems = [
  { icon: FiShoppingCart, title: 'Orders', path: '/orders' },
  { icon: FiTag, title: 'Products', path: '/products' },
  { icon: FiBriefcase, title: 'Categories', path: '/categories' },
  { icon: FiUsers, title: 'Customers', path: '/customers' },
]

const adminItems = [
  { icon: FiSettings, title: 'User Settings', path: '/settings' },
  { icon: FiUsers, title: 'Admin', path: '/admin' },
]

interface SidebarItemsProps {
  onClose?: () => void
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(['currentUser'])

  const renderList = (
    title: string,
    items: { icon: IconType; title: string; path: string }[]
  ) => (
    <>
      <Text fontSize="xs" px={4} py={2} fontWeight="bold" color="gray.500">
        {title}
      </Text>
      {items.map(({ icon, title, path }) => (
        <RouterLink key={title} to={path} onClick={onClose}>
          <Flex
            gap={4}
            px={4}
            py={2}
            _hover={{ background: 'gray.subtle' }}
            alignItems="center"
            fontSize="sm"
          >
            <Icon as={icon} alignSelf="center" />
            <Text ml={2}>{title}</Text>
          </Flex>
        </RouterLink>
      ))}
    </>
  )

  return (
    <Box>
      {renderList('Main', mainItems)}
      {currentUser?.is_superuser && renderList('Store Management', storeItems)}
      {renderList(
        'Settings',
        currentUser?.is_superuser
          ? adminItems
          : [{ icon: FiSettings, title: 'User Settings', path: '/settings' }]
      )}
    </Box>
  )
}

export default SidebarItems
