
import React, { useState } from 'react';
import { MessageThread, Notification as NotificationType } from '../../types';
import { 
    SearchIcon, 
    PlusIcon,
    EllipsisVerticalIcon,
    PaperAirplaneIcon,
    BellIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftEllipsisIcon,
    BriefcaseIcon,
} from '../icons/Icons';
import { MESSAGE_THREADS, NOTIFICATIONS } from '../../data/mockData';

const MessagesPage: React.FC<{}> = () => {
    const [activeThread, setActiveThread] = useState<MessageThread | null>(MESSAGE_THREADS[0]);
    const [isChatListVisible, setIsChatListVisible] = useState(true);

    const handleThreadSelect = (thread: MessageThread) => {
      setActiveThread(thread);
      if (window.innerWidth < 768) { // md breakpoint
        setIsChatListVisible(false);
      }
    };
    
    const ChatList = () => (
       <aside className={`w-full md:w-1/3 xl:w-1/4 bg-white dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700/50 rounded-l-lg p-4 flex-col ${isChatListVisible ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chats</h2>
          </div>
          <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
              <input type="text" placeholder="Search chats..." className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg pl-10 pr-4 py-2" />
          </div>
          <div className="flex-grow overflow-y-auto -mr-2 pr-2">
              {MESSAGE_THREADS.map(thread => (
                  <div key={thread.id} onClick={() => handleThreadSelect(thread)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-2 transition-colors ${activeThread?.id === thread.id ? 'bg-indigo-100 dark:bg-indigo-600/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      <div className="relative">
                        <img src={thread.user.avatarUrl} alt={thread.user.name} className="w-12 h-12 rounded-full" />
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ${activeThread?.id === thread.id ? 'ring-indigo-100 dark:ring-indigo-600/30' : 'ring-white dark:ring-slate-800'}`}></span>
                      </div>
                      <div className="flex-grow overflow-hidden">
                          <div className="flex justify-between">
                              <p className="font-semibold truncate">{thread.user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{thread.timestamp}</p>
                          </div>
                          <div className="flex justify-between items-baseline">
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{thread.lastMessage}</p>
                              {thread.unreadCount > 0 && <span className="bg-indigo-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">{thread.unreadCount}</span>}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
            <PlusIcon className="w-5 h-5"/> New Chat
          </button>
      </aside>
    );

    const ChatWindow = () => (
      <main className={`w-full md:w-2/3 xl:w-2/4 bg-white dark:bg-slate-800/50 flex flex-col ${isChatListVisible && 'hidden md:flex'}`}>
          {activeThread ? (
              <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <button className="md:hidden" onClick={() => setIsChatListVisible(true)}>←</button>
                      <img src={activeThread.user.avatarUrl} alt={activeThread.user.name} className="w-10 h-10 rounded-full" />
                      <h2 className="text-xl font-bold">{activeThread.user.name}</h2>
                  </div>
                  <button><EllipsisVerticalIcon className="w-6 h-6 text-slate-500 dark:text-slate-400"/></button>
              </div>
              <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50 dark:bg-transparent">
                    {activeThread.messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-end gap-2 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'them' && <img src={activeThread.user.avatarUrl} className="w-8 h-8 rounded-full"/>}
                            <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                <p>{msg.text}</p>
                                <p className="text-xs mt-1 text-right opacity-70">{msg.time}</p>
                            </div>
                        </div>
                    ))}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <input type="text" placeholder="Type your message..." className="bg-transparent w-full focus:outline-none px-3" />
                      <button className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"><PaperAirplaneIcon className="w-6 h-6"/></button>
                  </div>
              </div>
              </>
          ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">Select a chat to start messaging</div>
          )}
      </main>
    );

    const NotificationPanel = () => {
      const iconMap: { [key: string]: React.ReactNode } = {
        'congrats': <CheckCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>,
        'maintenance': <InformationCircleIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>,
        'profile': <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 dark:text-amber-400"/>,
        'message': <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-fuchsia-500 dark:text-fuchsia-400"/>,
        'gig': <BriefcaseIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400"/>,
      }
      const getIcon = (text: React.ReactNode) => {
        const s = String(text).toLowerCase();
        if (s.includes('congrats')) return iconMap.congrats;
        if (s.includes('maintenance')) return iconMap.maintenance;
        if (s.includes('profile')) return iconMap.profile;
        if (s.includes('message')) return iconMap.message;
        if (s.includes('gig')) return iconMap.gig;
        return <BellIcon className="w-6 h-6 text-slate-500 dark:text-slate-400"/>;
      }
      return (
        <aside className="w-full md:w-1/3 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700/50 rounded-r-lg p-4 hidden xl:flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Notifications</h2>
                <button className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-500">Clear All</button>
            </div>
            <div className="space-y-4 overflow-y-auto">
                {NOTIFICATIONS.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">{getIcon(n.text)}</div>
                        <div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-tight">{n.text}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
      );
    };

    return (
        <div className="container mx-auto p-4">
          <div className="flex h-[calc(100vh-88px)] bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-lg">
              <ChatList />
              <ChatWindow />
              <NotificationPanel />
          </div>
        </div>
    );
};

export default MessagesPage;
