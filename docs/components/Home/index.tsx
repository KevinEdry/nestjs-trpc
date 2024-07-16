import { MegaphoneIcon, ArrowRight, DollarSignIcon, CopyIcon, CheckIcon, CodeIcon, ZapIcon, ShieldCheckIcon } from 'lucide-react';
import { Preview } from '../Preview';
import Link from "next/link";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useState } from 'react';
import FeatureCard from '../FeatureCard';

export default function Home() {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const [hasCopied, changeHasCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard("npm install nestjs-trpc");
    changeHasCopied(true);
    setTimeout(()=> {
      changeHasCopied(false);
    }, 3000)
  }

  return (
    <div className={"mx-auto mt-24 px-6 text-center md:px-8 max-w-[80rem] z-20 gap-12 flex flex-col"}>
      <header className={"flex flex-col items-center gap-3"}>
        <Link href={"https://github.com/KevinEdry/nestjs-trpc"}>
          <button type={"button"} className={"flex items-center gap-1 text-[#788188] text-sm"}>
            <MegaphoneIcon width={15}/>
            <p>Read about NestJS tRPC 1.0 Launch</p>
            <ArrowRight width={15}/>
          </button>
        </Link>
        <h1 className={"text-6xl font-semibold bg-gradient-to-b from-white to-[#7EC7FF] inline-block text-[RGBA(0,0,0,0)] bg-clip-text"}>
          Bring type-safety<br />to NestJS
        </h1>
        <p className={"text-[#8BA1B2] text-xl"}>Discover how to write type-safe end-to-end apis using tRPC in NestJS.</p>
        <div className={"flex flex-wrap justify-center gap-3"}>
          <button type={"button"} onClick={()=>{handleCopy()}} className={"flex gap-3 rounded-full border border-[#3D596E] h-full py-4 px-6 items-center transition-all hover:bg-[#3D596E]"}>
            <DollarSignIcon width={17} className={"text-[#8BA1B2]"}/>
            <p>npm install nestjs-trpc</p>
            {
              hasCopied ? <CheckIcon/> : <CopyIcon/>
            }
          </button>
          <Link href={"/docs"}>
            <button type={"button"} className={"flex py-4 px-6 gap-2 bg-gray text-[#000] rounded-full items-center group/docs transition-all hover:bg-gray/80"}>
              <p>Documentation</p>
              <ArrowRight width={15} className={"transition-transform group-hover/docs:translate-x-1"} />
            </button>
          </Link>
        </div>
      </header>
      <section className={"relative w-full"}>
        <Preview />
      </section>
      <section className={"flex flex-col justify-between gap-5 mt-16"}>
        <div>
          <h2 className={"text-4xl font-medium"}>Why use NestJS tRPC?</h2>
          <p className={"text-xl text-subtext"}>It&apos;s the best way to write NestJS APIs since the GraphQL adapter!</p>
        </div>
        <div className={"flex justify-between gap-3 flex-wrap"}>
          <FeatureCard Icon={ShieldCheckIcon} title={"End-to-end type safety"} description={"Seamlessly integrates tRPC into NestJS, allowing you to build fully typed APIs with ease."} />
          <FeatureCard Icon={CodeIcon} title={"Great DX"} description={"Auto generated appRouter schema from your NestJS routers makes it easier to consume and manage your apis."} />
          <FeatureCard Icon={ZapIcon} title={"Seamless Integration"} description={"Works with existing NestJS projects, allowing gradual adoption and easy integration into your current workflow."} />
        </div>
      </section>
    </div>
  )
}