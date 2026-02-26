import { RouterProvider } from 'react-router';
import { ThemeProvider } from './context/ThemeContext';
import { router } from './routes';

export default function App() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
        <RouterProvider router={router} />
      </div>
    </ThemeProvider>
  );
}