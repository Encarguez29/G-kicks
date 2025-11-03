"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Package, ShoppingCart, Users, DollarSign, AlertTriangle, CheckCircle, Eye, RefreshCw } from "lucide-react"
// Removed Supabase import - using API calls instead
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface DashboardStats {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  inStockProducts: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  returnedOrders: number
  totalRevenue: number
  totalUsers: number
  recentOrders: any[]
  topProducts: any[]
  salesData: any[]
  categoryData: any[]
}

const COLORS = ["#FBBF24", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6"]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching dashboard data...")

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardStats = await response.json()
      
      // Format sales data for chart display
      if (dashboardStats.salesData && Array.isArray(dashboardStats.salesData)) {
        dashboardStats.salesData = dashboardStats.salesData.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: parseFloat(item.revenue) || 0,
          orders: parseInt(item.orders) || 0
        }))
      }

      setStats(dashboardStats)
      console.log("Dashboard data loaded:", dashboardStats)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No data available</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your GKicks admin dashboard</p>
          </div>
          <Button
            onClick={fetchDashboardData}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">₱{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From {stats.totalOrders} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingOrders} ongoing, {stats.completedOrders} delivered, {stats.returnedOrders} returned, {stats.cancelledOrders} cancelled
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Products</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} active, {stats.outOfStockProducts} out of stock
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">In Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.inStockProducts}
              </div>
              <p className="text-xs text-muted-foreground">Products with adequate stock</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.lowStockProducts}</div>
              <p className="text-xs text-muted-foreground">Products need restocking</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.outOfStockProducts}</div>
              <p className="text-xs text-muted-foreground">Products unavailable</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="bg-muted border-border">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Recent Orders
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Top Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Sales Overview</CardTitle>
                  <CardDescription className="text-muted-foreground">Revenue and orders for the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.salesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No sales data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Product Categories</CardTitle>
                  <CardDescription className="text-muted-foreground">Distribution of products by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--foreground)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No category data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-yellow-500">Recent Orders</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Latest orders from customers</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700">
                          <TableHead className="text-gray-700 dark:text-gray-300">Order ID</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Amount</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.recentOrders.map((order) => (
                          <TableRow key={order.id} className="border-gray-200 dark:border-gray-700">
                            <TableCell className="font-medium text-gray-700 dark:text-gray-300">#{String(order.id).slice(0, 8)}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">₱{order.total_amount?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  order.status === "delivered"
                                    ? "bg-green-500 text-white"
                                    : order.status === "pending"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-gray-500 text-white"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild className="text-gray-600 dark:text-gray-400 hover:text-yellow-500">
                                <Link href={`/admin/orders`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">No orders yet</h3>
                    <p className="text-gray-600 dark:text-gray-500">Orders will appear here when customers make purchases</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-yellow-500">Top Products</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Products with highest stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700">
                          <TableHead className="text-gray-700 dark:text-gray-300">Product Name</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Brand</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Category</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Price</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Stock</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.topProducts.map((product) => (
                          <TableRow key={product.id} className="border-gray-200 dark:border-gray-700">
                            <TableCell className="font-medium text-gray-700 dark:text-gray-300">{product.name}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{product.brand}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 capitalize">{product.category}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">₱{product.price?.toLocaleString()}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{product.stock_quantity}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  product.stock_quantity > 5
                                    ? "bg-green-500 text-white"
                                    : product.stock_quantity > 0
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-red-500 text-white"
                                }
                              >
                                {product.stock_quantity > 5
                                  ? "In Stock"
                                  : product.stock_quantity > 0
                                    ? "Low Stock"
                                    : "Out of Stock"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">No products found</h3>
                    <p className="text-gray-600 dark:text-gray-500">Products will appear here when added to inventory</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
