import { useRef, useState } from 'react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '#components/ui/tooltip';
import { cn } from '#lib/utils';

export function TruncatedText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => {
    if (ref.current && ref.current.scrollWidth > ref.current.clientWidth) {
      setOpen(true);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          ref={ref}
          render={<span />}
          className={cn('block truncate text-left w-full cursor-default', className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </TooltipTrigger>
        {open && (
          <TooltipContent
            side="bottom"
            className="max-w-[320px] whitespace-normal text-sm leading-relaxed"
          >
            {children}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
