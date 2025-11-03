"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Archive, RotateCcw, Trash2, Search, Filter, Package, ShoppingCart, Users, ChevronDown, ChevronRight, Image, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ArchivedItem {
  id: number
  name: string
  type: 'product' | 'order' | 'user' | 'carousel' | 'message'
  archived_at: string
  archived_by?: string
  reason?: string
  details: any
}

interface User {
  id: string
  email: string
  role: string
}

export default function ArchivePage() {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [restoring, setRestoring] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['product', 'order', 'user', 'carousel', 'message']))
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchArchivedItems()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]))
      setCurrentUser({
        id: payload.userId,
        email: payload.email,
        role: payload.role
      })
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const isStaffUser = () => {
    return currentUser?.role === 'staff' || currentUser?.email === 'gkicksstaff@gmail.com'
  }

  const hasAdminAccess = () => {
    return currentUser?.role === 'admin' || currentUser?.email === 'gkcksdmn@gmail.com'
  }

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
      console.log('🗑️ Frontend: Starting delete for ID:', id, 'Type:', type)
      setDeleting(id)
      
      // Get JWT token from localStorage for admin authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      console.log('🔑 Frontend: Token found:', !!token)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      console.log('📡 Frontend: Making delete request to /api/admin/archive/delete')
      const response = await fetch('/api/admin/archive/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id, type }),
      })

      console.log('📡 Frontend: Response status:', response.status)
      console.log('📡 Frontend: Response ok:', response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Frontend: Delete successful:', result)
        toast.success('Item permanently deleted')
        fetchArchivedItems()
        // Remove from selected items if it was selected
        const itemKey = `${type}-${id}`
        if (selectedItems.has(itemKey)) {
          const newSelected = new Set(selectedItems)
          newSelected.delete(itemKey)
          setSelectedItems(newSelected)
        }
      } else {
        const error = await response.json()
        console.log('❌ Frontend: Delete failed:', error)
        toast.error(error.message || 'Failed to delete item')
      }
    } catch (error) {
      console.error('❌ Frontend: Error deleting item:', error)
      toast.error('Error deleting item')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select items to delete')
      return
    }

    if (!confirm(`Are you sure you want to permanently delete ${selectedItems.size} selected item(s)? This action cannot be undone.`)) {
      return
    }

    try {
      setBulkDeleting(true)
      
      // Get JWT token from localStorage for admin authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Convert selected items to array of {id, type} objects
      const itemsToDelete = Array.from(selectedItems).map(itemKey => {
        const [type, id] = itemKey.split('-')
        return { id: parseInt(id), type }
      })

      const response = await fetch('/api/admin/archive/bulk-delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ items: itemsToDelete }),
      })

      if (response.ok) {
        toast.success(`${selectedItems.size} item(s) permanently deleted`)
        setSelectedItems(new Set())
        fetchArchivedItems()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete selected items')
      }
    } catch (error) {
      console.error('Error bulk deleting items:', error)
      toast.error('Error deleting selected items')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleSelectItem = (itemKey: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemKey)
    } else {
      newSelected.delete(itemKey)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = (category: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    const categoryItems = groupedItems[category as keyof typeof groupedItems]
    
    categoryItems.forEach(item => {
      // Skip users from bulk selection
      if (item.type === 'user') return
      
      const itemKey = `${item.type}-${item.id}`
      if (checked) {
        newSelected.add(itemKey)
      } else {
        newSelected.delete(itemKey)
      }
    })
    
    setSelectedItems(newSelected)
  }

  const filteredItems = archivedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || item.type === filterType
    
    // Hide archived users from staff users (they don't have user management access)
    if (isStaffUser() && item.type === 'user') {
      return false
    }
    
    return matchesSearch && matchesType
  })

  // Group items by category (users will be empty for staff)
  const groupedItems = {
    product: filteredItems.filter(item => item.type === 'product'),
    order: filteredItems.filter(item => item.type === 'order'),
    user: filteredItems.filter(item => item.type === 'user'),
    carousel: filteredItems.filter(item => item.type === 'carousel'),
    message: filteredItems.filter(item => item.type === 'message')
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
      case 'message':
        return <MessageCircle className="h-4 w-4" />
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
      case 'message':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="w-full px-6 space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedItems.product.length}
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
              {groupedItems.order.length}
            </div>
          </CardContent>
        </Card>
        {/* Only show archived users card for admin users */}
        {hasAdminAccess() && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupedItems.user.length}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Carousel</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedItems.carousel.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedItems.message.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Archived Items</CardTitle>
              <CardDescription>
                View and manage all archived items in your system
              </CardDescription>
            </div>
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} item(s) selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
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
                {/* Only show Users filter option for admin users */}
                {hasAdminAccess() && <SelectItem value="user">Users</SelectItem>}
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
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
                
                // Hide user category for staff users
                if (isStaffUser() && category === 'user') return null
                
                const isExpanded = expandedCategories.has(category)
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1) + 's'
                const categorySelectedCount = items.filter(item => selectedItems.has(`${item.type}-${item.id}`)).length
                const allCategorySelected = categorySelectedCount === items.length && items.length > 0
                const someCategorySelected = categorySelectedCount > 0 && categorySelectedCount < items.length
                
                return (
                  <div key={category} className="border rounded-lg">
                    <div
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allCategorySelected}
                          disabled={category === 'user'}
                          ref={(el) => {
                            if (el) {
                              const checkboxElement = el as any;
                              checkboxElement.indeterminate = someCategorySelected;
                            }
                          }}
                          onCheckedChange={(checked) => handleSelectAll(category, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {getTypeIcon(category)}
                        <h3 className="text-lg font-medium text-gray-900">{categoryName}</h3>
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
                          {items.length}
                        </span>
                        {categorySelectedCount > 0 && (
                          <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-sm">
                            {categorySelectedCount} selected
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={allCategorySelected}
                                  disabled={category === 'user'}
                                  ref={(el) => {
                                    if (el) {
                                      const checkboxElement = el as any;
                                      checkboxElement.indeterminate = someCategorySelected;
                                    }
                                  }}
                                  onCheckedChange={(checked) => handleSelectAll(category, checked as boolean)}
                                />
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Archived Date</TableHead>
                              <TableHead>Archived By</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const itemKey = `${item.type}-${item.id}`
                              const isSelected = selectedItems.has(itemKey)
                              
                              return (
                                <TableRow key={itemKey}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={item.type === 'user'}
                                      onCheckedChange={(checked) => handleSelectItem(itemKey, checked as boolean)}
                                    />
                                  </TableCell>
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
                                      {item.type !== 'user' && (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handlePermanentDelete(item.id, item.type)}
                                          disabled={deleting === item.id}
                                        >
                                          {deleting === item.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                          <span className="ml-1">Delete</span>
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
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