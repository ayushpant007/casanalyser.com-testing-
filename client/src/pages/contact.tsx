import { useState } from "react";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Contact() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      toast({
        title: "Message sent",
        description: "Thanks for reaching out — we'll get back to you soon.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      toast({
        title: "Could not send message",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalLayout
      title="Contact Us"
      description="Get in touch with the Cas Analyzer team. We're happy to help."
      lastUpdated="April 23, 2026"
    >
      <p>
        We'd love to hear from you. Whether you have a question about the
        Service, need help with your account, or want to share feedback, reach
        out using any of the methods below.
      </p>

      <LegalSection heading="Reach Out">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="p-4 rounded-xl border flex items-start gap-3"
            style={{
              background: "rgba(15,20,50,0.5)",
              borderColor: "rgba(96,165,250,0.2)",
            }}
            data-testid="card-contact-email"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(59,111,255,0.15)",
                color: "#60a5fa",
              }}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Email
              </p>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
                gunjan@financialfriend.in
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl border flex items-start gap-3"
            style={{
              background: "rgba(15,20,50,0.5)",
              borderColor: "rgba(96,165,250,0.2)",
            }}
            data-testid="card-contact-phone"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(52,211,153,0.15)",
                color: "#34d399",
              }}
            >
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Phone
              </p>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
                +91 93511 04008
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl border flex items-start gap-3"
            style={{
              background: "rgba(15,20,50,0.5)",
              borderColor: "rgba(96,165,250,0.2)",
            }}
            data-testid="card-contact-address"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(192,132,252,0.15)",
                color: "#c084fc",
              }}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Address
              </p>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
                Mall of Jaipur, 710, Gandhi Path Rd, East, Vaishali Nagar, Jaipur, Rajasthan 302021, India
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl border flex items-start gap-3"
            style={{
              background: "rgba(15,20,50,0.5)",
              borderColor: "rgba(96,165,250,0.2)",
            }}
            data-testid="card-contact-hours"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(244,114,182,0.15)",
                color: "#f472b6",
              }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Support Hours
              </p>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
                Mon – Fri, 10:00 AM – 6:00 PM IST
              </p>
            </div>
          </div>
        </div>
      </LegalSection>

      <LegalSection heading="Send Us a Message">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="form-contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="contact-name"
                className="text-sm font-medium"
                style={{ color: "#e2e8f0" }}
              >
                Name
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-contact-name"
                className="bg-[#4d3f3f]"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="contact-email"
                className="text-sm font-medium"
                style={{ color: "#e2e8f0" }}
              >
                Email
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="input-contact-email"
                className="bg-[#4d3f3f]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="contact-message"
              className="text-sm font-medium"
              style={{ color: "#e2e8f0" }}
            >
              Message
            </label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              rows={5}
              data-testid="input-contact-message"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2"
            data-testid="button-contact-submit"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </LegalSection>
    </LegalLayout>
  );
}
