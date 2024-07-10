import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className={"w-full flex justify-center items-center flex-col gap-10 py-10"}>
      <div className={"flex gap-5 w-full justify-center"}>
        <div className={"content w-1/3 border-b border-border-gray/40 mb-9"}></div>
        <Link href={"/"}>
          <div className={"min-w-[75px]"}>
            <Image className={"hover:scale-105 hover:shadow-primary/10 hover:shadow-xl transition-all rounded-2xl"} src={"/logo.png"} alt={"NestJS tRPC logo"} width={75} height={75}/>
          </div>
        </Link>
        <div className={"content w-1/3 border-b border-border-gray/40 mb-9"}></div>
      </div>
      <div className={"flex flex-col gap-1"}>
        <ul className={"flex gap-5 w-full justify-center text-subtext font-medium [&_li]:cursor-pointer [&_li:hover]:text-subtext/80"}>
          <li><Link href={"/docs"}>Docs</Link></li>
          <li>Blog</li>
          <li>FAQ</li>
          <li>Discord</li>
        </ul>
        <div className={"text-subtext/50"}>Made with ❤️ in Seattle by <Link href={"https://kevin-edry.com/"} className={"hover:text-primary transition-all font-bold"} target={"_blank"}>Kevin Edry</Link>.</div>
      </div>
    </footer>
  );
};