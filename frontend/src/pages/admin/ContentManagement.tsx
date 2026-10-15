
import React, { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const ContentManagement = () => {
  const { toast } = useToast();
  const [content, setContent] = useState({
    homepage: {
      title: "Create Your Digital Business Card",
      subtitle: "Share your professional information with QR codes",
      features: ["QR Code Generation", "Easy Sharing", "Professional Templates"]
    },
    about: {
      title: "About Our Platform",
      description: "We're revolutionizing how professionals network and share contact information."
    },
    pricing: {
      plans: [
        { name: "Free", price: 0, features: ["1 Card", "Basic Templates"] },
        { name: "Pro", price: 9.99, features: ["Unlimited Cards", "Premium Templates", "Analytics"] }
      ]
    },
    footer: {
      companyDescription: "CardConnect - Digital Business Cards Made Simple",
      socialLinks: {
        twitter: "https://twitter.com/cardconnect",
        linkedin: "https://linkedin.com/company/cardconnect",
        facebook: "https://facebook.com/cardconnect"
      }
    },
    legal: {
      privacyPolicy: "Our privacy policy content...",
      termsOfService: "Our terms of service content...",
      cookiePolicy: "Our cookie policy content..."
    },
    seo: {
      metaTitle: "CardConnect - Digital Business Cards",
      metaDescription: "Create and share professional digital business cards with QR codes.",
      keywords: "digital business cards, QR codes, networking"
    }
  });

  const handleSaveContent = () => {
    toast({
      title: "Content saved",
      description: "Website content has been updated successfully.",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
            <p className="text-gray-600 mt-1">
              Manage website content and settings
            </p>
          </div>
          <Button onClick={handleSaveContent}>Save All Changes</Button>
        </div>

        <Tabs defaultValue="homepage" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Homepage Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Main Title</Label>
                  <Input
                    id="title"
                    value={content.homepage.title}
                    onChange={(e) => setContent({
                      ...content,
                      homepage: { ...content.homepage, title: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={content.homepage.subtitle}
                    onChange={(e) => setContent({
                      ...content,
                      homepage: { ...content.homepage, subtitle: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="aboutTitle">About Title</Label>
                  <Input
                    id="aboutTitle"
                    value={content.about.title}
                    onChange={(e) => setContent({
                      ...content,
                      about: { ...content.about, title: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="aboutDescription">Description</Label>
                  <Textarea
                    id="aboutDescription"
                    value={content.about.description}
                    onChange={(e) => setContent({
                      ...content,
                      about: { ...content.about, description: e.target.value }
                    })}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="footer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Footer Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyDesc">Company Description</Label>
                  <Textarea
                    id="companyDesc"
                    value={content.footer.companyDescription}
                    onChange={(e) => setContent({
                      ...content,
                      footer: { ...content.footer, companyDescription: e.target.value }
                    })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="twitter">Twitter URL</Label>
                    <Input
                      id="twitter"
                      value={content.footer.socialLinks.twitter}
                      onChange={(e) => setContent({
                        ...content,
                        footer: {
                          ...content.footer,
                          socialLinks: { ...content.footer.socialLinks, twitter: e.target.value }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={content.footer.socialLinks.linkedin}
                      onChange={(e) => setContent({
                        ...content,
                        footer: {
                          ...content.footer,
                          socialLinks: { ...content.footer.socialLinks, linkedin: e.target.value }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook">Facebook URL</Label>
                    <Input
                      id="facebook"
                      value={content.footer.socialLinks.facebook}
                      onChange={(e) => setContent({
                        ...content,
                        footer: {
                          ...content.footer,
                          socialLinks: { ...content.footer.socialLinks, facebook: e.target.value }
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={content.legal.privacyPolicy}
                    onChange={(e) => setContent({
                      ...content,
                      legal: { ...content.legal, privacyPolicy: e.target.value }
                    })}
                    rows={8}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Terms of Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={content.legal.termsOfService}
                    onChange={(e) => setContent({
                      ...content,
                      legal: { ...content.legal, termsOfService: e.target.value }
                    })}
                    rows={8}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={content.seo.metaTitle}
                    onChange={(e) => setContent({
                      ...content,
                      seo: { ...content.seo, metaTitle: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={content.seo.metaDescription}
                    onChange={(e) => setContent({
                      ...content,
                      seo: { ...content.seo, metaDescription: e.target.value }
                    })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={content.seo.keywords}
                    onChange={(e) => setContent({
                      ...content,
                      seo: { ...content.seo, keywords: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Analytics & Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <h3 className="text-3xl font-bold text-blue-600">24,567</h3>
                    <p className="text-sm text-gray-600">Total Page Views</p>
                    <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <h3 className="text-3xl font-bold text-green-600">8,934</h3>
                    <p className="text-sm text-gray-600">Unique Visitors</p>
                    <p className="text-xs text-green-600 mt-1">+8% from last month</p>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <h3 className="text-3xl font-bold text-purple-600">4.2</h3>
                    <p className="text-sm text-gray-600">Avg. Session Duration</p>
                    <p className="text-xs text-red-600 mt-1">-3% from last month</p>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-lg">
                    <h3 className="text-3xl font-bold text-orange-600">92%</h3>
                    <p className="text-sm text-gray-600">User Satisfaction</p>
                    <p className="text-xs text-green-600 mt-1">+5% from last month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ContentManagement;
