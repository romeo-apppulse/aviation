import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";

// Prevent error overlay from showing for handled authentication errors
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  if (error && typeof error.message === 'string') {
    // Don't show overlay for authentication errors (they're handled by the UI)
    if (error.message.includes('401') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('pending approval') ||
        error.message.includes('blocked')) {
      event.preventDefault();
      // Error is already handled by the mutation error handler
      console.log('Auth error handled:', error.message);
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);
