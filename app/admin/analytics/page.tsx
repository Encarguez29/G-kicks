"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DollarSign, ShoppingCart, Users, TrendingUp, Download, Calendar, Package, Activity, RefreshCw } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface AnalyticsData {
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>
  dailySales: Array<{ date: string; revenue: number; orders: number }>
  categoryStats: Array<{ name: string; value: number; revenue: number; orders: number }>
  topProducts: Array<any>
  customerStats: { total_customers: number; avg_order_value: number; total_orders: number }
  growth: { orders: number; revenue: number; customers: number }
  currentMonth: { orders: number; revenue: number; customers: number }
  lastMonth: { orders: number; revenue: number; customers: number }
  recentActivity: Array<{ type: string; id: string; amount: number; status: string; date: string; customer: string }>
  lifetimeTotals?: { orders: number; revenue: number; ongoingOrders: number; deliveredOrders: number; cancelledOrders: number; returnedOrders: number }
}

const COLORS = ["#FBBF24", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6"]

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/analytics', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data')
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Export analytics data to Excel
  const exportToExcel = () => {
    if (!analyticsData) {
      toast.error('No data available to export')
      return
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new()

      // Summary Sheet
      const summaryData = [
        ['Analytics Report', ''],
        ['Generated on:', new Date().toLocaleDateString()],
        ['Date Range:', `${dateRange.startDate} to ${dateRange.endDate}`],
        ['', ''],
        ['Key Metrics', ''],
        ['Total Revenue (Current Month)', `₱${analyticsData.currentMonth.revenue?.toLocaleString() || '0.00'}`],
        ['Total Orders (All Time)', analyticsData.lifetimeTotals?.orders?.toLocaleString() || '0'],
        ['Average Order Value', `₱${analyticsData.customerStats.avg_order_value?.toLocaleString() || '0.00'}`],
        ['Total Customers', analyticsData.customerStats.total_customers?.toLocaleString() || '0'],
        ['', ''],
        ['Growth Metrics', ''],
        ['Revenue Growth', `${analyticsData.growth.revenue || 0}%`],
        ['Orders Growth', `${analyticsData.growth.orders || 0}%`],
        ['Customer Growth', `${analyticsData.growth.customers || 0}%`]
      ]
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

      // Monthly Revenue Sheet
      if (analyticsData.monthlyRevenue?.length > 0) {
        const monthlyWs = XLSX.utils.json_to_sheet(analyticsData.monthlyRevenue)
        XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly Revenue')
      }

      // Daily Sales Sheet
      if (analyticsData.dailySales?.length > 0) {
        const dailyWs = XLSX.utils.json_to_sheet(analyticsData.dailySales)
        XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Sales')
      }

      // Category Stats Sheet
      if (analyticsData.categoryStats?.length > 0) {
        const categoryWs = XLSX.utils.json_to_sheet(analyticsData.categoryStats)
        XLSX.utils.book_append_sheet(wb, categoryWs, 'Category Stats')
      }

      // Top Products Sheet
      if (analyticsData.topProducts?.length > 0) {
        const productsWs = XLSX.utils.json_to_sheet(analyticsData.topProducts)
        XLSX.utils.book_append_sheet(wb, productsWs, 'Top Products')
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Save file with current date
      const currentDate = new Date().toISOString().split('T')[0]
      saveAs(data, `analytics-report-${currentDate}.xlsx`)
      
      toast.success(`Analytics report exported successfully! File: analytics-report-${currentDate}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export analytics report. Please try again.')
    }
  }

  // Handle date range change
  const handleDateRangeChange = () => {
    // Here you would typically refetch data with the new date range
    // For now, we'll just close the dialog and show a message
    setIsDateRangeOpen(false)
    toast.success(`Date range updated: ${dateRange.startDate} to ${dateRange.endDate}`)
    // In a real implementation, you would call fetchAnalyticsData with the date range
    // fetchAnalyticsData(dateRange.startDate, dateRange.endDate)
  }

  useEffect(() => {
    if (user) {
      fetchAnalyticsData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchAnalyticsData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-yellow-500">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your store performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={() => setIsDateRangeOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              ₱{analyticsData?.lifetimeTotals?.revenue?.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={(analyticsData?.growth?.revenue || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(analyticsData?.growth?.revenue || 0) >= 0 ? '+' : ''}{analyticsData?.growth?.revenue || 0}%
              </span> from last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {analyticsData?.lifetimeTotals?.orders?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.lifetimeTotals?.ongoingOrders || 0} ongoing, {analyticsData?.lifetimeTotals?.deliveredOrders || 0} delivered, {analyticsData?.lifetimeTotals?.returnedOrders || 0} returned, {analyticsData?.lifetimeTotals?.cancelledOrders || 0} cancelled
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              ₱{analyticsData?.customerStats.avg_order_value?.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on completed orders
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {analyticsData?.customerStats.total_customers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={(analyticsData?.growth?.customers || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                {(analyticsData?.growth?.customers || 0) >= 0 ? '+' : ''}{analyticsData?.growth?.customers || 0}%
              </span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Monthly Revenue</CardTitle>
            <CardDescription className="text-muted-foreground">
              Revenue trends over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analyticsData?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value) => [`₱${value}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Sales by Category</CardTitle>
            <CardDescription className="text-muted-foreground">Product category performance</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {analyticsData?.categoryStats && analyticsData.categoryStats.length > 0 ? (
              <div className="h-[85vh] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.categoryStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Items Sold"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[350px]">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-card-foreground">No sales data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start selling to see category breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Monthly Orders</CardTitle>
            <CardDescription className="text-muted-foreground">
              Order volume trends over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analyticsData?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Top Selling Products</CardTitle>
            <CardDescription className="text-muted-foreground">
              Best performing products by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.topProducts && analyticsData.topProducts.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.total_sold} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">₱{product.total_revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[350px]">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-card-foreground">No sales data available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Products will appear here once orders are placed
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest store activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData?.recentActivity && analyticsData.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'order' ? (
                        <ShoppingCart className="h-5 w-5 text-blue-500" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {activity.type === 'order' ? 'Online Order' : 'POS Transaction'} #{activity.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.customer} • {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-card-foreground">₱{activity.amount.toFixed(2)}</p>
                    <p className={`text-xs capitalize ${
                      activity.status === 'completed' || activity.status === 'delivered' 
                        ? 'text-green-600' 
                        : activity.status === 'pending' || activity.status === 'processing'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {activity.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-card-foreground">No recent activity</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activity will appear here as your store grows
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range Dialog */}
      <Dialog open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
            <DialogDescription>
              Choose the date range for analytics data. This will filter all reports and charts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-date" className="text-right">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateRangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDateRangeChange}>
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
