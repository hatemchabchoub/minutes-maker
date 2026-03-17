import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm surface-elevated p-8 rounded-lg border border-border">
          <div className="flex flex-col items-center gap-2 mb-6">
            <img src="/logo-douane.png" alt="شعار الديوانة التونسية" className="w-28 h-28 object-contain" />
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm surface-elevated p-8 rounded-lg border border-border">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src="/logo-douane.png" alt="شعار الديوانة التونسية" className="w-32 h-32 object-contain" />
          <h1 className="text-lg font-semibold">إدارة الأبحاث الديوانية</h1>
          <p className="text-xs text-muted-foreground">
            نظام متابعة المحاضر
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">البريد الإلكتروني</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@douane.gov.tn"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">كلمة المرور</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">الاسم الكامل</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم واللقب"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@douane.gov.tn"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">كلمة المرور</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                سيتم إرسال بريد تأكيد إلى عنوانك.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginPage;