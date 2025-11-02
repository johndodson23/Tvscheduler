import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { BottomNav } from './components/BottomNav';
import { FeedScreen } from './components/FeedScreen';
import { QueueScreen } from './components/QueueScreen';
import { GroupsScreen } from './components/GroupsScreen';
import { GroupDetailScreen } from './components/GroupDetailScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { getCurrentSession } from './utils/auth';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
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
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setActiveTab('feed');
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
              {activeTab === 'feed' && <FeedScreen />}
              {activeTab === 'queue' && <QueueScreen />}
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
