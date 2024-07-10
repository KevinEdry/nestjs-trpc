import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import React, { useState } from 'react';
import { Iframe } from '../Iframe';
import { searchParams } from '../../utils/searchParams';
import Image from 'next/image';

export const Preview = (
  props: Omit<ComponentPropsWithoutRef<'iframe'>, 'className'>,
) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Image className={clsx(
        loaded ? "opacity-0" : "opacity-50",
        "transition-opacity duration-1000 blur"
      )} src={"/preview.png"} alt={"preview image"} fill />
      <div className={clsx(
        "relative h-[800px] w-full rounded-xl p-[1px] transition-opacity duration-1000",
        loaded ? 'opacity-95' : 'opacity-0',
        "before:bg-gradient-to-b before:from-primary/50 before:to-background-black/0 before:content before:blur-[180px] before:w-full before:h-full before:block before:absolute before:z-[-10]",
        "after:absolute after:bg-gradient-to-b after:content after:z-[-1] after:rounded-xl after:from-border-primary after:to-border-gray/40 after:w-full after:h-full after:top-0 after:left-0")}>
        <Iframe
          setLoaded={setLoaded}
          src={
            `https://stackblitz.com/edit/trpc-trpc-g4sqrv?` +
            searchParams({
              embed: '1',
              file: "./src/pages/api/trpc/[trpc].ts`",
              hideNavigation: '1',
              terminalHeight: '1',
              showSidebar: '0',
              view: 'editor',
            })
          }
          frameBorder="0"
        />
      </div>
    </>
  );
};