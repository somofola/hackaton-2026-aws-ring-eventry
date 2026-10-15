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
                        <h2 className="text-2xl font-bold mb-4 text-primary">1. Acceptance of Terms</h2>
                        <p className="text-gray-700">
                            By accessing or using Eventry's services, you agree to be bound by these
                            Terms of Service and our Privacy Policy. If you do not agree to these terms,
                            please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">2. Description of Service</h2>
                        <p className="text-gray-700">
                            Eventry provides digital business card creation and sharing services,
                            along with event management tools. Our platform allows users to create,
                            customize, and share digital business cards and manage professional events.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">3. User Accounts</h2>
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                To use certain features of our service, you must create an account.
                                You are responsible for:
                            </p>
                            <ul className="list-disc ml-6 space-y-1">
                                <li>Maintaining the confidentiality of your account credentials</li>
                                <li>All activities that occur under your account</li>
                                <li>Providing accurate and up-to-date information</li>
                                <li>Notifying us immediately of any unauthorized use</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">4. Acceptable Use</h2>
                        <p className="text-gray-700 mb-4">You agree not to use our services to:</p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Violate any applicable laws or regulations</li>
                            <li>Infringe on intellectual property rights</li>
                            <li>Upload malicious code or viruses</li>
                            <li>Harass, abuse, or harm others</li>
                            <li>Spam or send unsolicited communications</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Use our service for any fraudulent or deceptive purposes</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">5. Content Ownership</h2>
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                You retain ownership of the content you create and upload to our platform.
                                By using our service, you grant us a limited license to use, store, and
                                display your content for the purpose of providing our services.
                            </p>
                            <p className="text-gray-700">
                                Eventry retains all rights to our platform, software, and related
                                intellectual property.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">6. Payment Terms</h2>
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                Paid subscriptions are billed in advance on a monthly or yearly basis.
                                You agree to pay all fees associated with your chosen plan.
                            </p>
                            <ul className="list-disc ml-6 space-y-1">
                                <li>Fees are non-refundable except as required by law</li>
                                <li>We may change pricing with 30 days advance notice</li>
                                <li>Failure to pay may result in service suspension</li>
                                <li>You're responsible for any applicable taxes</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">7. Service Availability</h2>
                        <p className="text-gray-700">
                            While we strive to maintain high availability, we do not guarantee
                            uninterrupted access to our services. We may temporarily suspend
                            service for maintenance, upgrades, or other operational reasons.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">8. Limitation of Liability</h2>
                        <p className="text-gray-700">
                            To the maximum extent permitted by law, Eventry shall not be
                            liable for any indirect, incidental, special, or consequential
                            damages arising from your use of our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">9. Termination</h2>
                        <p className="text-gray-700">
                            Either party may terminate these terms at any time. Upon termination,
                            your right to use our services will cease immediately. We may retain
                            certain information as required by law or for legitimate business purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">10. Changes to Terms</h2>
                        <p className="text-gray-700">
                            We may update these terms from time to time. We will notify you of
                            significant changes via email or through our platform. Continued use
                            of our services after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-primary">11. Contact Information</h2>
                        <p className="text-gray-700">
                            If you have questions about these Terms of Service, please contact us:
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