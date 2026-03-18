import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import loginIllustration from "@/assets/login-illustration.png";

const LoginPage = () => {
  const [tab, setTab] = useState<string>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err: any) {
      toast.error(err.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد التسجيل.");
      setTab("login");
    } catch (err: any) {
      toast.error(err.message || "خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || "خطأ أثناء الإرسال");
    } finally {
      setLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-animated bg-pattern relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />

        <div className="w-full max-w-sm surface-glass p-8 animate-scale-in relative z-10">
          <div className="flex flex-col items-center gap-2 mb-6">
            <img src="/logo-douane.png" alt="شعار الديوانة التونسية" className="w-24 h-24 object-contain animate-float" />
            <h1 className="text-lg font-semibold">نسيت كلمة المرور</h1>
            <p className="text-sm text-muted-foreground text-center">
              أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين.
            </p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">البريد الإلكتروني</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@douane.gov.tn"
                required
                className="bg-background/50 backdrop-blur-sm"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg hover:shadow-primary/20 transition-all duration-300" disabled={loading}>
              {loading ? "جاري الإرسال..." : "إرسال الرابط"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setForgotMode(false)}
            >
              <ArrowRight className="h-4 w-4 ms-1" />
              العودة إلى تسجيل الدخول
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-animated bg-pattern relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-10 left-[10%] w-80 h-80 rounded-full bg-primary/8 blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-10 right-[15%] w-96 h-96 rounded-full bg-accent/6 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-success/4 blur-3xl" />

      {/* Left side - illustration (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative">
        <div className="max-w-md text-center space-y-6 animate-fade-in-up">
          <img
            src={loginIllustration}
            alt="Customs illustration"
            className="w-72 h-72 mx-auto object-contain animate-float drop-shadow-2xl"
          />
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground/90">نظام إدارة الأبحاث الديوانية</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              منصة متكاملة لمتابعة وإدارة محاضر التحقيق الديواني بكفاءة وأمان
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="surface-glass px-4 py-2 text-center">
              <p className="text-lg font-bold text-primary font-mono-data">100%</p>
              <p className="text-[10px] text-muted-foreground">رقمي</p>
            </div>
            <div className="surface-glass px-4 py-2 text-center">
              <p className="text-lg font-bold text-success font-mono-data">
                <Shield className="h-5 w-5 inline" />
              </p>
              <p className="text-[10px] text-muted-foreground">آمن</p>
            </div>
            <div className="surface-glass px-4 py-2 text-center">
              <p className="text-lg font-bold text-accent font-mono-data">24/7</p>
              <p className="text-[10px] text-muted-foreground">متاح</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm surface-glass p-8 animate-scale-in">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <img src="/logo-douane.png" alt="شعار الديوانة التونسية" className="w-28 h-28 object-contain relative z-10 transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold">إدارة الأبحاث الديوانية</h1>
              <p className="text-xs text-muted-foreground mt-1">
                نظام متابعة المحاضر
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="login-email">البريد الإلكتروني</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@douane.gov.tn"
                required
                className="bg-background/50 backdrop-blur-sm transition-all focus:bg-background/80"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">كلمة المرور</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline transition-colors"
                  onClick={() => setForgotMode(true)}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 backdrop-blur-sm transition-all focus:bg-background/80"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 h-10" disabled={loading}>
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </div>
      </div>
      <footer className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-muted-foreground/50">
        © {new Date().getFullYear()} العقيد حاتم شبشوب — إدارة الأبحاث الديوانية · النسخة v1.11 beta 2026
      </footer>
    </div>
  );
};

export default LoginPage;