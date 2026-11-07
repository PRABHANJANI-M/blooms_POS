import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';

/** Root component. Routing lives in routes/AppRoutes.tsx; the menu lives in config/navigation.ts. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
