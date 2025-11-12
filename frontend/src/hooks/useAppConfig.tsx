import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import { ConfigService } from '@/client'

type AppConfig = {
  defaultCurrency: string
}

const DEFAULT_CONFIG: AppConfig = {
  defaultCurrency: import.meta.env.VITE_FALLBACK_CURRENCY ?? 'VND',
}

const AppConfigContext = createContext<AppConfig>(DEFAULT_CONFIG)

const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    const data = await ConfigService.getAppConfig()
    return {
      defaultCurrency: data.default_currency || DEFAULT_CONFIG.defaultCurrency,
    }
  } catch (error) {
    console.warn('Falling back to default currency config', error)
    return DEFAULT_CONFIG
  }
}

export const AppConfigProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { data } = useQuery({
    queryKey: ['appConfig'],
    queryFn: fetchAppConfig,
    staleTime: Infinity,
  })

  const value = data ?? DEFAULT_CONFIG

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfig = () => {
  return useContext(AppConfigContext)
}
