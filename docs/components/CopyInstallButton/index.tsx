import { useState, useRef, useEffect } from 'react';
import { CopyIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';

const packageManagers = [
  { name: 'bun', command: 'bun add nestjs-trpc' },
  { name: 'npm', command: 'npm install nestjs-trpc' },
  { name: 'yarn', command: 'yarn add nestjs-trpc' },
  { name: 'pnpm', command: 'pnpm add nestjs-trpc' },
];

export default function CopyInstallButton() {
  const [selected, setSelected] = useState(0);
  const [hasCopied, setHasCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = packageManagers[selected];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.command);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex rounded-full border border-[#3D596E] text-sm font-mono overflow-hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="flex gap-3 py-3 pl-5 pr-3 items-center transition-all hover:bg-[#3D596E]/20"
        >
          <span className="text-muted">$</span>
          <span>{current.command}</span>
          {hasCopied ? (
            <CheckIcon width={16} className="text-success" />
          ) : (
            <CopyIcon width={16} className="text-subtext" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center px-3 border-l border-[#3D596E] transition-all hover:bg-[#3D596E]/20"
        >
          <ChevronDownIcon
            width={14}
            className={`text-subtext transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 rounded-xl border border-card-border bg-[#0D0D0D] py-1 min-w-[200px] z-50 shadow-lg shadow-black/50">
          {packageManagers.map((pm, i) => (
            <button
              key={pm.name}
              type="button"
              onClick={() => {
                setSelected(i);
                setIsOpen(false);
                setHasCopied(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors ${
                i === selected
                  ? 'text-primary bg-primary/5'
                  : 'text-subtext hover:bg-[#181818]'
              }`}
            >
              <span className="font-mono text-xs w-10">{pm.name}</span>
              <span className="font-mono text-xs text-muted">{pm.command}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
