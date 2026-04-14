import { useLayoutEffect } from 'react';
import { Outlet, useNavigate, useParams, useMatch } from 'react-router-dom';
import { ChatSidebar } from '@/components/ChatSidebar.tsx';
import { useChatList } from '@/hooks/use-chat-list.ts';
import { PATHS } from '@/constants/path.ts';
import { usePricingMode } from '@/hooks/use-pricing-mode';

export function MainLayout() {
  const { chatId = '' } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { mode, toggleMode, isDemo } = usePricingMode();

  const setChatIdHandler = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const isChatEmptyPage = useMatch(PATHS.CHAT_EMPTY);
  const isChatSelectedPage = useMatch(PATHS.CHAT);
  const isChat = isChatEmptyPage || isChatSelectedPage;

  const {
    hasChat,
    isNewChat,
    chats,
    isLoadingChats,
    addChatHandler,
    deleteChatHandler,
    isDeletingChat,
  } = useChatList({
    chatId,
    setChatId: setChatIdHandler,
    showStartChat: !chatId,
  });

  useLayoutEffect(() => {
    if (isLoadingChats || !chats || chats?.find(c => c.id === chatId)) {
      return;
    }
    if (!isChat) {
      return;
    }
    // /chat（空ページ）ではランディングページを表示し、自動作成しない
    if (isChatEmptyPage) {
      return;
    }
    if (!chats.length) {
      addChatHandler();
    } else {
      setChatIdHandler(chats[0].id);
    }
  }, [chats, isLoadingChats, isChat, isChatEmptyPage, chatId]);

  return (
    <div className="flex flex-row w-full h-svh">
      <ChatSidebar
        isLoading={isLoadingChats}
        chatId={chatId}
        chats={chats}
        onChatCreate={addChatHandler}
        onChatSelect={setChatIdHandler}
        onChatDelete={deleteChatHandler}
        isDeletingChat={isDeletingChat}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-gradient-to-r from-card via-card to-primary/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-primary-foreground text-sm font-bold tracking-wider">PGM</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight tracking-tight">ダイナミックプライシング</h1>
              <p className="text-[10px] text-muted-foreground leading-tight tracking-wide">Dynamic Pricing AI</p>
            </div>
          </div>
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300 cursor-pointer shadow-sm ${
              isDemo
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 hover:shadow-amber-200/50 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:shadow-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDemo ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isDemo ? 'デモ' : '本番'}
          </button>
        </header>
        <Outlet
          context={{
            hasChat,
            isNewChat,
            isLoadingChats,
            addChatHandler,
          }}
        />
      </div>
    </div>
  );
}
