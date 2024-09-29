"use client";

import { useEffect, useState } from "react";
import { trpc } from "./trpc";

export default function ClientSide() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const userId = "randomUserId"
    trpc.users.getUserById.query({userId}).then((response) => {
      setGreeting(response.name);
    });
  });

  return <div>I am client side - {greeting}</div>;
}