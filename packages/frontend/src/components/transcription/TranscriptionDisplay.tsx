import { useEffect, useRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface TranscriptionDisplayProps {
  text: string;
  isLive?: boolean;
  maxHeight?: number;
}

export function TranscriptionDisplay({
  text,
  isLive = false,
  maxHeight = 200,
}: TranscriptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, isLive]);

  if (!text) {
    return (
      <div className="text-sm text-gray-400 text-center py-4 italic">
        La transcripcion aparecera aqui cuando comience a grabar...
      </div>
    );
  }

  return (
    <ScrollArea
      ref={scrollRef}
      className="rounded-md border p-3 bg-gray-50"
      style={{ maxHeight }}
    >
      <p className="text-sm whitespace-pre-wrap">
        {text}
        {isLive && <span className="animate-pulse">|</span>}
      </p>
    </ScrollArea>
  );
}
