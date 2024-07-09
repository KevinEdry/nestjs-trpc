import { MegaphoneIcon, ArrowRight, DollarSignIcon, CopyIcon, Code, Zap } from 'lucide-react';
import { Iframe } from '../Iframe';
import { searchParams } from '../../utils/searchParams';
import clsx from 'clsx';

export default function Home() {
  return (
    <div className={"mx-auto mt-24 px-6 text-center md:px-8 max-w-[80rem] z-20"}>
      <header className={"flex flex-col items-center"}>
        <div className={"flex items-center gap-1 text-[#788188] text-sm"}>
          <MegaphoneIcon width={15}/>
          <p>Read about NestJS tRPC 1.0 Launch</p>
          <ArrowRight width={15}/>
        </div>
        <h1 className={"text-6xl font-semibold bg-gradient-to-b from-[#FFFFFF] to-[#7EC7FF] inline-block text-[RGBA(0,0,0,0)] bg-clip-text"}>
          Bring type-safety<br />to NestJS
        </h1>
        <p className={"text-[#8BA1B2] text-xl"}>Discover how to write type-safe end-to-end apis using tRPC in NestJS.</p>
        <div className={"flex gap-3"}>
          <div className={"flex gap-3 rounded-full border border-[#3D596E] h-full py-4 px-6 items-center"}>
            <DollarSignIcon width={17} className={"text-[#8BA1B2]"}/>
            <p>npm install nestjs-trpc</p>
            <CopyIcon />
          </div>
          <button className={"flex py-4 px-6 bg-[#fff] text-[#000] rounded-full items-center"}>
            <p>Documentation</p>
            <ArrowRight />
          </button>
        </div>
      </header>
      <section className={"relative w-full mt-10"}>
        <div className={clsx(
          "relative h-[800px] w-full rounded-xl p-[1px]",
          "before:bg-gradient-to-b before:from-[RGBA(57,140,203,0.5)] before:to-[RGBA(18,18,18,0)] before:content before:blur-[180px] before:w-full before:h-full before:block before:absolute before:z-[-10]",
          "after:absolute after:bg-gradient-to-b after:content after:z-[-1] after:rounded-xl after:from-[#75ABD4] after:to-[RGBA(120,129,136,0.4)] after:w-full after:h-full after:top-0 after:left-0")}>
          <Iframe
            src={
              `https://stackblitz.com/edit/trpc-trpc-g4sqrv?` +
              searchParams({
                embed: '1',
                file: "src/pages/api/trpc/[trpc].ts`",
                hideNavigation: '1',
                terminalHeight: '1',
                showSidebar: '0',
                view: 'editor',
              })
            }
            frameBorder="0"
          />
        </div>
      </section>
      <section className={"flex justify-center"}>
        <div>box1</div>
        <div>box2</div>
        <div>box3</div>
      </section>
    </div>
  )
}