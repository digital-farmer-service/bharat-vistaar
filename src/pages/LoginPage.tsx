
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [isOtp, setIsOtp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtp) {
      // Simulate OTP sent
      setIsOtp(true);
    } else {
      // Simulate login success
      console.log("Logged in with OTP:", otp);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            {isOtp ? 'OTP सत्यापित करें' : 'अपने खाते में प्रवेश करें'}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {isOtp ? 'Verify OTP' : 'Sign in to your account'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isOtp ? (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium">
                    मोबाइल नंबर (Mobile Number)
                  </label>
                  <div className="mt-1">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="block w-full"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium">
                    OTP दर्ज करें (Enter OTP)
                  </label>
                  <div className="mt-1">
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="block w-full"
                    />
                  </div>
                  <p className="mt-2 text-sm text-primary">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setIsOtp(false)}
                    >
                      नंबर बदलें (Change number)
                    </button>
                  </p>
                </div>
              )}

              <div>
                <Button type="submit" className="w-full">
                  {isOtp ? 'सत्यापित करें (Verify)' : 'OTP प्राप्त करें (Get OTP)'}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-2 text-muted-foreground">
                    या इससे जारी रखें (Or continue with)
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full">
                  Google
                </Button>
                <Button variant="outline" className="w-full">
                  Facebook
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button asChild variant="link">
                <Link to="/">
                  वापस जाएँ (Go back)
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
