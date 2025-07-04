import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { auth as firebaseAuth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BookOpenText,
    Megaphone,
    User,
    Globe,
    ArrowRight,
    LogIn,
    UserPlus,
    LogOut
} from 'lucide-react';

function HomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut(firebaseAuth);
            navigate("/login");
        } catch (error) {
            console.error("Error signing out:", error.message);
            alert("Failed to sign out: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative container mx-auto px-6 py-24 lg:py-32">
                    <div className="max-w-4xl mx-auto text-center">
                        {user ? (
                            <>
                                <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight">
                                    Welcome back, 
                                    <span className="text-indigo-200"> {user.email?.split('@')[0] || 'Barterer'}</span>
                                </h1>
                                <p className="text-xl lg:text-2xl mb-10 text-indigo-100 max-w-2xl mx-auto leading-relaxed">
                                    Your next exchange awaits. Discover opportunities or share your skills.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                        <Link to="/browse-listings">
                                            Browse Listings
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-indigo-700 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                        <Link to="/create-listing">
                                            Create Listing
                                            <Megaphone className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight">
                                    Exchange Skills,
                                    <span className="text-indigo-200"> Not Cash</span>
                                </h1>
                                <p className="text-xl lg:text-2xl mb-10 text-indigo-100 max-w-2xl mx-auto leading-relaxed">
                                    Connect with a vibrant community to trade your talents for services and goods you need.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                        <Link to="/login">
                                            Get Started
                                            <LogIn className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-indigo-700 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                        <Link to="/browse-listings">
                                            Explore Listings
                                            <Globe className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 lg:py-28 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-slate-900">
                            How Barterly Works
                        </h2>
                        <p className="text-xl text-slate-600 leading-relaxed">
                            Three simple steps to start exchanging skills and building connections
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-indigo-50 to-purple-50">
                            <CardHeader className="pb-6 pt-8">
                                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
                                    <Globe className="w-8 h-8 text-indigo-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-slate-900 text-center">
                                    Discover
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center pb-8">
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    Explore skills, services, and items offered by your community members
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50">
                            <CardHeader className="pb-6 pt-8">
                                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                                    <Megaphone className="w-8 h-8 text-purple-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-slate-900 text-center">
                                    Create
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center pb-8">
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    Share your unique skills or post requests for what you need
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-pink-50 to-rose-50">
                            <CardHeader className="pb-6 pt-8">
                                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-200 transition-colors">
                                    <ArrowRight className="w-8 h-8 text-pink-600" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-slate-900 text-center">
                                    Exchange
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center pb-8">
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    Connect and propose mutually beneficial exchanges
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Call to Action Section (for logged out users) */}
            {!user && (
                <section className="py-20 lg:py-28 bg-gradient-to-r from-slate-50 to-indigo-50">
                    <div className="container mx-auto px-6 text-center">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                                Ready to Start Bartering?
                            </h2>
                            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                                Join Barterly today and unlock a world of possibilities without spending a dime
                            </p>
                            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                <Link to="/signup">
                                    Sign Up for Free
                                    <UserPlus className="ml-3 h-6 w-6" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* User Dashboard Section (for logged in users) */}
            {user && (
                <section className="py-20 lg:py-28 bg-gradient-to-r from-slate-50 to-indigo-50">
                    <div className="container mx-auto px-6">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                                Your Dashboard
                            </h2>
                            <p className="text-xl text-slate-600 leading-relaxed">
                                Manage your exchanges and grow your network
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                                <CardHeader className="pb-4 pt-6">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 text-center">
                                        Profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <Button asChild variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium">
                                        <Link to="/profile">View & Edit</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                                <CardHeader className="pb-4 pt-6">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                                        <BookOpenText className="w-6 h-6 text-green-600" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 text-center">
                                        Listings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <Button asChild variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-medium">
                                        <Link to="/my-listings">Manage</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                                <CardHeader className="pb-4 pt-6">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
                                        <ArrowRight className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 text-center">
                                        Exchanges
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <Button asChild variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium">
                                        <Link to="/my-exchanges">Track</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                                <CardHeader className="pb-4 pt-6">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-red-200 transition-colors">
                                        <LogOut className="w-6 h-6 text-red-600" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 text-center">
                                        Sign Out
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <Button
                                        onClick={handleSignOut}
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                                    >
                                        Log Out
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default HomePage;