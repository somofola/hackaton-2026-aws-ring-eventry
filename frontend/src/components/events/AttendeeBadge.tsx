
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import { generateEventBadgeQR } from "@/utils/qrGenerator";
import { Event } from "@/types";
import { 
  Download,
  Calendar,
  MapPin,
  Clock,
  QrCode
} from "lucide-react";
import jsPDF from "jspdf";

interface Enrollment {
  id: string;
  eventId: string;
  userName: string;
  userEmail: string;
  registrationDate: string;
  confirmationNumber: string;
}

interface AttendeeBadgeProps {
  event: Event;
  enrollment: Enrollment;
}

const AttendeeBadge: React.FC<AttendeeBadgeProps> = ({ event, enrollment }) => {
  const qrData = generateEventBadgeQR(event.id, enrollment.id);

  const downloadPDF = () => {
    const pdf = new jsPDF();
    
    // Set up the PDF
    pdf.setFontSize(20);
    pdf.text("Event Badge", 105, 20, { align: "center" });
    
    // Event title
    pdf.setFontSize(16);
    pdf.text(event.title, 105, 40, { align: "center" });
    
    // Attendee name
    pdf.setFontSize(14);
    pdf.text(`Name: ${enrollment.userName}`, 20, 60);
    
    // Event details
    pdf.setFontSize(10);
    pdf.text(`Date: ${new Date(event.date).toLocaleDateString()}`, 20, 80);
    pdf.text(`Time: ${event.start_time}`, 20, 90);
    pdf.text(`Location: ${event.location}`, 20, 100);
    pdf.text(`Confirmation: ${enrollment.confirmationNumber}`, 20, 110);
    
    // Add QR code data as text (since we can't easily embed the QR image)
    pdf.text("QR Code Data:", 20, 130);
    pdf.setFontSize(8);
    const qrLines = pdf.splitTextToSize(qrData, 170);
    pdf.text(qrLines, 20, 140);
    
    // Instructions
    pdf.setFontSize(10);
    pdf.text("Present this badge at the event for check-in", 105, 200, { align: "center" });
    
    pdf.save(`${event.title.replace(/\s+/g, '-')}-badge.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-md mx-auto border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5">
        <div className="p-6 text-center">
          <div className="mb-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary mb-2">
              Event Badge
            </Badge>
            <h3 className="font-bold text-lg">{event.title}</h3>
          </div>
          
          <div className="mb-4">
            <div className="text-2xl font-bold text-primary mb-1">{enrollment.userName}</div>
            <div className="text-sm text-gray-600">{enrollment.userEmail}</div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center justify-center">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="flex items-center justify-center">
              <Clock className="mr-2 h-4 w-4" />
              {event.start_time}
            </div>
            <div className="flex items-center justify-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="bg-white p-4 rounded-lg border inline-block">
              <QRCode 
                value={qrData} 
                size={120}
                level="M"
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
              <QrCode className="mr-1 h-3 w-3" />
              Scan for check-in
            </div>
          </div>
          
          <div className="text-xs text-gray-500 border-t pt-2">
            Confirmation: {enrollment.confirmationNumber}
          </div>
        </div>
      </Card>
      
      <div className="text-center">
        <Button onClick={downloadPDF} variant="outline" className="flex items-center mx-auto">
          <Download className="mr-2 h-4 w-4" />
          Download PDF Badge
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Keep this badge for event check-in
        </p>
      </div>
    </div>
  );
};

export default AttendeeBadge;
