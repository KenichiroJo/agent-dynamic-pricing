import { Loader2, Send, Sparkles, MapPin, CalendarDays, List, MessageSquare, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { KeyboardEvent, useRef, useState } from 'react';
import { CourseSelector } from '@/components/CourseSelector';
import { cn } from '@/lib/utils';

export interface ChatTextInputProps {
  onSubmit: (text: string) => any;
  userInput: string;
  setUserInput: (value: string) => void;
  runningAgent: boolean;
}

const QUICK_PROMPTS = [
  { icon: List, text: 'コース一覧を表示', category: '検索' },
  { icon: MapPin, text: 'GC204 来週土曜の推奨価格', category: '日付指定' },
  { icon: CalendarDays, text: 'GC347 4月1日〜7日の推奨価格', category: '期間指定' },
];

type InputMode = 'text' | 'selector';

export function ChatTextInput({
  onSubmit,
  userInput,
  setUserInput,
  runningAgent,
}: ChatTextInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('selector');

  function keyDownHandler(e: KeyboardEvent) {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !isComposing &&
      !runningAgent &&
      userInput.trim().length
    ) {
      if (e.ctrlKey || e.metaKey) {
        const el = ref.current;
        e.preventDefault();
        if (el) {
          const start = el.selectionStart;
          const end = el.selectionEnd;

          const newValue = userInput.slice(0, start) + '\n' + userInput.slice(end);
          setUserInput(newValue);
        }
      } else {
        e.preventDefault();
        onSubmit(userInput);
      }
    }
  }

  const handleSelectorSubmit = (query: string) => {
    onSubmit(query);
  };

  return (
    <div className="shrink-0 space-y-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-1 p-1 bg-muted/30 rounded-xl w-fit mx-auto">
        <button
          onClick={() => setInputMode('selector')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            inputMode === 'selector'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          コース選択
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            inputMode === 'text'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          テキスト入力
        </button>
      </div>

      {inputMode === 'selector' ? (
        /* Course Selector Mode */
        <CourseSelector onSubmit={handleSelectorSubmit} disabled={runningAgent} />
      ) : (
        /* Text Input Mode */
        <>
          {/* Quick prompts */}
          {!runningAgent && !userInput.trim() && (
            <div className="flex gap-2 flex-wrap justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={prompt.text}
                  onClick={() => setUserInput(prompt.text)}
                  className="group flex items-center gap-2 text-xs px-4 py-2 rounded-full border border-border/50 bg-card/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:-translate-y-1 hover:shadow-md hover:shadow-primary/10 transition-all duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <prompt.icon className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="relative group">
            {/* Glow effect on focus */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            
            <div className="relative rounded-2xl border border-border/50 bg-card/90 backdrop-blur-md shadow-xl shadow-black/5 focus-within:border-primary/50 transition-all duration-300">
              <Textarea
                ref={ref}
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={keyDownHandler}
                placeholder="ゴルフ場名またはGCコードとプレー日を入力..."
                className="pr-14 flex-1 shrink-0 overflow-y-auto overflow-x-hidden h-auto min-h-14 resize-none text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
              />
              
              {/* Send button */}
              <div className="absolute bottom-2.5 right-2.5">
                {runningAgent ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        testId="send-message-disabled-btn"
                        type="submit"
                        size="icon"
                        disabled
                        className="rounded-xl bg-primary/80 shadow-md"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      <span>査定中...</span>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        onClick={() => onSubmit(userInput)}
                        size="icon"
                        testId="send-message-btn"
                        disabled={!userInput.trim().length}
                        className="rounded-xl shadow-md hover:shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-200 disabled:opacity-30"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">送信 (Enter)</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Hint text */}
          <p className="text-center text-[10px] text-muted-foreground/50">
            Enter で送信 · Shift+Enter で改行
          </p>
        </>
      )}
    </div>
  );
}
