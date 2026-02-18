import { NotFoundScreen } from '@/components/features/chat/not-found-screen';

/**
 * Global Not Found (404) page for the application.
 * Reuses the styled NotFoundScreen component originally built for chat 404s.
 */
export default function NotFound() {
  return (
    <NotFoundScreen
      message="The page you are looking for does not exist."
      redirectTo="/"
      countdownSeconds={5}
    />
  );
}
