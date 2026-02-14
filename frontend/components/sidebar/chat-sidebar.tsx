'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageSquare, LogOut, Menu } from 'lucide-react';
import { chatApi } from '@/lib/chat-api';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { Chat } from '@/types';
import { toast } from 'sonner';

export function ChatSidebar() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chats = useChatStore((state) => state.chats);
  const setChats = useChatStore((state) => state.setChats);
  const currentChat = useChatStore((state) => state.currentChat);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatApi.getChats();
      if (response.success) {
        setChats(response.data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleNewChat = () => {
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-muted/50 border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4">
            <Button
              onClick={handleNewChat}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          <Separator />

          {/* Chat List */}
          <ScrollArea className="flex-1 px-2 py-4">
            {isLoading ? (
              <div className="space-y-2 px-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chats yet</p>
                <p className="text-xs mt-1">Start a new conversation!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chats.map((chat) => (
                  <Link
                    key={chat._id}
                    href={`/c/${chat._id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentChat?._id === chat._id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">
                        {chat.title || 'New Chat'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Footer */}
          <div className="p-4 space-y-2">
            {user && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-xs truncate">{user.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
