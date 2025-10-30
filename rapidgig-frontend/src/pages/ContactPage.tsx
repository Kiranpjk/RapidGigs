import React, { useState } from 'react';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      category: 'general'
    });
  };

  const contactMethods = [
    {
      icon: '📧',
      title: 'Email Support',
      description: 'Get help from our support team',
      contact: 'support@rapidgig.com',
      response: 'Response within 24 hours'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      contact: 'Available 9 AM - 6 PM EST',
      response: 'Instant response'
    },
    {
      icon: '📞',
      title: 'Phone Support',
      description: 'Speak directly with our team',
      contact: '(555) 123-4567',
      response: 'Mon-Fri, 9 AM - 6 PM EST'
    }
  ];

  const faqs = [
    {
      question: 'How do I create a video introduction?',
      answer: 'Simply go to your profile, click "Upload Video," and record a 60-second introduction showcasing your skills and personality.'
    },
    {
      question: 'Is RapidGig free to use?',
      answer: 'Yes! Basic features are completely free for students. We offer premium features for enhanced visibility and additional tools.'
    },
    {
      question: 'How does job matching work?',
      answer: 'Our AI analyzes your skills, preferences, and video content to match you with relevant job opportunities from our partner companies.'
    },
    {
      question: 'Can employers contact me directly?',
      answer: 'Yes, employers can message you through our secure messaging system if they\'re interested in your profile.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 font-poppins">
            Get in Touch
          </h1>
          <p className="text-xl text-white text-opacity-90 font-inter">
            We're here to help! Reach out to us with any questions or feedback.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-200">
                <div className="text-4xl mb-4">{method.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">{method.title}</h3>
                <p className="text-gray-600 mb-3 font-inter">{method.description}</p>
                <p className="text-primary font-semibold mb-2 font-inter">{method.contact}</p>
                <p className="text-sm text-gray-500 font-inter">{method.response}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Send Us a Message</h2>
            <p className="text-xl text-gray-600 font-inter">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-green-800 mb-2 font-poppins">Message Sent!</h3>
              <p className="text-green-700 font-inter">
                Thank you for contacting us. We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-inter"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-inter"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-inter"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-inter"
                    placeholder="Brief subject line"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2 font-inter">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-inter"
                  placeholder="Please describe your question or feedback in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 font-inter">
              Quick answers to common questions
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 font-poppins">{faq.question}</h3>
                <p className="text-gray-700 font-inter">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office Info */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Visit Our Office</h2>
            <p className="text-xl text-gray-600 font-inter">
              We'd love to meet you in person
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 font-poppins">RapidGig Headquarters</h3>
            <div className="text-gray-700 font-inter space-y-2">
              <p>123 Innovation Drive</p>
              <p>Tech City, TC 12345</p>
              <p>United States</p>
            </div>
            <div className="mt-6 text-gray-600 font-inter">
              <p><strong>Office Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;