"use client"

import { Facebook, MapPin, Phone, Mail, Clock, ChevronRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function Footer() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = resolvedTheme === "dark"

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const footerSections = [
    {
      title: "Quick Links",
      key: "quick",
      links: [
        { href: "/men", label: "Men's Shoes" },
        { href: "/women", label: "Women's Shoes" },
        { href: "/kids", label: "Kids' Shoes" },
        { href: "/sale", label: "Sale Items" }
      ]
    },
    {
      title: "Customer Service",
      key: "service",
      links: [
        { href: "/faq", label: "FAQ" },
        { href: "/orders", label: "Order Tracking" },
        { href: "/profile", label: "My Account" },
        { href: "/wishlist", label: "Wishlist" },
        { href: "/settings", label: "Settings" }
      ]
    }
  ]

  return (
    <footer className="bg-background/95 backdrop-blur border-t border-gray-300 dark:border-gray-700 text-foreground">
      {/* Desktop Footer */}
      <div className="hidden md:block">
        <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Brand Section */}
          <div className="text-center sm:text-left space-y-4">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <Image
                src="/images/gkicks-transparent-logo.png"
                alt="GKicks Logo"
                width={40}
                height={32}
                className="object-contain"
              />
              <span className="text-xl font-bold text-foreground">GKicks</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your premier destination for authentic sneakers and premium footwear. Step into style with our curated
              collection of the latest and greatest kicks.
            </p>
            <div className="flex justify-center sm:justify-start space-x-4">
              <Link
               href="https://www.facebook.com/profile.php?id=100083343612520" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-300 hover:text-yellow-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center sm:text-left space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/men" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Men's Shoes
                </Link>
              </li>
              <li>
                <Link href="/women" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Women's Shoes
                </Link>
              </li>
              <li>
                <Link href="/kids" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Kids' Shoes
                </Link>
              </li>
              <li>

              </li>
              <li>
                <Link href="/sale" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Sale Items
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="text-center sm:text-left space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center sm:text-left space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Contact Us</h3>
            <div className="space-y-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-start justify-center sm:justify-start space-x-3 cursor-pointer hover:text-primary transition-colors group w-full text-left p-2 rounded-lg hover:bg-muted/50 active:bg-muted touch-manipulation">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      <p>Canlubang Bridge,</p>
                      <p>Mayapa-Canlubang Cadre Rd, Calamba, 4027 Laguna, Philippines</p>
                      <p className="text-xs text-primary mt-1 opacity-70">Click to view map</p>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-6">
                  <DialogHeader>
                    <DialogTitle>Visit Our Store - G-KICKS MAYAPA</DialogTitle>
                  </DialogHeader>
                  <div className="w-full mt-4 space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground">G-KICKS MAYAPA</h4>
                        <p className="text-sm text-muted-foreground">
                          Canlubang Bridge, Mayapa-Canlubang Cadre Rd<br/>
                          Calamba, 4027 Laguna, Philippines
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                          <a 
                            href="https://www.google.com/maps/search/Canlubang+Bridge+Mayapa+Canlubang+Cadre+Rd+Calamba+Laguna+Philippines" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Open in Google Maps
                          </a>
                          <a 
                            href="https://www.waze.com/ul?q=Canlubang%20Bridge%20Mayapa%20Canlubang%20Cadre%20Rd%20Calamba%20Laguna%20Philippines&navigate=yes" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm font-medium"
                          >
                            🚗 Open in Waze
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    {/* Embedded Map */}
                    <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3868.8234567890123!2d121.1234567890123!3d14.2123456789012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCanlubang%20Bridge%2C%20Mayapa-Canlubang%20Cadre%20Rd%2C%20Calamba%2C%20Laguna%2C%20Philippines!5e0!3m2!1sen!2sph!4v1234567890123!5m2!1sen!2sph"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="G-KICKS MAYAPA Store Location"
                      ></iframe>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex items-center justify-center sm:justify-start space-x-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">+63 956 879 8828</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start space-x-3">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a 
                  href="https://mail.google.com/mail/u/0/#inbox" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  kurab1983@gmail.com
                </a>
              </div>
              <div className="flex items-start justify-center sm:justify-start space-x-3">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p>Monday-Sunday: Always Open</p>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Bottom Footer */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-wrap flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                © 2025 GKicks. All rights reserved. Built with passion for sneaker enthusiasts.
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end space-x-6 text-sm">
                <Link
                  href="/privacy"
                  className="text-foreground/70 hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-foreground/70 hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                    href="/returns"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Returns & Exchanges
                  </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden">
        <div className="px-4 py-6">
          {/* Brand Section */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Image
                src="/images/gkicks-transparent-logo.png"
                alt="GKicks Logo"
                width={32}
                height={24}
                className="object-contain"
              />
              <span className="text-lg font-bold text-foreground">GKicks</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your premier destination for authentic sneakers and premium footwear.
            </p>
          </div>

          {/* Collapsible Sections */}
          {footerSections.map((section) => (
            <div key={section.key} className="border-b border-border last:border-b-0">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-foreground font-medium text-base">{section.title}</span>
                {expandedSections[section.key] ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                )}
              </button>
              {expandedSections[section.key] && (
                <div className="pb-4 transition-all duration-200 ease-in-out">
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link 
                          href={link.href} 
                          className="text-muted-foreground hover:text-primary transition-colors text-sm block py-1"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {/* Contact Section */}
          <div className="border-b border-border">
            <button
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between py-4 text-left"
            >
              <span className="text-foreground font-medium text-base">Contact Us</span>
              {expandedSections['contact'] ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
              )}
            </button>
            {expandedSections['contact'] && (
              <div className="pb-4 transition-all duration-200 ease-in-out">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">+63 956 879 8828</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                    <a 
                      href="https://mail.google.com/mail/u/0/#inbox" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      kurab1983@gmail.com
                    </a>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-start space-x-3 cursor-pointer hover:text-primary transition-colors group w-full text-left p-2 rounded-lg hover:bg-muted/50 active:bg-muted touch-manipulation">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                          <p>Canlubang Bridge, Mayapa-Canlubang Cadre Rd</p>
                          <p>Calamba, 4027 Laguna, Philippines</p>
                          <p className="text-xs text-primary mt-1 opacity-70">Click to view map</p>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-6">
                      <DialogHeader>
                        <DialogTitle>Visit Our Store - G-KICKS MAYAPA</DialogTitle>
                      </DialogHeader>
                      <div className="w-full mt-4 space-y-4">
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-foreground">G-KICKS MAYAPA</h4>
                            <p className="text-sm text-muted-foreground">
                              Canlubang Bridge, Mayapa-Canlubang Cadre Rd<br/>
                              Calamba, 4027 Laguna, Philippines
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                              <a 
                                href="https://www.google.com/maps/search/Canlubang+Bridge+Mayapa+Canlubang+Cadre+Rd+Calamba+Laguna+Philippines" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Open in Google Maps
                              </a>
                              <a 
                                href="https://www.waze.com/ul?q=Canlubang%20Bridge%20Mayapa%20Canlubang%20Cadre%20Rd%20Calamba%20Laguna%20Philippines&navigate=yes" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-sm font-medium"
                              >
                                🚗 Open in Waze
                              </a>
                            </div>
                          </div>
                        </div>
                        
                        {/* Embedded Map */}
                        <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border">
                          <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3868.8234567890123!2d121.1234567890123!3d14.2123456789012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCanlubang%20Bridge%2C%20Mayapa-Canlubang%20Cadre%20Rd%2C%20Calamba%2C%20Laguna%2C%20Philippines!5e0!3m2!1sen!2sph!4v1234567890123!5m2!1sen!2sph"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="G-KICKS MAYAPA Store Location"
                          ></iframe>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom */}
          <div className="text-center mt-6 pt-4">
            <div className="flex justify-center space-x-4 mb-4">
              <Link
                href="https://www.facebook.com/profile.php?id=100083343612520" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center space-x-4 text-xs mb-4">
              <Link href="/privacy" className="text-foreground/70 hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-foreground/70 hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link href="/returns" className="text-foreground/70 hover:text-primary transition-colors">
                Returns & Exchanges
              </Link>
            </div>
            <p className="text-muted-foreground text-xs">
              © 2025 GKicks. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
