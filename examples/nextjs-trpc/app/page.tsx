import ClientSide from "./client-side";
import { trpc } from "./trpc";

export default async function Home() {
  const userId = "randomUserId"
  const response = await trpc.users.getUserById.query({ userId });

  return (
    <div>
      <p>Server side - {response.name}</p>
      <ClientSide />
    </div>
  );
}