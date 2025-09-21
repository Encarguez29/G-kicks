"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Send, 
  MessageCircle, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck,
  ArrowLeft,
  Phone,
  Mail,
  HelpCircle
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Message {
  id: string
  content: string
  sender: "user" | "support" | "admin"
  timestamp: Date
  orderId?: string
  type?: "text" | "order-inquiry" | "system"
  sender_type?: string
  message_content?: string
  created_at?: string
  conversation_id?: string
}

interface Order {
  id: string
  status: string
  total: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  orderDate: Date
}

export default function CustomerSupportPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing conversation or create new one
  useEffect(() => {
    if (user) {
      loadOrCreateConversation()
      
      setUserOrders([
        {
          id: "ORD-2024-001",
          status: "shipped",
          total: 129.99,
          items: [
            { name: "Nike Air Max 270", quantity: 1, price: 129.99 }
          ],
          orderDate: new Date("2024-01-15")
        },
        {
          id: "ORD-2024-002", 
          status: "processing",
          total: 89.99,
          items: [
            { name: "Adidas Ultraboost 22", quantity: 1, price: 89.99 }
          ],
          orderDate: new Date("2024-01-20")
        }
      ])
    }
  }, [user])

  // Real-time polling for new admin messages
  useEffect(() => {
    if (!conversationId) return

    const pollForMessages = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`/api/support/messages?conversation_id=${conversationId}`, {
          headers
        })
        if (response.ok) {
          const data = await response.json()
          const apiMessages = data.messages.map((msg: any) => ({
            id: msg.id.toString(),
            content: msg.message_content,
            sender: msg.sender_type === 'admin' ? 'admin' : msg.sender_type === 'user' ? 'user' : 'support',
            timestamp: new Date(msg.created_at),
            conversation_id: msg.conversation_id
          }))

          // Only update if we have new messages
          setMessages(prevMessages => {
            const existingIds = new Set(prevMessages.map(m => m.id))
            const newMessages = apiMessages.filter((msg: any) => !existingIds.has(msg.id))
            
            if (newMessages.length > 0) {
              return [...prevMessages, ...newMessages]
            }
            return prevMessages
          })
        }
      } catch (error) {
        console.error('Error polling for messages:', error)
      }
    }

    // Poll every 3 seconds for new messages
    const interval = setInterval(pollForMessages, 3000)
    
    return () => clearInterval(interval)
  }, [conversationId])

  const loadOrCreateConversation = async () => {
    if (!user) return

    try {
      // Get auth token for API calls
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // First, try to get existing conversations for this user
      const response = await fetch('/api/support/conversations', {
        headers
      })
      if (response.ok) {
        const data = await response.json()
        const userConversation = data.conversations.find((conv: any) => 
          conv.user_email === user.email
        )

        if (userConversation) {
          // Load existing conversation
          setConversationId(userConversation.id.toString())
          await loadConversationMessages(userConversation.id.toString())
        } else {
          // Create new conversation with welcome message
          await createNewConversation()
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      // Fallback to welcome message
      setMessages([
        {
          id: "welcome",
          content: `Hello ${user.email}! Welcome to GKicks Customer Support. How can I help you today?`,
          sender: "support",
          timestamp: new Date(),
          type: "text"
        }
      ])
    }
  }

  const createNewConversation = async () => {
    if (!user) return

    try {
      // Get auth token for API calls
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/support/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.email,
          subject: 'Customer Support Request',
          message_content: 'Customer initiated support conversation',
          status: 'active'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newConvId = data.conversation.id.toString()
        setConversationId(newConvId)
        
        // Add welcome message
        setMessages([
          {
            id: "welcome",
            content: `Hello ${user.email}! Welcome to GKicks Customer Support. How can I help you today?`,
            sender: "support",
            timestamp: new Date(),
            type: "text"
          }
        ])
        
        return newConvId
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to create conversation:', response.status, errorData)
        throw new Error(`Failed to create conversation: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
       console.error('Error creating conversation:', error)
       throw error
     }
   }

  const loadConversationMessages = async (convId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/support/messages?conversation_id=${convId}`, {
        headers
      })
      if (response.ok) {
        const data = await response.json()
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.message_content,
          sender: msg.sender_type === 'customer' ? 'user' : (msg.sender_type === 'admin' ? 'admin' : 'support'),
          timestamp: new Date(msg.created_at),
          type: msg.message_type || 'text',
          conversation_id: convId
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      console.log('No message content')
      return
    }
    
    let currentConversationId = conversationId
    
    if (!currentConversationId) {
      console.log('No conversation ID, creating new conversation...')
      currentConversationId = await createNewConversation()
      if (!currentConversationId) {
        console.error('Failed to create conversation')
        return
      }
    }

    console.log('Sending message with conversation ID:', currentConversationId)

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date(),
      orderId: selectedOrder || undefined,
      type: selectedOrder ? "order-inquiry" : "text"
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = newMessage
    setNewMessage("")
    setIsTyping(true)

    try {
      // Send message to API
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation_id: currentConversationId,
          message_content: messageContent,
          sender_type: 'customer',
          order_id: selectedOrder || null
        })
      })

      console.log('Message send response status:', response.status)

      if (response.ok) {
        // Message sent successfully
        setIsTyping(false)
        
        // Poll for admin replies every 3 seconds
        const pollForReplies = setInterval(async () => {
          try {
            const token = localStorage.getItem('auth_token')
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            }
            if (token) {
              headers['Authorization'] = `Bearer ${token}`
            }

            const messagesResponse = await fetch(`/api/support/messages?conversation_id=${currentConversationId}`, {
              headers
            })
            if (messagesResponse.ok) {
              const data = await messagesResponse.json()
              const latestMessages: Message[] = data.messages.map((msg: any) => ({
                id: msg.id.toString(),
                content: msg.message_content,
                sender: msg.sender_type === 'customer' ? 'user' : (msg.sender_type === 'admin' ? 'admin' : 'support'),
                timestamp: new Date(msg.created_at),
                type: msg.message_type || 'text',
                conversation_id: currentConversationId
              }))
              
              // Only update if there are new messages
              setMessages(prev => {
                if (prev.length !== latestMessages.length) {
                  return latestMessages
                }
                return prev
              })
            }
          } catch (error) {
            console.error('Error polling for replies:', error)
          }
        }, 3000)

        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollForReplies)
        }, 30000)

      } else {
        const errorText = await response.text()
        console.error('Failed to send message:', response.status, errorText)
        setIsTyping(false)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "shipped": return "bg-blue-500"
      case "delivered": return "bg-green-500"
      case "processing": return "bg-yellow-500"
      case "cancelled": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "shipped": return <Truck className="h-3 w-3" />
      case "delivered": return <CheckCircle className="h-3 w-3" />
      case "processing": return <Clock className="h-3 w-3" />
      default: return <Package className="h-3 w-3" />
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MessageCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <CardTitle>Customer Support</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please log in to access customer support and chat about your orders.
            </p>
            <Button onClick={() => router.push("/auth")} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-yellow-400 text-black">
                    GK
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold">GKicks Customer Support</h1>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Online - Average response time: 2 minutes</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="tel:+1234567890">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Us
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="mailto:support@gkicks.com">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Orders */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Your Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedOrder === order.id 
                        ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" 
                        : "border-border hover:border-yellow-400/50"
                    }`}
                    onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{order.id}</span>
                      <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${order.total} • {order.orderDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
                
                {userOrders.length === 0 && (
                  <div className="text-center py-6">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No orders found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Help */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Quick Help
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setNewMessage("I want to return an item")}
                >
                  Return an item
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setNewMessage("What are your shipping options?")}
                >
                  Shipping info
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setNewMessage("I have a question about sizing")}
                >
                  Size guide
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat with Support
                  </CardTitle>
                  {selectedOrder && (
                    <Badge variant="outline" className="text-xs">
                      Discussing: {selectedOrder}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <Separator />
              
              {/* Messages */}
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${
                          message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                        }`}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {message.sender === "user" ? (
                              <AvatarFallback className="bg-blue-500 text-white text-xs">
                                {user.email?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            ) : message.sender === "admin" ? (
                              <AvatarFallback className="bg-green-500 text-white text-xs">
                                AD
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="bg-yellow-400 text-black text-xs">
                                CS
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className={`rounded-lg p-3 ${
                            message.sender === "user"
                              ? "bg-blue-500 text-white"
                              : message.sender === "admin"
                              ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                              : "bg-muted"
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === "user" 
                                ? "text-blue-100" 
                                : message.sender === "admin"
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {message.sender === "admin" && (
                                <span className="ml-2 font-medium">Admin</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-yellow-400 text-black text-xs">
                              CS
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              
              <Separator />
              
              {/* Message Input */}
              <div className="p-4 flex-shrink-0">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedOrder ? `Ask about order ${selectedOrder}...` : "Type your message..."}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedOrder && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      💡 You're asking about order {selectedOrder}. Click on another order or deselect to ask general questions.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs"
                    >
                      Clear selection
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}