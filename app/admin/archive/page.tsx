"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Archive, RotateCcw, Trash2, Search, Filter, Package, ShoppingCart, Users, ChevronDown, ChevronRight, Image } from 'lucide-react'
import { toast } from 'sonner'

interface ArchivedItem {
  id: number
  name: string
  type: 'product' | 'order' | 'user' | 'carousel'
  archived_at: string
  archived_by?: string
  reason?: string
  details: any
}

export default function ArchivePage() {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [restoring, setRestoring] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['product', 'order', 'user', 'carousel']))

  useEffect(() => {
    fetchArchivedItems()
  }, [])

  const fetchArchivedItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/archive')
      if (response.ok) {
        const data = await response.json()
        setArchivedItems(data.items || [])
      } else {
        toast.error('Failed to fetch archived items')
      }
    } catch (error) {
      console.error('Error fetching archived items:', error)
      toast.error('Error loading archived items')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: number, type: string) => {
    try {
      setRestoring(id)
      
      // Get JWT token from localStorage for admin authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      console.log('🔑 Frontend: JWT token found:', !!token)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      console.log('📡 Frontend: Making restore request for:', { id, type })
      
      const response = await fetch('/api/admin/archive/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, type }),
      })
      
      console.log('📡 Frontend: Response status:', response.status)

      if (response.ok) {
        console.log('✅ Frontend: Restore successful')
        toast.success('Item restored successfully')
        fetchArchivedItems()
      } else {
        const error = await response.json()
        console.error('❌ Frontend: Restore failed:', error)
        toast.error(error.message || 'Failed to restore item')
      }
    } catch (error) {
      console.error('Error restoring item:', error)
      toast.error('Error restoring item')
    } finally {
      setRestoring(null)
    }
  }

  const handlePermanentDelete = async (id: number, type: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(id)
      const response = await fetch('/api/admin/archive/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, type }),
      })

      if (response.ok) {
        toast.success('Item permanently deleted')
        fetchArchivedItems()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Error deleting item')
    } finally {
      setDeleting(null)
    }
  }

  const filteredItems = archivedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesType
  })

  // Group items by category
  const groupedItems = {
    product: filteredItems.filter(item => item.type === 'product'),
    order: filteredItems.filter(item => item.type === 'order'),
    user: filteredItems.filter(item => item.type === 'user'),
    carousel: filteredItems.filter(item => item.type === 'carousel')
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package className="h-4 w-4" />
      case 'order':
        return <ShoppingCart className="h-4 w-4" />
      case 'user':
        return <Users className="h-4 w-4" />
      case 'carousel':
        return <Image className="h-4 w-4" />
      default:
        return <Archive className="h-4 w-4" />
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-100 text-blue-800'
      case 'order':
        return 'bg-green-100 text-green-800'
      case 'user':
        return 'bg-purple-100 text-purple-800'
      case 'carousel':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archive Management</h1>
          <p className="text-muted-foreground">
            Manage archived items and restore or permanently delete them
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Archive className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {archivedItems.filter(item => item.type === 'product').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {archivedItems.filter(item => item.type === 'order').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {archivedItems.filter(item => item.type === 'user').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Carousel</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {archivedItems.filter(item => item.type === 'carousel').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Items</CardTitle>
          <CardDescription>
            View and manage all archived items in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search archived items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No archived items found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No items have been archived yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => {
                if (items.length === 0) return null
                
                const isExpanded = expandedCategories.has(category)
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1) + 's'
                
                return (
                  <div key={category} className="border rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getTypeIcon(category)}
                        <h3 className="text-lg font-medium text-gray-900">{categoryName}</h3>
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
                          {items.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Archived Date</TableHead>
                              <TableHead>Archived By</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={`${item.type}-${item.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {getTypeIcon(item.type)}
                                    <div className="font-medium">{item.name}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {new Date(item.archived_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{item.archived_by || 'System'}</TableCell>
                                <TableCell>{item.reason || 'No reason provided'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRestore(item.id, item.type)}
                                      disabled={restoring === item.id}
                                    >
                                      {restoring === item.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                      ) : (
                                        <RotateCcw className="h-4 w-4" />
                                      )}
                                      <span className="ml-1">Restore</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}