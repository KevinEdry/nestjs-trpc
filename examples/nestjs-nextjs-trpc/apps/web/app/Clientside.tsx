'use client';

import { useEffect, useState } from 'react';
import { trpc } from './trpc';

export default function Clientside() {
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    trpc.users.getHello.query({ name: 'linoy' }).then((response) => {
      setGreeting(response);
    });
  });
  return <div>I am client side - {greeting}</div>;
}
