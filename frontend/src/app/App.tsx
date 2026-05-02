import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ChatPanel } from './components/ChatPanel';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ChatPanel />
    </>
  );
}

export default App;
