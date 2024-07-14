import Clientside from './Clientside';
import { trpc } from './trpc';

export default async function Home() {
  const response = await trpc.users.getHello.query({ name: 'linoy' });
  return (
    <div>
      <p>Server side - {response}</p>
      <Clientside />
    </div>
  );
}
