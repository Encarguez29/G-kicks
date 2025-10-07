"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { 
  philippinesLocations, 
  getCitiesForProvince, 
  getProvinceNames,
  City,
  Province
} from "@/lib/philippines-locations"

interface LocationSelectorProps {
  selectedProvince?: string
  selectedCity?: string
  onProvinceChange: (province: string) => void
  onCityChange: (city: string) => void
  className?: string
  disabled?: boolean
  required?: boolean
}

export function LocationSelector({
  selectedProvince = "",
  selectedCity = "",
  onProvinceChange,
  onCityChange,
  className,
  disabled = false,
  required = false
}: LocationSelectorProps) {
  const [provinceOpen, setProvinceOpen] = React.useState(false)
  const [cityOpen, setCityOpen] = React.useState(false)
  
  const provinces = getProvinceNames()
  const cities = selectedProvince ? getCitiesForProvince(selectedProvince) : []

  // Reset city when province changes
  React.useEffect(() => {
    if (selectedProvince && selectedCity) {
      const availableCities = getCitiesForProvince(selectedProvince)
      const cityExists = availableCities.some(city => city.name === selectedCity)
      if (!cityExists) {
        onCityChange("")
      }
    }
  }, [selectedProvince, selectedCity, onCityChange])

  const handleProvinceSelect = (province: string) => {
    console.log('Raw province value from cmdk:', province)
    
    // Find the actual province name from our data (case-insensitive match)
    const actualProvince = provinces.find(p => p.toLowerCase() === province.toLowerCase()) || province
    console.log('Matched province:', actualProvince)
    
    onProvinceChange(actualProvince)
    onCityChange("") // Reset city when province changes
    setProvinceOpen(false)
  }

  const handleCitySelect = (city: string) => {
    onCityChange(city)
    setCityOpen(false)
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {/* Province Selector */}
      <div className="space-y-2">
        <Label htmlFor="province" className="text-sm text-gray-700 dark:text-gray-300">
          Province {required && <span className="text-red-500">*</span>}
        </Label>
        <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={provinceOpen}
              className="w-full justify-between h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              disabled={disabled}
            >
              {selectedProvince || "Select province..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search province..." className="h-9" />
              <CommandList>
                <CommandEmpty>No province found.</CommandEmpty>
                <CommandGroup>
                  {provinces.map((province) => (
                    <CommandItem
                      key={province}
                      value={province}
                      onSelect={(value) => handleProvinceSelect(value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProvince === province ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {province}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Selector */}
      <div className="space-y-2">
        <Label htmlFor="city" className="text-sm text-gray-700 dark:text-gray-300">
          City {required && <span className="text-red-500">*</span>}
        </Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              disabled={disabled || !selectedProvince}
            >
              {selectedCity || (selectedProvince ? "Select city..." : "Select province first")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search city..." className="h-9" />
              <CommandList>
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup>
                  {cities.map((city) => (
                    <CommandItem
                      key={city.name}
                      value={city.name}
                      onSelect={(value) => handleCitySelect(value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCity === city.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {city.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// Separate components for individual use
interface ProvinceSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function ProvinceSelector({
  value = "",
  onValueChange,
  placeholder = "Select province...",
  className,
  disabled = false,
  required = false
}: ProvinceSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const provinces = getProvinceNames()

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm text-gray-700 dark:text-gray-300">
        Province {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            disabled={disabled}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search province..." className="h-9" />
            <CommandList>
              <CommandEmpty>No province found.</CommandEmpty>
              <CommandGroup>
                {provinces.map((province) => (
                  <CommandItem
                    key={province}
                    value={province}
                    onSelect={(value) => {
                      onValueChange(value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === province ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {province}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface CitySelectorProps {
  province: string
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function CitySelector({
  province,
  value = "",
  onValueChange,
  placeholder = "Select city...",
  className,
  disabled = false,
  required = false
}: CitySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const cities = province ? getCitiesForProvince(province) : []

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm text-gray-700 dark:text-gray-300">
        City {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            disabled={disabled || !province}
          >
            {value || (province ? placeholder : "Select province first")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search city..." className="h-9" />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem
                    key={city.name}
                    value={city.name}
                    onSelect={(value) => {
                      onValueChange(value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {city.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}