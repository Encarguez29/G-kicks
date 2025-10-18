"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Archive, Edit, Plus, Eye } from "lucide-react"
import { toast } from "sonner"

interface CarouselSlide {
  id: number
  title: string
  subtitle: string
  description: string
  ctaText: string
  bgGradient: string
  image: string
  isActive: boolean
  order: number
}

const gradientOptions = [
  { value: "from-yellow-400 via-orange-500 to-red-500", label: "Yellow to Red" },
  { value: "from-blue-500 via-purple-500 to-pink-500", label: "Blue to Pink" },
  { value: "from-green-400 via-teal-500 to-blue-500", label: "Green to Blue" },
  { value: "from-purple-500 via-indigo-500 to-blue-600", label: "Purple to Blue" },
  { value: "from-pink-500 via-red-500 to-yellow-500", label: "Pink to Yellow" },
  { value: "from-indigo-500 via-purple-500 to-pink-500", label: "Indigo to Pink" }
]

export default function CarouselManagement() {
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [slideToArchive, setSlideToArchive] = useState<CarouselSlide | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    ctaText: "",
    bgGradient: gradientOptions[0].value,
    image: "",
    isActive: true,
    order: 1
  })

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const response = await fetch('/api/admin/carousel')
      if (response.ok) {
        const data = await response.json()
        setSlides(data)
      } else {
        toast.error('Failed to fetch carousel slides')
      }
    } catch (error) {
      console.error('Error fetching slides:', error)
      toast.error('Error fetching carousel slides')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, image: data.url }))
        toast.success('Image uploaded successfully')
      } else {
        toast.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/carousel'
      const method = editingSlide ? 'PUT' : 'POST'
      
      const requestBody = editingSlide 
        ? { ...formData, id: editingSlide.id }
        : formData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        toast.success(editingSlide ? 'Slide updated successfully' : 'Slide created successfully')
        setIsDialogOpen(false)
        resetForm()
        fetchSlides()
      } else {
        toast.error('Failed to save slide')
      }
    } catch (error) {
      console.error('Error saving slide:', error)
      toast.error('Error saving slide')
    }
  }

  const handleArchive = async () => {
    if (!slideToArchive) return
    
    try {
      const response = await fetch(`/api/admin/carousel?id=${slideToArchive.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: true }),
      })

      if (response.ok) {
        toast.success('Slide archived successfully')
        fetchSlides()
        setIsArchiveDialogOpen(false)
        setSlideToArchive(null)
      } else {
        toast.error('Failed to archive slide')
      }
    } catch (error) {
      console.error('Error archiving slide:', error)
      toast.error('Failed to archive slide')
    }
  }

  const handleEdit = (slide: CarouselSlide) => {
    setEditingSlide(slide)
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      description: slide.description,
      ctaText: slide.ctaText,
      bgGradient: slide.bgGradient,
      image: slide.image,
      isActive: slide.isActive,
      order: slide.order
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingSlide(null)
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      ctaText: "",
      bgGradient: gradientOptions[0].value,
      image: "",
      isActive: true,
      order: slides.length + 1
    })
  }

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      // Find the slide to get all its data
      const slide = slides.find(s => s.id === id)
      if (!slide) {
        toast.error('Slide not found')
        return
      }

      const response = await fetch('/api/carousel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          title: slide.title,
          subtitle: slide.subtitle,
          description: slide.description,
          ctaText: slide.ctaText,
          bgGradient: slide.bgGradient,
          image: slide.image,
          isActive: !isActive,
          order: slide.order
        }),
      })

      if (response.ok) {
        toast.success(`Slide ${!isActive ? 'activated' : 'deactivated'} successfully`)
        fetchSlides()
      } else {
        toast.error('Failed to update slide status')
      }
    } catch (error) {
      console.error('Error updating slide status:', error)
      toast.error('Error updating slide status')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading carousel slides...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Carousel Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add New Slide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSlide ? 'Edit Slide' : 'Add New Slide'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ctaText">CTA Button Text</Label>
                  <Input
                    id="ctaText"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">Image</Label>
                  <div className="space-y-2">
                    <Input
                       id="image"
                       type="file"
                       accept="image/*"
                       onChange={handleImageUpload}
                       disabled={uploading}
                       className="cursor-pointer disabled:opacity-50"
                     />
                     {uploading && (
                       <div className="text-sm text-blue-600 flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                         Uploading image...
                       </div>
                     )}
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="Or enter image path: /images/product.png"
                      className="text-sm"
                    />
                    {formData.image && (
                      <div className="mt-2">
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bgGradient">Background Gradient</Label>
                  <Select
                    value={formData.bgGradient}
                    onValueChange={(value) => setFormData({ ...formData, bgGradient: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gradientOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Active (visible in carousel)</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSlide ? 'Update' : 'Create'} Slide
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {slides.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No carousel slides found. Create your first slide to get started.</p>
            </CardContent>
          </Card>
        ) : (
          slides.map((slide) => (
            <Card key={slide.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row sm:items-center gap-2">
                      {slide.title}
                      <Badge className="text-[11px] px-2 py-0.5 sm:text-xs" variant={slide.isActive ? "default" : "secondary"}>
                        {slide.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge className="text-[11px] px-2 py-0.5 sm:text-xs" variant="outline">Order: {slide.order}</Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{slide.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(slide.id, slide.isActive)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(slide)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        setSlideToArchive(slide)
                        setIsArchiveDialogOpen(true)
                      }}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4`}>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{slide.description}</p>
                    <p className="text-sm"><strong>CTA:</strong> {slide.ctaText}</p>
                    <p className="text-sm break-all sm:break-normal"><strong>Image:</strong> {slide.image}</p>
                  </div>
                  <div className={`h-20 rounded-lg bg-gradient-to-r ${slide.bgGradient}`}></div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">Archive Carousel Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{slideToArchive?.title}"? This slide will be hidden from the carousel but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchive}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Archive Slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}