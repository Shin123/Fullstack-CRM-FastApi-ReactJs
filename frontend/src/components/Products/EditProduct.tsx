import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { FaExchangeAlt } from 'react-icons/fa'

import type {
  ApiError,
  ProductPublic,
  ProductStatus,
  ProductUpdate,
} from '@/client'
import { CategoriesService, ProductsService } from '@/client'
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
import { Field } from '@/components/ui/field'
import useCustomToast from '@/hooks/useCustomToast'
import { handleError } from '@/utils'

interface ProductFormValues {
  name?: string
  sku?: string
  description?: string | null
  price?: string
  price_origin?: string
  stock?: string
  status?: ProductStatus
  category_id?: string
  thumbnail_image?: string
}

interface EditProductProps {
  product: ProductPublic
}

const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'published', 'archived']

const EditProduct = ({ product }: EditProductProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      price: product.price ?? '',
      price_origin: product.price_origin ?? '',
      stock: product.stock ? String(product.stock) : '',
      status: product.status ?? 'draft',
      category_id: product.category_id ?? '',
      thumbnail_image: product.thumbnail_image ?? '',
    },
  })

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => CategoriesService.readCategories({ limit: 100 }),
  })

  const categories = categoriesData?.data ?? []

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload: ProductUpdate = {
        name: values.name,
        sku: values.sku,
        description: values.description || null,
        price:
          values.price && values.price.trim() !== ''
            ? Number(values.price)
            : undefined,
        price_origin:
          values.price_origin && values.price_origin.trim() !== ''
            ? Number(values.price_origin)
            : undefined,
        stock:
          values.stock && values.stock.trim() !== ''
            ? Number(values.stock)
            : undefined,
        status: values.status,
        category_id: values.category_id || undefined,
        thumbnail_image: values.thumbnail_image || undefined,
      }

      return ProductsService.updateProduct({
        productId: product.id,
        requestBody: payload,
      })
    },
    onSuccess: (_data, variables) => {
      showSuccessToast('Product updated.')
      reset({
        ...variables,
        price: variables.price ?? '',
        price_origin: variables.price_origin ?? '',
        stock: variables.stock ?? '',
      })
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({
        queryKey: ['product', { id: product.id }],
      })
    },
  })

  const onSubmit: SubmitHandler<ProductFormValues> = (values) => {
    mutation.mutate(values)
  }

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'lg' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          Edit Product
        </Button>
      </DialogTrigger>
      <DialogContent maxH="85vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <DialogBody maxH="55vh" overflowY="auto">
            <Text mb={4}>Update the product details below.</Text>
            <VStack gap={4}>
              <Field
                required
                label="Name"
                invalid={!!errors.name}
                errorText={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder="Product name"
                  {...register('name', { required: 'Name is required' })}
                />
              </Field>
              <Field
                required
                label="SKU"
                invalid={!!errors.sku}
                errorText={errors.sku?.message}
              >
                <Input
                  id="sku"
                  placeholder="SKU"
                  {...register('sku', { required: 'SKU is required' })}
                />
              </Field>
              <Field label="Thumbnail URL">
                <Input
                  id="thumbnail_image"
                  placeholder="https://example.com/image.png"
                  {...register('thumbnail_image')}
                />
              </Field>
              <Field label="Price">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price')}
                />
              </Field>
              <Field label="Original Price">
                <Input
                  id="price_origin"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price_origin')}
                />
              </Field>
              <Field label="Stock">
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  {...register('stock')}
                />
              </Field>
              <Field label="Category">
                <NativeSelectRoot width="100%" disabled={isCategoriesLoading}>
                  <NativeSelectField
                    id="category_id"
                    {...register('category_id')}
                  >
                    <option value="">
                      {isCategoriesLoading
                        ? 'Loading categories...'
                        : 'No category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>
              </Field>
              <Field label="Status">
                <NativeSelectRoot width="100%">
                  <NativeSelectField id="status" {...register('status')}>
                    {PRODUCT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>
              </Field>
              <Field label="Description">
                <Textarea
                  id="description"
                  placeholder="Describe the product..."
                  {...register('description')}
                />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button variant="solid" type="submit" loading={isSubmitting}>
                Save
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditProduct
