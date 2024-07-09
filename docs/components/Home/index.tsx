import { MegaphoneIcon, ArrowRight, DollarSignIcon, CopyIcon, Code, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className={"w-full"}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(57,140,203,0.6404936974789917) 0%, rgba(18,18,81,0) 100%)`,
        }}
      />
      <header className={"flex flex-col items-center"}>
        <div className={"flex gap-3"}>
          <MegaphoneIcon />
          <p>Read about NestJS tRPC 1.0 Launch</p>
          <ArrowRight />
        </div>
        <h1 className={"text-center"}>
          Bring type-safety<br />to NestJS
        </h1>
        <p>Discover how to write type-safe end-to-end apis using tRPC in NestJS.</p>
        <div className={"flex gap-3"}>
          <div className={"flex"}>
            <DollarSignIcon />
            <p>npm install nestjs-trpc</p>
            <CopyIcon />
          </div>
          <button className={"flex"}>
            <p>Documentation</p>
            <ArrowRight />
          </button>
        </div>
      </header>
      <section className={"flex flex-col items-center"}>
        Preview
      </section>
      <section className={"flex justify-center"}>
        <div>box1</div>
        <div>box2</div>
        <div>box3</div>
      </section>
    </div>
  )
}