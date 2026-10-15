
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockEvents } from "@/data/mockEvents";
import { 
  CreditCard, 
  Lock, 
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DemoPaymentGateway = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const event = mockEvents.find(e => e.slug === slug);
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: ""
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Redirect countdown effect
  useEffect(() => {
    if (isProcessing && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isProcessing && countdown === 0) {
      navigate(`/user/events/${slug}/confirmation`);
    }
  }, [isProcessing, countdown, navigate, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardholderName) {
      toast({ 
        title: "Payment Error", 
        description: "Please fill in all payment details",
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    toast({ 
      title: "Processing Payment...", 
      description: "Please wait while we process your payment" 
    });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Button onClick={() => navigate("/user/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Card>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">
              Your payment of ${event.price} has been processed successfully.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-green-700">
              Redirecting to confirmation page in {countdown} seconds...
            </p>
          </div>
          
          <Button 
            onClick={() => navigate(`/user/events/${slug}/confirmation`)}
            className="w-full"
          >
            Continue to Confirmation
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/user/events/${slug}/checkout`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Checkout
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Secure Payment</h1>
            <p className="text-gray-600">Complete your payment for {event.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-2 text-green-600">
                  <Lock className="h-5 w-5" />
                  <span className="text-sm font-medium">Secure Payment Gateway</span>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Demo Payment Gateway</p>
                    <p className="text-xs text-blue-600 mt-1">
                      This is a demonstration. Use any card details - no real payment will be processed.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={paymentData.cardholderName}
                    onChange={(e) => setPaymentData({ ...paymentData, cardholderName: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData({ ...paymentData, cardNumber: formatCardNumber(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      required
                    />
                    <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData({ ...paymentData, expiryDate: formatExpiryDate(e.target.value) })}
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, '').substring(0, 4) })}
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  size="lg"
                  disabled={isProcessing}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${event.price}
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">{event.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{event.description}</p>
                </div>
                
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Event Price:</span>
                    <span>${event.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                    <span>Total:</span>
                    <span>${event.price}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Lock className="h-4 w-4" />
                  <span>Your payment is secured with 256-bit SSL encryption</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPaymentGateway;
