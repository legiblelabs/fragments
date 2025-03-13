'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Playfair_Display, Inter, Roboto_Mono } from 'next/font/google';
import { GlobeAltIcon, BeakerIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useSearchParams, useRouter } from 'next/navigation';

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

const inter = Inter({ subsets: ['latin'] });

const roboto = Roboto_Mono({ 
  subsets: ['latin'],
  weight: ['400']
});

export default function LandingPage() {
  // const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState('en');
  const [counterStates, setcounterStates] = useState(4); // Total number of states (0-3)

  // Read counter from URL parameter, default to 1 if not present
  const param_counter = Math.min(Math.max(Number(searchParams.get('stage')) || 0, 0), counterStates - 1);
  const [counter, setCounter] = useState(param_counter);
  
  const param_debug = Boolean(searchParams.get('debug')) || false;

  const testimonialsRef = useRef<HTMLDivElement>(null);

  const toggleCounter = () => {
    if (param_debug === false) {
      return;
    }
    setCounter((counter + 1) % counterStates);
    // router.push(`?stage=${nextCounter}`);
  };

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    const headerOffset = 96; // This accounts for the header height (64px) plus some padding
    const elementPosition = sectionRef.current?.getBoundingClientRect().top ?? 0;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${playfair.className}`}>
      {/* Floating Counter */}
      {param_debug && (
      <div 
        className={`fixed top-8 left-8 z-50 bg-black text-white w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg ${roboto.className}`}
        onClick={toggleCounter}
      >
        <span className="text-xl">{counter}</span>
      </div>
      )}

      {/* Fixed Get Started Button */}
      {counter >= 3 && (
      <div className="fixed bottom-8 right-8 z-50"
        style={{
          backgroundColor: counter === 3 ? "transparent" : "transparent"
        }}
      >
        <button 
          className={`${inter.className} bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-full shadow-lg transition-all hover:shadow-xl`}
          onClick={() => {/* Add your action here */}}
        >
          Get Started
        </button>
      </div>
      )}

      {/* Header/Navigation Bar */}
      <header className="fixed w-full bg-gray-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Logo - Now clickable */}
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <BeakerIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold">Sample Biz</span>
            </div>

            {/* Navigation Links - Now with scroll functionality */}
            <nav className={`flex ml-8 space-x-8 ${inter.className}`}>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection(testimonialsRef)}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              >
                Testimonials
              </button>
            </nav>

            {/* Language Selector with Globe Icon */}
            {
              counter >= 1 &&
              (
                <div className={`ml-auto flex items-center space-x-2 ${inter.className}`}
                style={{
                  backgroundColor: counter === 1 ? "transparent" : "transparent"
                }}>
                  <GlobeAltIcon className="h-5 w-5 text-gray-600" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              )
            }
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Sample Biz</h1>
          
          {/* Large Logo */}
          {/* <div className="mt-8 mb-8">
            <BeakerIcon className="h-32 w-32 text-blue-600 mx-auto" />
          </div> */}

          {/* Main CTA Button */}
          <button 
            className={`${inter.className} bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 my-8 rounded-full shadow-lg transition-all hover:shadow-xl text-lg`}
            onClick={() => {/* Add your action here */}}
          >
            Get Started
          </button>
          

          {/* Business Summary */}
          <div className="max-w-2xl mx-auto mb-12">
            <p className="text-xl text-gray-700 leading-relaxed">
              We help businesses transform their <span className="text-gray-500">lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.</span>
            </p>
          </div>

          {/* Testimonials Section - Now with ref */}
          {counter >= 1 && (
          <section ref={testimonialsRef} className="mt-16"
            style={{
              backgroundColor: counter === 1 ? "transparent" : "transparent"
            }}
          >
            <h2 className="text-3xl font-semibold mb-12">Testimonials</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-16 w-16 mx-auto mb-4">
                  <UserCircleIcon className="h-16 w-16 text-blue-600" />
                </div>
                <p className="text-gray-600 italic mb-4">"The service was <span className="text-gray-400">lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.</span>"</p>
                <p className="font-semibold">Lorem Ipsum</p>
                <p className="text-sm text-gray-500">CEO, Lorem Corp</p>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-16 w-16 mx-auto mb-4">
                  <UserCircleIcon className="h-16 w-16 text-blue-600" />
                </div>
                <p className="text-gray-600 italic mb-4">"Outstanding attention to <span className="text-gray-400">lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim.</span>"</p>
                <p className="font-semibold">Sit Amet</p>
                <p className="text-sm text-gray-500">Director of Lorem</p>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-16 w-16 mx-auto mb-4">
                  <UserCircleIcon className="h-16 w-16 text-blue-600" />
                </div>
                <p className="text-gray-600 italic mb-4">"A game-changing <span className="text-gray-400">lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.</span>"</p>
                <p className="font-semibold">Consectetur Dolor</p>
                <p className="text-sm text-gray-500">Lorem Manager</p>
              </div>
            </div>
          </section>
          )}
        </div>
      </main>

      {/* Footer - Only shown when counter >= 1 */}
      {counter >= 2 && (
        <footer className="bg-gray-100 border-t border-gray-200 mt-16"
          style={{
            backgroundColor: counter === 2 ? "transparent" : "#f3f4f6"
          }}
        >
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Logo and Company Info */}
              <div className="col-span-1">
                <div className="flex items-center mb-4">
                  <BeakerIcon className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-xl font-semibold">Sample Biz</span>
                </div>
                <p className="text-sm text-gray-600">
                  Delivering lorem ipsum since always
                </p>
              </div>

              {/* Social Media */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4">Connect With Us</h3>
                <div className="flex space-x-4">
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className={`mt-8 pt-8 border-t border-gray-200 text-center ${inter.className}`}>
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Sample Biz. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}