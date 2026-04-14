import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Circle, XCircle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProgressState } from '@/types/progress';

const removeAfter = 2000;

export function ChatProgress({
  progress,
  deleteProgress,
}: {
  progress: ProgressState;
  deleteProgress: (progressId: string) => void;
}) {
  const progressTimeoutsRef = useRef<Record<string, any>>({});
  useEffect(() => {
    Object.entries(progress).forEach(([id, p]) => {
      const allDone = p.every(({ done }) => !!done);
      if (allDone && !progressTimeoutsRef.current[id]) {
        progressTimeoutsRef.current[id] = setTimeout(() => {
          console.debug('Remove progress data', id);
          deleteProgress(id);
        }, removeAfter);
      }
    });
  }, [progress]);

  const handleClose = (id: string) => {
    deleteProgress(id);
    // Clear timeout if exists
    if (progressTimeoutsRef.current[id]) {
      clearTimeout(progressTimeoutsRef.current[id]);
      delete progressTimeoutsRef.current[id];
    }
  };

  if (Object.keys(progress).length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {Object.entries(progress).map(([id, p]) => {
        const allDone = p.every(({ done }) => !!done);
        const hasError = p.some(({ error }) => !!error);
        const completedCount = p.filter(({ done }) => !!done).length;
        const errorCount = p.filter(({ error }) => !!error).length;
        const totalCount = p.length;

        return (
          <Card
            key={id}
            className={cn(
              'transition-all duration-300 py-0 rounded-2xl border-border/30 shadow-md animate-in fade-in slide-in-from-bottom-2',
              allDone && !hasError && 'border-emerald-500/30 bg-emerald-500/5',
              hasError && 'border-red-500/30 bg-red-500/5',
              !allDone && !hasError && 'border-primary/30 bg-primary/5'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {hasError ? (
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  ) : allDone ? (
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {hasError ? 'エラー' : allDone ? '完了' : '処理中'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={hasError ? 'destructive' : allDone ? 'secondary' : 'default'}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                  >
                    {hasError
                      ? `${errorCount}件のエラー`
                      : `${completedCount}/${totalCount}`}
                  </Badge>
                  {hasError && (
                    <button
                      onClick={() => handleClose(id)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {p.map(step => (
                  <div key={step.name}>
                    <div
                      className={cn(
                        'flex items-center gap-2.5 transition-all duration-200 text-sm',
                        step.done ? 'text-muted-foreground' : 'text-foreground',
                        step.error && 'text-red-500'
                      )}
                    >
                      {step.error ? (
                        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <XCircle className="h-3 w-3 text-red-500" />
                        </div>
                      ) : step.done ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Circle className="h-3 w-3 text-primary animate-pulse" />
                        </div>
                      )}
                      <span className={cn(step.done && !step.error && 'line-through opacity-70')}>
                        {step.name}
                      </span>
                    </div>
                    {step.error && (
                      <div className="text-xs ml-6 mt-1 text-red-500/80 bg-red-500/10 px-2 py-1 rounded">{step.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
