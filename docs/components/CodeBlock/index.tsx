import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  filename: string;
  language?: string;
}

export default function CodeBlock({ code, filename, language = 'tsx' }: CodeBlockProps) {
  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      <div className="px-4 py-2 bg-[#181818] text-subtext text-xs font-mono border-b border-card-border">
        {filename}
      </div>
      <Highlight theme={themes.vsDark} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="p-4 bg-[#0D0D0D] overflow-x-auto text-sm leading-relaxed font-mono m-0">
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
