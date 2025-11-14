import {
  Button,
  Container,
  FileUpload,
  Flex,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  Skeleton,
  Stack,
  Table,
  Text,
  VStack,
  chakra,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { FiCopy, FiTrash2, FiUpload } from 'react-icons/fi'

import type { ApiError, MediaList, MediaPublic } from '@/client'
import { MediaService, OpenAPI } from '@/client'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import useCustomToast from '@/hooks/useCustomToast'

export const Route = createFileRoute('/_layout/media')({
  component: MediaLibrary,
})

const humanFileSize = (size: number) => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let value = size
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(1)} ${units[index]}`
}

function MediaLibrary() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<MediaPublic | null>(null)
  const [fileUploadKey, setFileUploadKey] = useState(0)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const apiOrigin = useMemo(() => {
    const base = OpenAPI.BASE || ''
    try {
      return base ? new URL(base).origin : window.location.origin
    } catch {
      return window.location.origin
    }
  }, [])
  const resolveMediaUrl = (url: string) => {
    try {
      return new URL(url).href
    } catch {
      return new URL(url, apiOrigin).href
    }
  }

  const { data, isLoading } = useQuery<MediaList>({
    queryKey: ['media'],
    queryFn: () =>
      MediaService.listMedia({
        limit: 200,
        skip: 0,
      }),
  })

  const uploadMutation = useMutation<MediaPublic, ApiError, File>({
    mutationFn: (file: File) => {
      const formData = {
        file,
      }
      return MediaService.uploadMedia({ formData })
    },
    onSuccess: () => {
      showSuccessToast('Media uploaded.')
      setSelectedFile(null)
      setFileUploadKey((prev) => prev + 1)
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onError: (error: ApiError) => {
      showErrorToast(error.statusText ?? 'Upload failed')
    },
  })

  const deleteMutation = useMutation<void, ApiError, string>({
    /*************  ✨ Windsurf Command ⭐  *************/
    /**
     * Mutation function to delete a media item
     * @param {string} id - The ID of the media item to delete
     * @returns {Promise<void>} - A promise that resolves when the deletion is complete
     */
    /*******  30887bd8-786f-48a3-83ab-438b8e5dc79d  *******/
    mutationFn: (id: string) =>
      MediaService.deleteMedia({
        mediaId: id,
      }),
    onSuccess: () => {
      showSuccessToast('Media removed.')
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onError: (error: ApiError) => {
      showErrorToast(error.statusText ?? 'Delete failed')
    },
  })

  const mediaItems = useMemo<MediaPublic[]>(
    () => data?.data ?? [],
    [data?.data]
  )

  const handleUpload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) return
    uploadMutation.mutate(selectedFile)
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showSuccessToast('Copied URL to clipboard.')
    } catch {
      showErrorToast('Unable to copy URL.')
    }
  }

  return (
    <Container maxW="6xl" py={12}>
      <Stack gap={6}>
        <Heading size="lg">Media Library</Heading>
        <Text color="gray.500">
          Upload images for products or future landing pages. After uploading,
          copy the URL and paste it into the desired product field.
        </Text>
        <chakra.form
          onSubmit={handleUpload}
          borderWidth="1px"
          borderRadius="md"
          p={4}
        >
          <Stack gap={3}>
            <FileUpload.Root key={fileUploadKey}>
              <FileUpload.HiddenInput
                accept="image/*"
                multiple={false}
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null)
                }}
              />
              <FileUpload.Dropzone>
                <FileUpload.DropzoneContent>
                  <Icon as={FiUpload} fontSize="lga" color="fg.muted" />
                  <Text fontSize="sm" fontWeight="medium">
                    Drop or click to select
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Max 1600px • WebP/JPG/PNG
                  </Text>
                </FileUpload.DropzoneContent>
              </FileUpload.Dropzone>
              <FileUpload.List clearable showSize />
            </FileUpload.Root>
            <Button
              type="submit"
              disabled={!selectedFile}
              loading={uploadMutation.isPending}
              alignSelf="flex-start"
              gap={2}
            >
              <FiUpload />
              Upload
            </Button>
          </Stack>
        </chakra.form>

        {isLoading ? (
          <Stack gap={3}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton height="80px" key={index} />
            ))}
          </Stack>
        ) : mediaItems.length === 0 ? (
          <VStack borderWidth="1px" borderRadius="md" py={16}>
            <Text color="gray.500">No media uploaded yet.</Text>
          </VStack>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Preview</Table.ColumnHeader>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Size</Table.ColumnHeader>
                <Table.ColumnHeader>Dimensions</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {mediaItems.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <Image
                      src={resolveMediaUrl(item.file_url)}
                      alt={item.file_name}
                      boxSize="64px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="plain"
                      fontWeight="semibold"
                      onClick={() => setPreviewImage(item)}
                    >
                      {item.file_name}
                    </Button>
                    <Text fontSize="xs" color="gray.500">
                      {item.original_name ?? 'Unnamed'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{humanFileSize(item.file_size)}</Table.Cell>
                  <Table.Cell>
                    {item.width && item.height
                      ? `${item.width} × ${item.height}`
                      : '—'}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap={2}>
                      <IconButton
                        aria-label="Copy URL"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyUrl(item.file_url)}
                      >
                        <FiCopy />
                      </IconButton>
                      <IconButton
                        aria-label="Delete"
                        variant="ghost"
                        size="sm"
                        colorPalette="red"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
      <DialogRoot
        open={!!previewImage}
        onOpenChange={({ open }) => {
          if (!open) setPreviewImage(null)
        }}
        size="lg"
      >
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>{previewImage?.file_name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {previewImage && (
              <Stack gap={4}>
                <Image
                  src={resolveMediaUrl(previewImage.file_url)}
                  alt={previewImage.file_name}
                  maxH="60vh"
                  mx="auto"
                  objectFit="contain"
                  borderRadius="md"
                />
                <Stack gap={2}>
                  <Text fontSize="sm" color="gray.500">
                    URL
                  </Text>
                  <Flex gap={2}>
                    <Input value={previewImage.file_url} readOnly flex="1" />
                    <IconButton
                      aria-label="Copy URL"
                      onClick={() => copyUrl(previewImage.file_url)}
                    >
                      <FiCopy />
                    </IconButton>
                  </Flex>
                </Stack>
              </Stack>
            )}
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </Container>
  )
}

export default MediaLibrary
