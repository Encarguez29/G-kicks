import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returns & Exchanges - GKICKS',
  description: 'Learn about our return and exchange policy at GKICKS. Easy returns within 30 days.',
}

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Returns & Exchanges</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Return Policy</h2>
              <p className="text-muted-foreground mb-4">
                At G-Kicks, we want you to be completely satisfied with your purchase. If you're not happy with your order, 
                you can return it within 30 days of delivery for a full refund or exchange.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Return Conditions</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Items must be in original condition with all tags attached</li>
                <li>Shoes must be unworn with no signs of wear</li>
                <li>Original packaging and accessories must be included</li>
                <li>Items must be returned within 30 days of delivery</li>
                <li>Custom or personalized items cannot be returned</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">How to Return</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Contact our customer service team to initiate a return</li>
                <li>Pack your items securely in the original packaging</li>
                <li>Include the return form with your package</li>
                <li>Ship the package using the provided return label</li>
                <li>Track your return until it reaches our warehouse</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Exchanges</h2>
              <p className="text-muted-foreground mb-4">
                We offer free exchanges for different sizes or colors of the same item, subject to availability. 
                Exchange requests must be made within 30 days of delivery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Refund Processing</h2>
              <p className="text-muted-foreground mb-4">
                Once we receive and inspect your return, we'll process your refund within 5-7 business days. 
                Refunds will be issued to the original payment method.
              </p>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about returns or exchanges, please contact our customer service team:
                </p>
                <div className="mt-4 text-muted-foreground space-y-2">
                  <p><strong>Email:</strong> <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">kurab1983@gmail.com</a></p>
                  <p><strong>Phone:</strong> +63 956 879 8828</p>
                  <p><strong>Address:</strong> Canlubang Bridge, Mayapa-Canlubang Cadre Rd, Calamba, 4027 Laguna, Philippines</p>
                  <p><strong>Hours:</strong> Monday-Sunday: Always Open</p>
                </div>
              </section>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}