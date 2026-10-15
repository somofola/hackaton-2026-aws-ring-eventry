const TermsContent = () => (
<section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg">
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Last updated:</strong> December 10, 2024
              </p>
              <p className="text-sm text-gray-600">
                <strong>Effective date:</strong> December 10, 2024
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">1. Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Personal Information</h3>
                    <p className="text-gray-700">
                      We collect information you provide directly to us, such as when you create an account,
                      create a digital business card, or contact us for support. This may include:
                    </p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>Name, email address, and contact information</li>
                      <li>Professional information (job title, company, etc.)</li>
                      <li>Profile photos and company logos</li>
                      <li>Payment information (processed securely by third-party providers)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Usage Information</h3>
                    <p className="text-gray-700">
                      We automatically collect certain information about your use of our services,
                      including device information, IP address, browser type, and usage patterns.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">2. How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">We use the information we collect to:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Create and manage your digital business cards</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to improve our platform</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">3. Information Sharing</h2>
                <p className="text-gray-700 mb-4">
                  We do not sell, trade, or rent your personal information to third parties.
                  We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and prevent fraud</li>
                  <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
                  <li>In connection with a business transfer or merger</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">4. Data Security</h2>
                <p className="text-gray-700">
                  We implement appropriate security measures to protect your personal information
                  against unauthorized access, alteration, disclosure, or destruction. This includes
                  encryption, secure data centers, and regular security audits. However, no method
                  of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">5. Your Rights</h2>
                <p className="text-gray-700 mb-4">You have the right to:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Access, update, or delete your personal information</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request that we stop processing your data</li>
                  <li>File a complaint with relevant data protection authorities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">6. Data Retention & Deletion</h2>
                <p className="text-gray-700 mb-3">
                  You can delete your account at any time from Settings → Delete Account. Your account is
                  deactivated immediately, and your account and associated data — business cards, QR codes,
                  event enrollments, billing history — are permanently deleted after a{" "}
                  <strong>60-day grace period</strong>. Logging back in during that window cancels the
                  deletion. Web deletion requests are confirmed via an emailed link before this window
                  starts. A minimal account snapshot (not your cards, events, or other content) is kept for
                  up to <strong>365 days</strong> after permanent deletion for fraud/legal lookups, then
                  erased. Some data may also be retained where required by law (e.g. financial records) or
                  subject to a legal hold (e.g. an active law enforcement request).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 text-primary">7. Contact Us</h2>
                <p className="text-gray-700">
                  If you have any questions about this Privacy Policy or our data practices,
                  please contact us at:
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p><strong>Email:</strong> support@eventry.app</p>
                  {/* <p><strong>Address:</strong> 34 Ikorodu Rd, Jibowu, Lagos 101245, Lagos</p> */}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
      );

export default TermsContent;