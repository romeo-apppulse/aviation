import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Plane, DollarSign, Wrench, FileText, Clock } from "lucide-react";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { getRelativeDateLabel } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'aircraft';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
}

// Sample recent activity data
const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'payment',
    title: 'Payment Received',
    description: 'Flight Training Academy - $4,200 for December',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    status: 'success'
  },
  {
    id: '2',
    type: 'maintenance',
    title: 'Maintenance Due',
    description: 'N159G - 100-hour inspection required',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'warning'
  },
  {
    id: '3',
    type: 'lease',
    title: 'Lease Agreement Updated',
    description: 'Sky High Aviation - Contract renewed',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: 'info'
  },
  {
    id: '4',
    type: 'aircraft',
    title: 'Aircraft Status Change',
    description: 'N812CD moved from Maintenance to Available',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'success'
  }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <DollarSign className="h-4 w-4" />;
    case 'maintenance':
      return <Wrench className="h-4 w-4" />;
    case 'lease':
      return <FileText className="h-4 w-4" />;
    case 'aircraft':
      return <Plane className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'error':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-blue-600 bg-blue-50';
  }
};

export default function ActivityFeed() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <LiveIndicator />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-gray-600">{activity.description}</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {getRelativeDateLabel(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}