import { useMemo } from 'react'

import { useAppConfig } from './useAppConfig'

const normalizeNumber = (value?: string | number) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(amount) ? undefined : amount
}

export const useCurrency = () => {
  const { defaultCurrency } = useAppConfig()

  const formatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: defaultCurrency,
      })
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
      })
    }
  }, [defaultCurrency])

  const formatCurrency = (
    value?: string | number,
    currency = defaultCurrency
  ) => {
    const amount = normalizeNumber(value)
    if (amount === undefined) {
      return '—'
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount)
    } catch {
      return formatter.format(amount)
    }
  }

  return { defaultCurrency, formatCurrency }
}
