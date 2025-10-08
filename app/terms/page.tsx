import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - GKICKS',
  description: 'Read our terms of service and user agreement for GKICKS online store.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <p className="mb-4">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p className="mb-4">
                Welcome to G-Kicks. These Terms of Service ("Terms") govern your use of our website and services. 
                By accessing or using G-Kicks, you agree to be bound by these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Use License</h2>
              <p className="mb-4">
                Permission is granted to temporarily download one copy of the materials on G-Kicks' website for personal, 
                non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained on the website</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
              <p className="mb-4">
                To access certain features of our service, you may be required to create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Updating your information to keep it current</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Product Information</h2>
              <p className="mb-4">
                We strive to provide accurate product information, including descriptions, prices, and availability. 
                However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Orders and Payment</h2>
              <p className="mb-4">
                By placing an order, you represent that you are authorized to use the payment method and authorize us to charge the total amount. 
                We reserve the right to refuse or cancel orders for any reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Shipping and Delivery</h2>
              <p className="mb-4">
                Shipping times are estimates and may vary. We are not responsible for delays caused by shipping carriers or circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Prohibited Uses</h2>
              <p className="mb-4">You may not use our service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
              <p className="mb-4">
                In no event shall G-Kicks or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
                or due to business interruption) arising out of the use or inability to use the materials on G-Kicks' website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Governing Law</h2>
              <p className="mb-4">
                These terms and conditions are governed by and construed in accordance with the laws of the Philippines, 
                and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
                Your continued use of the service constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="mt-4 space-y-2">
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
  )
}