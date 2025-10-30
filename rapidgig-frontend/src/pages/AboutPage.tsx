import React from 'react';

const AboutPage: React.FC = () => {
  const teamMembers = [
    {
      name: 'Sarah Johnson',
      role: 'CEO & Co-Founder',
      image: '/api/placeholder/150/150',
      bio: 'Former VP at LinkedIn, passionate about connecting talent with opportunities.',
    },
    {
      name: 'Michael Chen',
      role: 'CTO & Co-Founder',
      image: '/api/placeholder/150/150',
      bio: 'Ex-Google engineer with 10+ years in building scalable platforms.',
    },
    {
      name: 'Emily Rodriguez',
      role: 'Head of Product',
      image: '/api/placeholder/150/150',
      bio: 'Product leader focused on creating delightful user experiences.',
    },
    {
      name: 'David Kim',
      role: 'Head of Engineering',
      image: '/api/placeholder/150/150',
      bio: 'Full-stack engineer passionate about innovative hiring solutions.',
    },
  ];

  const stats = [
    { number: '10,000+', label: 'Active Users' },
    { number: '500+', label: 'Partner Companies' },
    { number: '95%', label: 'Success Rate' },
    { number: '50+', label: 'Countries' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 font-poppins">
            About RapidGig
          </h1>
          <p className="text-xl lg:text-2xl text-white text-opacity-90 font-inter">
            We're revolutionizing how students and employers connect through the power of video introductions.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 font-poppins">Our Mission</h2>
            <p className="text-xl text-gray-600 leading-relaxed font-inter">
              At RapidGig, we believe that every student deserves the opportunity to showcase their unique 
              personality and skills beyond a traditional resume. We're building a platform where authentic 
              connections lead to meaningful career opportunities.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Authentic Connections</h3>
              <p className="text-gray-600 font-inter">
                We help students show their true selves through video, creating genuine connections with employers.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Speed & Efficiency</h3>
              <p className="text-gray-600 font-inter">
                Our platform streamlines the hiring process, making it faster and more efficient for everyone.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">Global Reach</h3>
              <p className="text-gray-600 font-inter">
                We connect talent and opportunities across borders, creating a truly global job marketplace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Our Impact</h2>
            <p className="text-xl text-gray-600 font-inter">
              Numbers that show the difference we're making
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2 font-poppins">{stat.number}</div>
                <div className="text-gray-600 font-inter">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 font-poppins">Our Story</h2>
          </div>
          
          <div className="prose prose-lg mx-auto font-inter">
            <p className="text-gray-600 leading-relaxed mb-6">
              RapidGig was born from a simple observation: traditional hiring processes often fail to capture 
              what makes candidates truly special. Resumes and cover letters can only tell part of the story.
            </p>
            
            <p className="text-gray-600 leading-relaxed mb-6">
              Our founders, having experienced both sides of the hiring process, recognized that personality, 
              communication skills, and cultural fit are just as important as technical qualifications. 
              Yet these qualities are nearly impossible to assess through traditional application methods.
            </p>
            
            <p className="text-gray-600 leading-relaxed mb-6">
              That's why we created RapidGig – a platform where students can showcase their authentic selves 
              through 60-second video introductions, and employers can discover talent that truly fits their 
              company culture and values.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              Today, we're proud to be transforming how the next generation finds meaningful work, one video 
              introduction at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-poppins">Meet Our Team</h2>
            <p className="text-xl text-gray-600 font-inter">
              The passionate people behind RapidGig
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-primary bg-opacity-10 flex items-center justify-center">
                    <span className="text-4xl text-primary">👤</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">{member.name}</h3>
                <p className="text-primary font-medium mb-3 font-inter">{member.role}</p>
                <p className="text-gray-600 text-sm font-inter">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 font-poppins">Join Our Mission</h2>
          <p className="text-xl mb-8 text-white text-opacity-90 font-inter">
            Be part of the future of hiring. Whether you're a student looking for opportunities 
            or an employer seeking talent, we're here to help you succeed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-accent text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-accent-dark transition-colors font-poppins">
              Get Started Today
            </button>
            <button className="bg-white bg-opacity-20 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-opacity-30 transition-colors font-poppins">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;