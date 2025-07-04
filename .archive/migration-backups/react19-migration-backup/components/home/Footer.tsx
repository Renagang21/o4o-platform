import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const footerLinks = {
  company: [
    { name: '회사 소개', href: '/about' },
    { name: '채용', href: '/careers' },
    { name: '뉴스', href: '/news' },
    { name: '문의하기', href: '/contact' }
  ],
  support: [
    { name: '고객센터', href: '/support' },
    { name: '자주 묻는 질문', href: '/faq' },
    { name: '배송 안내', href: '/shipping' },
    { name: '반품/교환', href: '/returns' }
  ],
  legal: [
    { name: '이용약관', href: '/terms' },
    { name: '개인정보처리방침', href: '/privacy' },
    { name: '쿠키 정책', href: '/cookies' }
  ]
};

const socialLinks = [
  { icon: <FaFacebook />, href: 'https://facebook.com' },
  { icon: <FaTwitter />, href: 'https://twitter.com' },
  { icon: <FaInstagram />, href: 'https://instagram.com' },
  { icon: <FaLinkedin />, href: 'https://linkedin.com' }
];

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">O4O</h3>
            <p className="text-gray-400">
              당신만의 특별한 제품을 만드는 곳
            </p>
          </div>

          {/* Footer Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">회사</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">고객지원</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">법적 고지</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex justify-center space-x-6">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} O4O. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;