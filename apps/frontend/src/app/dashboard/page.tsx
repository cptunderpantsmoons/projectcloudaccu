"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAuth } from "@/store/auth-store";
import { apiClient } from "@/lib/api-client";
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Calendar, 
  Users, 
  CheckSquare,
  TrendingUp,
  AlertCircle,
  Clock,
  Activity,
  Target,
  Database
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Project, Document, CalendarEvent, ACCUApplication } from "@accu/shared";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalDocuments: number;
  pendingReviews: number;
  upcomingDeadlines: number;
  accuApplications: number;
}

interface RecentActivity {
  id: string;
  type: 'project' | 'document' | 'accu' | 'calendar';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalDocuments: 0,
    pendingReviews: 0,
    upcomingDeadlines: 0,
    accuApplications: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load dashboard data in parallel
      const [
        projectsResponse,
        documentsResponse,
        eventsResponse,
        accuResponse,
      ] = await Promise.allSettled([
        apiClient.get<Project[]>('/projects', { params: { limit: 5, sort: 'updatedAt', order: 'desc' } }),
        apiClient.get<Document[]>('/documents', { params: { limit: 5, sort: 'updatedAt', order: 'desc' } }),
        apiClient.get<CalendarEvent[]>('/calendar/events', { params: { limit: 5, upcoming: true } }),
        apiClient.get<ACCUApplication[]>('/accu-applications', { params: { limit: 10 } }),
      ]);

      // Process projects data
      if (projectsResponse.status === 'fulfilled' && projectsResponse.value.success) {
        const projects = projectsResponse.value.data || [];
        setRecentProjects(projects);
        
        setStats(prev => ({
          ...prev,
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'active').length,
        }));
      }

      // Process documents data
      if (documentsResponse.status === 'fulfilled' && documentsResponse.value.success) {
        const documents = documentsResponse.value.data || [];
        setRecentDocuments(documents);
        
        setStats(prev => ({
          ...prev,
          totalDocuments: documents.length,
          pendingReviews: documents.filter(d => d.status === 'review').length,
        }));
      }

      // Process events data
      if (eventsResponse.status === 'fulfilled' && eventsResponse.value.success) {
        const events = eventsResponse.value.data || [];
        setUpcomingEvents(events);
        
        setStats(prev => ({
          ...prev,
          upcomingDeadlines: events.filter(e => e.type === 'deadline').length,
        }));
      }

      // Process ACCU applications data
      if (accuResponse.status === 'fulfilled' && accuResponse.value.success) {
        const accuApps = accuResponse.value.data || [];
        
        setStats(prev => ({
          ...prev,
          accuApplications: accuApps.length,
        }));

        // Create recent activity from all sources
        const activity: RecentActivity[] = [];
        
        // Add recent projects
        recentProjects.slice(0, 3).forEach(project => {
          activity.push({
            id: project.id,
            type: 'project',
            title: `Project: ${project.name}`,
            description: project.description || '',
            timestamp: project.updatedAt,
            status: project.status,
          });
        });

        // Add recent documents
        recentDocuments.slice(0, 3).forEach(doc => {
          activity.push({
            id: doc.id,
            type: 'document',
            title: `Document: ${doc.name}`,
            description: `Category: ${doc.category}`,
            timestamp: doc.updatedAt,
            status: doc.status,
          });
        });

        // Sort by timestamp and take latest 6
        setRecentActivity(
          activity
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 6)
        );
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'review':
      case 'under_review':
        return 'text-yellow-600 bg-yellow-50';
      case 'draft':
      case 'pending':
        return 'text-blue-600 bg-blue-50';
      case 'rejected':
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'accu':
        return <CheckSquare className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your ACCU Platform today.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CheckSquare className="h-4 w-4 mr-2" />
                ACCU Application
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProjects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReviews} pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ACCU Applications</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accuApplications}</div>
              <p className="text-xs text-muted-foreground">
                {stats.upcomingDeadlines} upcoming deadlines
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Your latest project updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(project.updatedAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent projects</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                View All Projects
              </Button>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>
                Latest document uploads and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((document) => (
                  <div key={document.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{document.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.category} • {formatDate(document.updatedAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent documents</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                View All Documents
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>
                Important dates and deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(event.startDate)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.priority)}`}>
                        {event.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                View Calendar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates across all your projects and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}