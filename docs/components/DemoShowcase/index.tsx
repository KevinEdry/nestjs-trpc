import clsx from 'clsx';
import Image from 'next/image';

export default function DemoShowcase() {
  return (
    <section className="relative flex flex-col gap-4 w-full">
      <div
        className={clsx(
          'relative w-full rounded-xl p-[1px]',
          'before:bg-gradient-to-b before:from-primary/50 before:to-background-black/0 before:content before:blur-[180px] before:w-full before:h-full before:block before:absolute before:z-[-10]',
          'after:absolute after:bg-gradient-to-b after:content after:z-[-1] after:rounded-xl after:from-border-primary after:to-border-gray/40 after:w-full after:h-full after:top-0 after:left-0'
        )}
      >
        <div className="relative w-full rounded-xl overflow-hidden bg-background-black">
          <Image
            src="/demo.gif"
            alt="NestJS tRPC demo showing end-to-end type-safe API development with decorators and automatic type generation"
            width={1280}
            height={720}
            className="w-full h-auto"
            unoptimized
          />
        </div>
      </div>
      <p className="text-center text-subtext text-sm">
        The client above is not importing any code from the server, only its type declarations.
      </p>
    </section>
  );
}
