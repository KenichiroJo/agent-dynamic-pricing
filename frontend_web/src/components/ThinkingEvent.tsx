import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThinkingEvent() {
  return (
    <div className={cn('flex gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-card border border-primary/10 animate-in fade-in slide-in-from-bottom-2 duration-300')}>
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20'
          )}
        >
          <Sparkles className={cn('w-4 h-4 animate-pulse')} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-primary" data-testid="thinking-loading">
            分析中
          </span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
