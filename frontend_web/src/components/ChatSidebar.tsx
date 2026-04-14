import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Settings,
  LoaderCircle,
  Sparkles,
  History,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialogModal } from '@/components/ConfirmDialog.tsx';
import type { ChatListItem } from '@/api/chat/types';
import { useMatch, Link } from 'react-router-dom';
import { JSX, useState } from 'react';
import { PATHS } from '@/constants/path.ts';

export interface ChatSidebarProps {
  isLoading: boolean;
  chatId: string;
  onChatCreate: () => any;
  onChatSelect: (threadId: string) => any;
  onChatDelete: (threadId: string, callbackFn: () => void) => any;
  chats?: ChatListItem[];
  isDeletingChat: boolean;
}

export function ChatSidebar({
  isLoading,
  chats,
  chatId,
  onChatSelect,
  onChatCreate,
  onChatDelete,
  isDeletingChat,
}: ChatSidebarProps) {
  const matchSettings = useMatch(PATHS.SETTINGS.ROOT);
  const [chatToDelete, setChatToDelete] = useState<ChatListItem | null>(null);
  const getIcon = (id: string): JSX.Element => {
    if (id === chatToDelete?.id && isDeletingChat) {
      return <LoaderCircle className="animate-spin text-primary" />;
    }
    if (id === chatId) {
      return <MessageSquareText className="text-primary" />;
    }
    return <MessageSquare className="text-muted-foreground/70" />;
  };
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Sidebar className="sidebar border-r border-border/30 bg-gradient-to-b from-card via-card to-muted/20">
      <SidebarContent className="px-2">
        {/* Header with brand */}
        <div className="px-3 py-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-primary-foreground text-xs font-bold">PGM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">価格査定AI</span>
              <span className="text-[10px] text-muted-foreground">Dynamic Pricing</span>
            </div>
          </div>
        </div>

        <SidebarGroup>
          {/* New chat button */}
          <SidebarMenuItem key="new-chat" className="mb-3">
            <SidebarMenuButton
              disabled={isLoading}
              onClick={onChatCreate}
              testId="start-new-chat-btn"
              className="group w-full justify-center bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-xl py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10"
            >
              <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-primary font-medium">新しい価格査定</span>
              <Sparkles className="w-3 h-3 text-primary/50 ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarGroupLabel className="flex items-center gap-1.5 text-muted-foreground/70 text-[10px] uppercase tracking-wider font-medium mb-1">
            <History className="w-3 h-3" />
            査定履歴
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu id="sidebar-chats" className="space-y-0.5">
              {isLoading ? (
                <div className="space-y-2 px-1">
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                </div>
              ) : (
                !!chats &&
                chats.map((chat: ChatListItem) => (
                  <SidebarMenuItem key={chat.id} testId={`chat-${chat.id}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={chat.id === chatId}
                      onClick={() => onChatSelect(chat.id)}
                      className={`rounded-lg transition-all duration-200 ${
                        chat.id === chatId 
                          ? 'bg-primary/15 border-l-2 border-primary shadow-sm' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 py-2">
                        {getIcon(chat.id)}
                        <span className={`text-sm truncate ${chat.id === chatId ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {chat.name || '新しい査定'}
                        </span>
                      </div>
                    </SidebarMenuButton>
                    {chat.initialised && !chatToDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="min-w-[120px]">
                          <DropdownMenuItem
                            testId="delete-chat-menu-item"
                            onClick={() => {
                              setChatToDelete(chat);
                              setOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <span>削除</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <div className="border-t border-border/30 p-3 bg-muted/10">
        <SidebarMenuButton
          disabled={isLoading}
          asChild
          isActive={!!matchSettings}
          className="rounded-lg hover:bg-muted/50 transition-all duration-200"
        >
          <Link to={PATHS.SETTINGS.ROOT} className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">アプリ設定</span>
          </Link>
        </SidebarMenuButton>
      </div>

      <ConfirmDialogModal
        open={open}
        setOpen={setOpen}
        onSuccess={() => onChatDelete(chatToDelete!.id, () => setChatToDelete(null))}
        onDiscard={() => setChatToDelete(null)}
        chatName={chatToDelete?.name || ''}
      />
    </Sidebar>
  );
}
