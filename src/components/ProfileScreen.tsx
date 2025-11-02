import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { signOut } from '../utils/auth';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { LogOut, Tv } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const STREAMING_SERVICES = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Amazon Prime' },
  { id: 337, name: 'Disney+' },
  { id: 15, name: 'Hulu' },
  { id: 350, name: 'Apple TV+' },
  { id: 1899, name: 'Max' },
  { id: 531, name: 'Paramount+' },
  { id: 387, name: 'Peacock' },
];

interface ProfileScreenProps {
  onSignOut: () => void;
}

export function ProfileScreen({ onSignOut }: ProfileScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<number[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiCall('/profile');
      setProfile(data.profile);
      setServices(data.profile?.services || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = async (serviceId: number) => {
    const newServices = services.includes(serviceId)
      ? services.filter(id => id !== serviceId)
      : [...services, serviceId];

    setServices(newServices);

    try {
      await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify({ services: newServices }),
      });
      toast.success('Streaming services updated');
    } catch (error) {
      console.error('Error updating services:', error);
      setServices(services); // Revert on error
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl">Profile</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="text-lg">{profile?.name || 'User'}</div>
                <div className="text-sm text-gray-500">{profile?.email}</div>
              </div>
            </div>
          </div>

          {/* Tip */}
          {(!services || services.length === 0) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <div className="text-sm mb-1">Quick Tip</div>
                  <p className="text-sm text-gray-600">
                    Add your streaming services below to see where shows are available and get better recommendations!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Services */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg">My Streaming Services</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select your services to filter content and see where things are available
            </p>
            <div className="space-y-3">
              {STREAMING_SERVICES.map((service) => (
                <div key={service.id} className="flex items-center justify-between">
                  <Label htmlFor={`service-${service.id}`} className="cursor-pointer">
                    {service.name}
                  </Label>
                  <Switch
                    id={`service-${service.id}`}
                    checked={services.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
