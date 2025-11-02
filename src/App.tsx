import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { BottomNav } from './components/BottomNav';
import { ScheduleScreen } from './components/ScheduleScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { GroupsScreen } from './components/GroupsScreen';
import { GroupDetailScreen } from './components/GroupDetailScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { getCurrentSession } from './utils/auth';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await getCurrentSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    // Show welcome screen for new users
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  };

  const handleWelcomeComplete = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setShowWelcome(false);
    setActiveTab('schedule');
    setSelectedGroup(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto h-screen flex flex-col">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {selectedGroup ? (
            <GroupDetailScreen
              group={selectedGroup}
              onBack={() => setSelectedGroup(null)}
            />
          ) : (
            <>
              {activeTab === 'schedule' && <ScheduleScreen />}
              {activeTab === 'discover' && <DiscoveryScreen />}
              {activeTab === 'insights' && <InsightsScreen />}
              {activeTab === 'groups' && (
                <GroupsScreen onSelectGroup={setSelectedGroup} />
              )}
              {activeTab === 'profile' && <ProfileScreen onSignOut={handleSignOut} />}
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        {!selectedGroup && (
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </div>

      <Toaster />
    </div>
  );
}
