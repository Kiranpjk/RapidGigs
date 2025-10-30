import React from 'react';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 font-poppins">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none font-inter">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing and using RapidGig ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                RapidGig is a platform that connects students and job seekers with employers through video introductions 
                and job matching services. The Service allows users to create profiles, upload video introductions, 
                browse job opportunities, and communicate with potential employers or candidates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">4. User Content</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of content you submit to RapidGig, including video introductions, profiles, 
                and messages. By submitting content, you grant RapidGig a worldwide, non-exclusive, royalty-free 
                license to use, reproduce, and display your content in connection with the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are solely responsible for your content and agree that it will not:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Contain harmful, offensive, or inappropriate material</li>
                <li>Include false or misleading information</li>
                <li>Violate privacy rights of others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">5. Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not use the Service to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit spam, unsolicited messages, or promotional content</li>
                <li>Impersonate others or provide false information</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated tools to access the Service</li>
                <li>Collect user information without consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">6. Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use 
                of the Service, to understand our practices regarding the collection and use of your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">7. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by RapidGig and are 
                protected by international copyright, trademark, patent, trade secret, and other intellectual 
                property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">8. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior 
                notice, for any reason, including if you breach these Terms. You may also terminate your account 
                at any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">9. Disclaimers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service is provided "as is" and "as available" without warranties of any kind. We do not 
                guarantee that the Service will be uninterrupted, secure, or error-free. We are not responsible 
                for the conduct of users or the accuracy of user-generated content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">10. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the maximum extent permitted by law, RapidGig shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                directly or indirectly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">11. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of significant 
                changes via email or through the Service. Your continued use of the Service after changes 
                constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 font-poppins">12. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@rapidgig.com<br />
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

export default TermsPage;