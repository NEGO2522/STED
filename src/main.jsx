import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk configuration
const clerkAppearance = {
  elements: {
    formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded',
    card: 'bg-white rounded-lg shadow-sm border border-gray-200',
    headerTitle: 'text-2xl font-bold text-gray-900',
    headerSubtitle: 'text-gray-500',
    socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
    socialButtonsBlockButtonText: 'text-gray-700',
    dividerLine: 'bg-gray-200',
    dividerText: 'text-gray-500',
    formFieldLabel: 'text-gray-700 font-medium',
    formFieldInput: 'border border-gray-300 rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    footerActionText: 'text-gray-600',
    footerActionLink: 'text-blue-600 hover:text-blue-800',
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
)
