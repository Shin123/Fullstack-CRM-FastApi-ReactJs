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
import { Link as RouterLink } from '@tanstack/react-router'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { FaPlus } from 'react-icons/fa'

import type { ApiError, ProductCreate, ProductStatus } from '@/client'
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
  name: string
  sku: string
  description?: string
  price?: string
  price_origin?: string
  stock?: string
  status: ProductStatus
  category_id?: string
  thumbnail_image?: string
}

const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'published', 'archived']

const AddProduct = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProductFormValues>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: '',
      price_origin: '',
      stock: '',
      status: 'draft',
      category_id: '',
      thumbnail_image: '',
    },
  })

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => CategoriesService.readCategories({ limit: 100 }),
  })

  const categories = categoriesData?.data ?? []

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload: ProductCreate = {
        name: values.name,
        sku: values.sku,
        description: values.description || undefined,
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

      return ProductsService.createProduct({ requestBody: payload })
    },
    onSuccess: () => {
      showSuccessToast('Product created.')
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const onSubmit: SubmitHandler<ProductFormValues> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: 'xs', md: 'lg' }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button my={4}>
          <FaPlus fontSize="16px" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent maxH="85vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <DialogBody maxH="55vh" overflowY="auto">
            <Text mb={4}>
              Fill out the product details. All fields with * are required.
            </Text>
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
              <Field
                label="Thumbnail URL"
                helperText={
                  <RouterLink to="/media" style={{ fontSize: '0.85em' }}>
                    Upload or copy URLs via the media library
                  </RouterLink>
                }
              >
                <Input
                  id="thumbnail_image"
                  placeholder="https://example.com/image.png"
                  {...register('thumbnail_image')}
                />
              </Field>
              <Field
                label="Price"
                invalid={!!errors.price}
                errorText={errors.price?.message}
              >
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price')}
                />
              </Field>
              <Field
                label="Original Price"
                invalid={!!errors.price_origin}
                errorText={errors.price_origin?.message}
              >
                <Input
                  id="price_origin"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price_origin')}
                />
              </Field>
              <Field
                label="Stock"
                invalid={!!errors.stock}
                errorText={errors.stock?.message}
              >
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
              <Button
                variant="solid"
                type="submit"
                disabled={!isValid}
                loading={isSubmitting}
              >
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

export default AddProduct
