import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import React, { useState } from 'react';

export const Iframe = (
  props: Omit<ComponentPropsWithoutRef<'iframe'>, 'className'>,
) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <iframe
      loading="lazy"
      {...props}
      onLoad={() => {
        setLoaded(true);
      }}
      className={clsx(
        'h-full w-full transition-opacity duration-1000',
        loaded ? 'opacity-95' : 'opacity-0',
        'rounded-xl'
      )}
    />
  );
};