
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Calendar } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

const websiteUrl = (import.meta.env.VITE_WEBSITE_URL || "https://eventry.app").replace(/\/$/, "");

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const navLinks = [
    { name: "Home",    href: websiteUrl },
    { name: "About",   href: `${websiteUrl}/about` },
    { name: "Events",  href: `${websiteUrl}/events` },
    { name: "Pricing", href: `${websiteUrl}/pricing` },
    { name: "Blog",    href: `${websiteUrl}/blog` },
    { name: "FAQs",    href: `${websiteUrl}/faqs` },
    { name: "Contact", href: `${websiteUrl}/contact` },
  ];

  const isActive = (path?: string) => !!path && location.pathname === path;

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-primary/10 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href={websiteUrl} className="flex items-center group">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
              {/* <span className="text-white font-bold text-sm">CC</span> */}
              <img
                src="/logo_lite.png"
                alt="Eventry Logo"
                className="rounded-lg"
              />
            </div>
            <span className="text-2xl font-bold text-gradient">{BRAND_NAME}</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) =>
              link.path ? (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`font-medium transition-colors hover:text-primary ${isActive(link.path) ? "text-primary border-b-2 border-primary" : "text-gray-600"}`}
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  className="font-medium transition-colors hover:text-primary text-gray-600"
                >
                  {link.name}
                </a>
              )
            )}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="font-medium">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="btn-primary">Get Started</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-600 hover:text-primary transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) =>
                link.path ? (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`font-medium transition-colors hover:text-primary px-4 py-2 ${isActive(link.path) ? "text-primary bg-primary/5" : "text-gray-600"}`}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="font-medium transition-colors hover:text-primary px-4 py-2 text-gray-600"
                  >
                    {link.name}
                  </a>
                )
              )}
              <div className="px-4 pt-4 border-t border-gray-200 space-y-2">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>
                  <Button className="w-full btn-primary">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
