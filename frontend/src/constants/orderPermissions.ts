import type { OrderStatus } from '@/client'

const normalizeOrderStatus = (status?: OrderStatus | null): OrderStatus =>
  status ?? 'draft'

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['draft', 'confirmed', 'paid', 'fulfilled', 'cancelled'],
  confirmed: ['confirmed', 'paid', 'fulfilled', 'cancelled'],
  paid: ['paid', 'fulfilled', 'cancelled'],
  fulfilled: ['fulfilled', 'cancelled'],
  cancelled: ['cancelled'],
}

export const getAllowedStatusTransitions = (
  status?: OrderStatus | null
): OrderStatus[] => {
  const normalized = normalizeOrderStatus(status)
  return ORDER_STATUS_TRANSITIONS[normalized]
}

export const hasStatusTransitions = (status?: OrderStatus | null): boolean => {
  const normalized = normalizeOrderStatus(status)
  return ORDER_STATUS_TRANSITIONS[normalized].some(
    (nextStatus) => nextStatus !== normalized
  )
}

export const canDeleteOrder = (status?: OrderStatus | null): boolean =>
  normalizeOrderStatus(status) === 'draft'

export { normalizeOrderStatus }
