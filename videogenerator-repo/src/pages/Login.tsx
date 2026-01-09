import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus } from "lucide-react";

const Login = () => {
  const { signInWithGoogle, continueAsGuest, loading } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleGuestMode = () => {
    continueAsGuest();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-orange-400 to-yellow-500 bg-clip-text text-transparent">
              AI Video Generator
            </CardTitle>
            <CardDescription className="text-base">
              Create amazing videos with AI-powered scripts and images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-base font-semibold gap-3"
              size="lg"
            >
              <LogIn className="w-5 h-5" />
              Sign In with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              onClick={handleGuestMode}
              variant="outline"
              className="w-full h-12 text-base font-semibold gap-3"
              size="lg"
            >
              <UserPlus className="w-5 h-5" />
              Continue as Guest
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p className="mb-2">
                <strong>Guest Mode:</strong> Try the app without signing in.
              </p>
              <p className="text-xs">
                Your generations won't be saved unless you log in.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
