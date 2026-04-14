import { memo, useMemo, Component, type ReactNode, type ErrorInfo } from 'react';
import {
  User,
  Bot,
  Cog,
  Hammer,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';
import type { ContentPart, ToolInvocationUIPart } from '@/types/message';
import { useChatContext } from '@/hooks/use-chat-context';
import type { ChatMessageEvent } from '@/types/events';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { unwrapMarkdownCodeBlocks } from '@/lib/markdown';

interface ChatMessageErrorBoundaryProps {
  children: ReactNode;
  message: ChatMessageEvent;
}

interface ChatMessageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChatMessageErrorBoundary extends Component<
  ChatMessageErrorBoundaryProps,
  ChatMessageErrorBoundaryState
> {
  constructor(props: ChatMessageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ChatMessageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChatMessage render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={'flex gap-3 p-4 rounded-lg bg-card'}>
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/20 text-destructive">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="mn-label text-destructive">Failed to render message</span>
            </div>
            <CodeBlock code={JSON.stringify(this.props.message, null, 2)} />
            {this.state.error && (
              <div className="caption-01 my-2">
                <div>{this.state.error.message}</div>
                <div>{this.state.error.stack}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function UniversalContentPart({ part }: { part: ContentPart }) {
  if (part.type === 'text') {
    return <TextContentPart content={part.text} />;
  }
  if (part.type === 'reasoning') {
    return <TextContentPart content={part.reasoning} />;
  }
  if (part.type === 'tool-invocation') {
    return <ToolInvocationPart part={part} />;
  }
  return <CodeBlock code={JSON.stringify(part, null, '  ')} />;
}

export function TextContentPart({ content }: { content: string }) {
  return <Markdown content={content ? unwrapMarkdownCodeBlocks(content) : ''} />;
}

export function ToolInvocationPart({ part }: { part: ToolInvocationUIPart }) {
  const { toolInvocation } = part;
  const { toolName } = toolInvocation;
  const ctx = useChatContext();
  const tool = ctx.getTool(toolName);
  if (tool?.render) {
    return tool.render({ status: 'complete', args: toolInvocation.args });
  }
  if (tool?.renderAndWait) {
    return tool.renderAndWait({
      status: 'complete',
      args: toolInvocation.args,
      callback: event => {
        console.log(event);
      },
    });
  }

  const hasResult = !!toolInvocation.result;

  const result = useMemo(() => {
    try {
      if (toolInvocation.result) {
        return JSON.stringify(JSON.parse(toolInvocation.result), null, '  ');
      }
    } catch (e) {
      console.debug('Tool result is not a JSON', toolInvocation.result);
    }
    return toolInvocation.result || '';
  }, [toolInvocation.result]);

  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 dark:bg-card/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 dark:bg-muted/20 border-b border-border">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <span className="body-secondary">Tool Call</span>
        <Badge variant="default" className="code">
          {toolInvocation.toolName}
        </Badge>
        {hasResult ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 ml-auto" />
        ) : (
          <Loader2 className="w-4 h-4 text-muted-foreground ml-auto animate-spin" />
        )}
      </div>

      {/* Arguments Section */}
      {toolInvocation.args && (
        <div className="border-b border-border last:border-b-0">
          <div className="caption-01 flex items-center gap-1.5 px-3 py-1.5 bg-muted/20">
            <ChevronRight className="w-3 h-3" />
            Arguments
          </div>
          <CodeBlock code={JSON.stringify(toolInvocation.args, null, '  ')} />
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div>
          <div className="caption-01 flex items-center gap-1.5 px-3 py-1.5 bg-muted/20">
            <ChevronRight className="w-3 h-3" />
            Result
          </div>
          <CodeBlock code={result} />
        </div>
      )}
    </div>
  );
}

function ChatMessageContent({
  id,
  role,
  threadId,
  resourceId,
  content,
  type = 'default',
}: ChatMessageEvent) {
  const isUser = role === 'user';
  let Icon = useMemo(() => {
    if (isUser) {
      return User;
    } else if (role === 'system') {
      return Cog;
    } else if (role === 'reasoning') {
      return Brain;
    } else if (content.parts.some(({ type }) => type === 'tool-invocation')) {
      return Hammer;
    } else {
      return Bot;
    }
  }, [role, content.parts]);

  return (
    <div
      className={cn(
        'flex gap-4 p-4 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
        isUser 
          ? 'bg-gradient-to-r from-primary/8 to-primary/5 border border-primary/15 shadow-sm shadow-primary/5' 
          : 'bg-card/50 backdrop-blur-sm hover:bg-muted/30 border border-transparent hover:border-border/30'
      )}
      data-message-id={id}
      data-thread-id={threadId}
      data-resource-id={resourceId}
      data-testid={`${type}-${role}-message-${id}`}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-105',
            isUser
              ? 'bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-primary/25'
              : role === 'assistant'
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20'
                : role === 'reasoning'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-400/20'
                  : 'bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-accent/20'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'text-xs font-semibold tracking-wide',
            isUser ? 'text-primary' : 'text-muted-foreground'
          )}>
            {role === 'assistant' ? 'PGM 価格査定AI' : role === 'user' ? 'あなた' : role === 'reasoning' ? '思考中...' : role}
          </span>
        </div>
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words text-wrap [line-break:anywhere] overflow-hidden">
          {content.parts.map((part, i) => (
            <UniversalContentPart key={i} part={part} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatMessage(props: ChatMessageEvent) {
  return (
    <ChatMessageErrorBoundary message={props}>
      <ChatMessageContent {...props} />
    </ChatMessageErrorBoundary>
  );
}

export const ChatMessagesMemo = memo(ChatMessage);
