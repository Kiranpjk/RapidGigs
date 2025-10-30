import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 font-poppins">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none font-inter">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                At RapidGig, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
                disclose, and safeguard your information when you use our platform. Please read this policy 
                carefully to understand our practices regarding your personal data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Personal Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Name, email address, and contact information</li>
                <li>Profile information, including education and work experience</li>
                <li>Video introductions and other content you upload</li>
                <li>Messages and communications through our platform</li>
                <li>Payment information for premium services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Usage Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We automatically collect certain information about your use of our services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage patterns and preferences</li>
                <li>Log data and analytics information</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Match students with relevant job opportunities</li>
                <li>Facilitate communication between users</li>
                <li>Send notifications and updates about your account</li>
                <li>Process payments and transactions</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">4. Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">With Other Users</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your profile information and video introductions are visible to employers and other users 
                as part of our matching service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We work with third-party service providers who help us operate our platform, including 
                cloud storage, payment processing, and analytics services.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may disclose your information if required by law or to protect our rights, property, 
                or safety, or that of our users or others.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. However, 
                no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">6. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">7. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                and provide personalized content. You can control cookie settings through your browser, 
                though this may affect some functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to provide our services and 
                comply with legal obligations. When you delete your account, we will remove your personal 
                information within 30 days, except where retention is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">9. International Transfers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data during international transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">10. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our services are not intended for children under 16. We do not knowingly collect personal 
                information from children under 16. If we become aware of such collection, we will delete 
                the information immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">11. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant 
                changes via email or through our platform. Your continued use of our services after 
                changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">12. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@rapidgig.com<br />
                  <strong>Address:</strong> 123 Innovation Drive, Tech City, TC 12345<br />
                  <strong>Phone:</strong> (555) 123-4567
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;