import { Mountain, Sun, LogIn, History, LogOut, User, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface HeaderProps {
  isProcessing?: boolean;
  isWaitingForProceed?: boolean;
  onReset?: () => void;
}

export const Header = ({ isProcessing = false, isWaitingForProceed = false, onReset }: HeaderProps) => {
  const { user, isGuest, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHistoryPage = location.pathname === '/history';
  const [showWarning, setShowWarning] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleHistoryClick = () => {
    if ((isProcessing || isWaitingForProceed) && !isHistoryPage) {
      setShowWarning(true);
    } else {
      navigate(isHistoryPage ? '/' : '/history');
    }
  };

  const handleProceedToHistory = () => {
    setShowWarning(false);
    navigate('/history');
  };

  return (
    <header className="relative py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          {/* Logo and Brand */}
          <div 
            className="flex items-center gap-4 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary tracking-wide">
              The adventurous investor
            </h1>
            <div className="relative flex items-end gap-1">
              <Mountain className="w-8 h-8 text-primary" strokeWidth={1.5} />
              <Mountain className="w-6 h-6 text-primary/70" strokeWidth={1.5} />
              <Sun className="absolute -top-2 right-0 w-4 h-4 text-primary animate-float" strokeWidth={2} />
            </div>
          </div>

          {/* User Navigation */}
          <div className="flex items-center gap-3">
            {isGuest ? (
              <>
                <Badge variant="outline" className="text-sm">
                  Guest Mode
                </Badge>
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="default"
                  size="sm"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              </>
            ) : user ? (
              <>
                <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      onClick={handleHistoryClick}
                      variant="outline"
                      size="sm"
                    >
                      {isHistoryPage ? (
                        <>
                          <Home className="w-4 h-4 mr-2" />
                          Back to Generator
                        </>
                      ) : (
                        <>
                          <History className="w-4 h-4 mr-2" />
                          History
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generation in Progress</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have an active video generation running. If you navigate away now, the generation will stop and your data will be lost. Do you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setShowWarning(false)}>
                        Go Back to Generation
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleProceedToHistory} className="bg-destructive text-destructive-foreground">
                        Go To History
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm">{user.email?.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm md:text-base tracking-widest uppercase">
            AI-Powered Content Creation Platform
          </p>
        </div>

        {/* Decorative dotted trail */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </header>
  );
};
