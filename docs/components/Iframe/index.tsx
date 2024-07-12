import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import React, { useState } from 'react';

export const Iframe = (
  props: {
    setLoaded: (loaded: boolean) => void;
  } & Omit<ComponentPropsWithoutRef<'iframe'>, 'className'>,
) => {
  const { setLoaded } = props;
  return (
    <iframe
      loading="lazy"
      {...props}
      onLoad={() => {
        setLoaded(true);
      }}
      className={'h-full w-full rounded-xl'}
    />
  );
};
