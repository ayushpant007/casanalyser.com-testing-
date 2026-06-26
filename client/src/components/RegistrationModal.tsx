import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, User, Mail, Phone, Loader2, X } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// localStorage key for the session token
export const SESSION_TOKEN_KEY = "cas_session_token";

interface RegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dismissible?: boolean;
}

export function RegistrationModal({
  open,
  onClose,
  onSuccess,
  dismissible = true,
}: RegistrationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { name: "", email: "", mobile: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: InsertUser) => {
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/users", values);
      const data = await res.json();

      // Persist the session token so the user is recognised on future visits
      if (data.sessionToken) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
      }

      toast({ title: "Welcome to Cas analyzer" });
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{
            background: "rgba(2,6,23,0.75)",
            backdropFilter: "blur(8px)",
          }}
          onClick={dismissible ? onClose : undefined}
          data-testid="registration-overlay"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,20,50,0.95), rgba(8,12,30,0.97))",
              borderColor: "rgba(96,165,250,0.25)",
              boxShadow:
                "0 30px 80px -20px rgba(59,111,255,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
            data-testid="registration-modal"
          >
            {dismissible && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "rgba(203,213,225,0.7)" }}
                aria-label="Close"
                data-testid="button-registration-close"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="px-7 pt-8 pb-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(96,165,250,0.2), rgba(192,132,252,0.2))",
                    border: "1px solid rgba(96,165,250,0.3)",
                    color: "#fbbf24",
                  }}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2
                  className="text-2xl font-bold font-display tracking-tight"
                  style={{ color: "#f8fafc" }}
                  data-testid="text-registration-title"
                >
                  Welcome to CasAnalyser
                </h2>
                <p
                  className="mt-2 text-sm leading-relaxed max-w-sm"
                  style={{ color: "rgba(203,213,225,0.85)" }}
                >
                  Tell us a bit about yourself to get started with secure
                  portfolio insights.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "#e2e8f0" }}>
                          Name
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: "rgba(148,163,184,0.7)" }}
                            />
                            <Input
                              {...field}
                              placeholder="Your full name"
                              autoComplete="name"
                              className="pl-9 bg-[rgba(10,15,40,0.6)] border-[rgba(96,165,250,0.25)] text-slate-100 placeholder:text-slate-500"
                              data-testid="input-registration-name"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "#e2e8f0" }}>
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: "rgba(148,163,184,0.7)" }}
                            />
                            <Input
                              {...field}
                              type="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              className="pl-9 bg-[rgba(10,15,40,0.6)] border-[rgba(96,165,250,0.25)] text-slate-100 placeholder:text-slate-500"
                              data-testid="input-registration-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "#e2e8f0" }}>
                          Mobile Number
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: "rgba(148,163,184,0.7)" }}
                            />
                            <Input
                              {...field}
                              type="tel"
                              inputMode="numeric"
                              placeholder="10-digit mobile number"
                              autoComplete="tel"
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              className="pl-9 bg-[rgba(10,15,40,0.6)] border-[rgba(96,165,250,0.25)] text-slate-100 placeholder:text-slate-500"
                              data-testid="input-registration-mobile"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b6fff, #c084fc)",
                      color: "#ffffff",
                      boxShadow:
                        "0 10px 30px -10px rgba(59,111,255,0.6)",
                    }}
                    data-testid="button-registration-submit"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>Continue</>
                    )}
                  </button>

                  <p
                    className="text-[11px] text-center pt-1"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    We respect your privacy. Your details are stored securely
                    and never shared.
                  </p>
                </form>
              </Form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
