import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - GKICKS',
  description: 'Learn how GKICKS protects your privacy and handles your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <p className="mb-4">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <p className="mb-4">
                At G-Kicks, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
              <h3 className="text-lg font-semibold text-foreground mb-2">Personal Information</h3>
              <p className="mb-4">We may collect personal information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Name and contact information (email address, phone number, mailing address)</li>
                <li>Account credentials (username, password)</li>
                <li>Payment information (credit card details, billing address)</li>
                <li>Order history and preferences</li>
                <li>Customer service communications</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">Automatically Collected Information</h3>
              <p className="mb-4">We automatically collect certain information when you visit our website:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent on our site</li>
                <li>Referring website information</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Process and fulfill your orders</li>
                <li>Provide customer service and support</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Improve our website and services</li>
                <li>Personalize your shopping experience</li>
                <li>Send promotional emails (with your consent)</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Information Sharing and Disclosure</h2>
              <p className="mb-4">We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With trusted third-party service providers who assist us in operating our website and conducting business</li>
                <li><strong>Payment Processing:</strong> With payment processors to handle transactions securely</li>
                <li><strong>Shipping:</strong> With shipping companies to deliver your orders</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, 
                alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL encryption for data transmission</li>
                <li>Secure payment processing systems</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and employee training</li>
                <li>Data backup and recovery procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies and Tracking Technologies</h2>
              <p className="mb-4">
                We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content. 
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Rights and Choices</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access and update your personal information</li>
                <li>Request deletion of your personal data</li>
                <li>Opt-out of marketing communications</li>
                <li>Disable cookies in your browser</li>
                <li>Request a copy of your personal data</li>
                <li>Object to certain processing activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
              <p className="mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, 
                comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
              <p className="mb-4">
                Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
                If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your personal information during such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to This Privacy Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website 
                and updating the "Last updated" date. Your continued use of our services constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
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