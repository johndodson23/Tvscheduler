import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface GroupsScreenProps {
  onSelectGroup: (group: any) => void;
}

export function GroupsScreen({ onSelectGroup }: GroupsScreenProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await apiCall('/groups');
      setGroups(data.groups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await apiCall('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: newGroupName,
          memberIds: [], // For now, just create with current user
        }),
      });
      toast.success('Group created!');
      setNewGroupName('');
      setShowCreateDialog(false);
      loadGroups();
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error creating group:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl">Groups</h1>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Group
          </Button>
        </div>
        <p className="text-sm text-gray-500">Swipe together to find what to watch</p>
      </div>

      <ScrollArea className="flex-1">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No groups yet</p>
            <p className="text-sm mt-2">Create a group to start matching with friends</p>
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div>{group.name}</div>
                    <div className="text-sm text-gray-500">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Movie Night Crew"
              />
            </div>
            <p className="text-sm text-gray-500">
              You can add members later by sharing your group code
            </p>
            <Button onClick={handleCreateGroup} className="w-full">
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
