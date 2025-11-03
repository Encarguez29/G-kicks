'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, Clock, User, Mail } from 'lucide-react'
import Link from 'next/link'

interface Conversation {
  id: number
  user_id: number
  user_email: string
  user_name: string
  status: string
  created_at: string
  updated_at: string
  last_message_at: string
  unread_count: number
  latest_message: string
  latest_message_time: string
}

interface Message {
  id: number
  content: string
  sender: string
  timestamp: string
  is_read: boolean
}

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchConversations()
    
    // Set up auto-refresh for conversations every 30 seconds
    const conversationInterval = setInterval(fetchConversations, 30000)
    
    return () => clearInterval(conversationInterval)
  }, [])

  useEffect(() => {
    if (!selectedConversation) return

    // Set up auto-refresh for messages every 10 seconds when a conversation is selected
    const messageInterval = setInterval(() => {
      fetchMessages(selectedConversation.id)
    }, 10000)

    return () => clearInterval(messageInterval)
  }, [selectedConversation])

  const fetchConversations = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/support/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success && data.conversations) {
        setConversations(data.conversations)
      } else {
        setError('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setError('Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: number) => {
    setMessagesLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/support/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success && data.messages) {
        setMessages(data.messages)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/support/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          sender_type: 'admin'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage('')
        // Refresh messages to show the new reply
        await fetchMessages(selectedConversation.id)
        // Refresh conversations to update last message info
        await fetchConversations()
      } else {
        console.error('Failed to send message:', data.error)
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchConversations}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center text-blue-400 hover:text-blue-300">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Admin
            </Link>
            <h1 className="text-xl font-semibold">Customer Support</h1>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Conversations List */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Customer Conversations
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {conversations.length} total conversations
            </p>
          </div>

          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No customer conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{conversation.user_name || 'Unknown User'}</span>
                        {conversation.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-400">{conversation.user_email || 'No email'}</span>
                      </div>
                      {conversation.latest_message && (
                        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                          {conversation.latest_message}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(conversation.latest_message_time || conversation.created_at)}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conversation.status === 'open' 
                        ? 'bg-green-600 text-green-100'
                        : conversation.status === 'pending'
                        ? 'bg-yellow-600 text-yellow-100'
                        : 'bg-gray-600 text-gray-100'
                    }`}>
                      {conversation.status || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedConversation.user_name || 'Unknown User'}</h3>
                    <p className="text-sm text-gray-400">{selectedConversation.user_email || 'No email'}</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    Started {formatDate(selectedConversation.created_at)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>No messages in this conversation</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'customer'
                            ? 'bg-gray-700 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Input */}
              <div className="bg-gray-800 border-t border-gray-700 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}