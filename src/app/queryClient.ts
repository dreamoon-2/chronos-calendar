import { QueryClient } from '@tanstack/react-query'

/** 应用级缓存配置；业务查询与写入仍由各功能模块负责。 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
