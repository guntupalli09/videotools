import { Outlet } from 'react-router';
import { Navigation } from './components/Navigation';
import { TexAssistant } from './components/TexAssistant';

export default function Root() {
  return (
    <>
      <Navigation />
      <Outlet />
      <TexAssistant />
    </>
  );
}
