"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Send, User, Search, Filter, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface Message {
  id: string
  content: string
  sender: "admin" | "seller" | "customer"
  timestamp: Date
  read: boolean
  sender_type?: string
  message_content?: string
  created_at?: string
  is_read?: boolean
}

interface Conversation {
  id: string
  participantName: string
  participantType: "seller" | "customer"
  participantEmail: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  messages: Message[]
  user_name?: string
  user_email?: string
  subject?: string
  status?: string
  last_message?: string
  unread_count?: number
  last_message_at?: string
}

export function AdminMessages() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch real conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/support/conversations')
        if (response.ok) {
          const data = await response.json()
          const formattedConversations: Conversation[] = data.conversations.map((conv: any) => ({
            id: conv.id.toString(),
            participantName: conv.user_name || 'Unknown User',
            participantType: "customer" as const,
            participantEmail: conv.user_email,
            lastMessage: conv.last_message || 'No messages',
            lastMessageTime: new Date(conv.last_message_at || conv.created_at),
            unreadCount: conv.unread_count || 0,
            messages: [], // Will be loaded when conversation is selected
            user_name: conv.user_name,
            user_email: conv.user_email,
            subject: conv.subject,
            status: conv.status,
            last_message: conv.last_message,
            unread_count: conv.unread_count,
            last_message_at: conv.last_message_at
          }))
          setConversations(formattedConversations)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
        // Fallback to mock data if API fails
        const mockConversations: Conversation[] = [
          {
            id: "1",
            participantName: "John Doe",
            participantType: "customer",
            participantEmail: "john@example.com",
            lastMessage: "Hi, I have a question about my order #12345",
            lastMessageTime: new Date(Date.now() - 1000 * 60 * 30),
            unreadCount: 2,
            messages: []
          }
        ]
        setConversations(mockConversations)
      }
    }

    fetchConversations()
  }, [])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          message_content: newMessage,
          sender_type: 'admin'
        })
      })

      if (response.ok) {
        const message: Message = {
          id: Date.now().toString(),
          content: newMessage,
          sender: "admin",
          timestamp: new Date(),
          read: true
        }

        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  lastMessage: newMessage,
                  lastMessageTime: new Date()
                }
              : conv
          )
        )

        setSelectedConversation(prev => 
          prev ? {
            ...prev,
            messages: [...prev.messages, message],
            lastMessage: newMessage,
            lastMessageTime: new Date()
          } : null
        )

        setNewMessage("")
      } else {
        console.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/support/messages?conversation_id=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.message_content,
          sender: msg.sender_type as "admin" | "customer",
          timestamp: new Date(msg.created_at),
          read: msg.is_read
        }))
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, messages: formattedMessages }
              : conv
          )
        )
        
        const conversation = conversations.find(c => c.id === conversationId)
        if (conversation) {
          setSelectedConversation({
            ...conversation,
            messages: formattedMessages
          })
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participantEmail.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Messages"
        >
          <MessageCircle className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs bg-red-500">
              {totalUnreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Messages
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? "bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation)
                      loadConversationMessages(conversation.id)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-xs ${
                          conversation.participantType === "seller" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {conversation.participantName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">
                            {conversation.participantName}
                          </p>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                conversation.participantType === "seller" 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {conversation.participantType}
                            </Badge>
                            {conversation.unreadCount > 0 && (
                              <Badge className="h-4 w-4 flex items-center justify-center p-0 text-xs bg-red-500">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(conversation.lastMessageTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`text-xs ${
                          selectedConversation.participantType === "seller" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {selectedConversation.participantName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedConversation.participantName}</p>
                        <p className="text-xs text-muted-foreground">{selectedConversation.participantEmail}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Mark as read</DropdownMenuItem>
                        <DropdownMenuItem>Archive conversation</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Block user</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${
                          message.sender === "admin" ? "flex-row-reverse space-x-reverse" : ""
                        }`}>
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className={`text-xs ${
                              message.sender === "admin" 
                                ? "bg-yellow-400 text-black" 
                                : message.sender === "seller"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {message.sender === "admin" ? "A" : 
                               message.sender === "seller" ? "S" : "C"}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className={`rounded-lg p-3 ${
                            message.sender === "admin"
                              ? "bg-yellow-400 text-black"
                              : "bg-muted"
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === "admin" ? "text-black/70" : "text-muted-foreground"
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}