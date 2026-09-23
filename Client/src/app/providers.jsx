import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from './store'
import { queryClient } from '../lib/queryClient'
import SocketProvider from '../lib/SocketProvider'
import ThemeProvider from '../components/ThemeContext'
import ToastProvider from '../components/ToastContext'
import SessionRefresh from './SessionRefresh'

export function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SocketProvider>
            <ToastProvider>
              <SessionRefresh>{children}</SessionRefresh>
            </ToastProvider>
          </SocketProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  )
}

export default AppProviders