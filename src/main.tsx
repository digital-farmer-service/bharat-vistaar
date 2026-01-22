import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// import { ReactKeycloakProvider } from '@react-keycloak/web'
import App from './App.tsx'
import './index.css'
// import keycloak from './lib/keycloak'
import { AuthProvider } from './contexts/AuthContext'

// Initialize Keycloak and render the app
// createRoot(document.getElementById("root")!).render(
//   <ReactKeycloakProvider 
//     authClient={keycloak} 
//     initOptions={{
//       onLoad: 'login-required',
//       checkLoginIframe: false,
//       pkceMethod: 'S256'
//     }}>
//     <App />
//   </ReactKeycloakProvider>
// )

createRoot(document.getElementById("root")!).render(

    <AuthProvider>
      <App />
    </AuthProvider>

)