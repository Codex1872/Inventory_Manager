import { useState } from "react";
import { useSubmitContactMessage } from "@workspace/api-client-react";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const submit = useSubmitContactMessage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Renseignez nom, email et message");
      return;
    }
    submit.mutate(
      {
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          subject: form.subject || null,
          message: form.message,
        },
      },
      {
        onSuccess: () => {
          toast.success("Message envoyé", {
            description: "Nous vous répondons sous 24h.",
          });
          setForm({
            name: "",
            email: "",
            phone: "",
            subject: "",
            message: "",
          });
        },
        onError: () => toast.error("Envoi impossible"),
      },
    );
  };

  return (
    <StorefrontLayout>
      <div className="container mx-auto px-6 py-12 max-w-5xl space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h1 className="font-display text-4xl font-bold">Nous contacter</h1>
          <p className="text-muted-foreground">
            Une question sur un produit, une commande ou notre boutique ? Notre
            équipe vous répond rapidement.
          </p>
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nom complet</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sujet</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    rows={6}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submit.isPending}
                  className="w-full sm:w-auto"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le message
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-3">
            <ContactBlock
              icon={<MapPin className="h-4 w-4" />}
              title="Notre boutique"
              lines={["12 rue de Turenne", "75004 Paris"]}
            />
            <ContactBlock
              icon={<Phone className="h-4 w-4" />}
              title="Téléphone"
              lines={["+33 1 45 67 89 00"]}
            />
            <ContactBlock
              icon={<Mail className="h-4 w-4" />}
              title="Email"
              lines={["bonjour@stockflow.fr"]}
            />
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Horaires d'ouverture</p>
                <p>Lundi — Samedi : 10h — 19h</p>
                <p>Dimanche : fermé</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}

function ContactBlock({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          {lines.map((l) => (
            <p key={l} className="text-sm text-muted-foreground">
              {l}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
