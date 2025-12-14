"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Filter,
  Grid,
  List,
  MoreHorizontal
} from "lucide-react";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { CalendarEvent, QueryOptions } from "@accu/shared";

interface CalendarFilters extends QueryOptions {
  search?: string;
  type?: string;
  priority?: string;
  upcoming?: boolean;
}

export default function CalendarPage() {
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  const canReadCalendar = hasPermission("calendar.events.read");
  const canWriteCalendar = hasPermission("calendar.events.write");
  const canDeleteCalendar = hasPermission("calendar.events.delete");

  useEffect(() => {
    if (canReadCalendar) {
      loadEvents();
    }
  }, [currentPage, searchQuery, typeFilter, priorityFilter, showUpcoming, canReadCalendar]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      
      const params: CalendarFilters = {
        page: currentPage,
        limit: pageSize,
        sort: 'startDate',
        order: 'asc',
      };

      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (showUpcoming) params.upcoming = true;

      const response = await apiClient.get<{ events: CalendarEvent[], total: number }>('/calendar/events', { 
        params 
      });

      if (response.success && response.data) {
        setEvents(response.data.events || []);
        setTotalEvents(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadEvents();
  };

  const handleEventAction = async (eventId: string, action: 'complete' | 'delete') => {
    try {
      switch (action) {
        case 'complete':
          // Mark event as completed (you might want to add a status field)
          await apiClient.patch(`/calendar/events/${eventId}`, { 
            // Add completion logic here
          });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this calendar event? This action cannot be undone.')) {
            await apiClient.delete(`/calendar/events/${eventId}`);
          }
          break;
      }
      
      // Reload events after action
      loadEvents();
    } catch (error) {
      console.error(`Failed to ${action} event:`, error);
      alert(`Failed to ${action} event. Please try again.`);
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map(event => event.id));
    }
  };

  const getTypeBadge = (type: string) => {
    const typeStyles = {
      deadline: 'bg-red-100 text-red-800',
      meeting: 'bg-blue-100 text-blue-800',
      audit: 'bg-purple-100 text-purple-800',
      review: 'bg-yellow-100 text-yellow-800',
      submission: 'bg-green-100 text-green-800',
      reminder: 'bg-gray-100 text-gray-800',
      custom: 'bg-indigo-100 text-indigo-800',
    };

    const typeIcons = {
      deadline: <AlertCircle className="h-3 w-3" />,
      meeting: <Users className="h-3 w-3" />,
      audit: <CheckCircle className="h-3 w-3" />,
      review: <Clock className="h-3 w-3" />,
      submission: <CheckCircle className="h-3 w-3" />,
      reminder: <Clock className="h-3 w-3" />,
      custom: <CalendarIcon className="h-3 w-3" />,
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyles[type as keyof typeof typeStyles] || typeStyles.custom}`}>
        {typeIcons[type as keyof typeof typeIcons] && (
          <span className="mr-1">{typeIcons[type as keyof typeof typeIcons]}</span>
        )}
        {type.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };

    const priorityIcons = {
      low: <span className="w-2 h-2 bg-gray-400 rounded-full" />,
      medium: <span className="w-2 h-2 bg-blue-400 rounded-full" />,
      high: <span className="w-2 h-2 bg-orange-400 rounded-full" />,
      critical: <span className="w-2 h-2 bg-red-400 rounded-full" />,
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles.medium}`}>
        {priorityIcons[priority as keyof typeof priorityIcons]}
        <span className="ml-1 capitalize">{priority}</span>
      </span>
    );
  };

  const isEventUpcoming = (event: CalendarEvent) => {
    const now = new Date();
    const eventStart = new Date(event.startDate);
    return eventStart > now;
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventEnd = new Date(event.endDate);
    return eventEnd < now && event.type === 'deadline';
  };

  const getUpcomingEvents = () => {
    return events.filter(event => isEventUpcoming(event)).slice(0, 5);
  };

  const getOverdueEvents = () => {
    return events.filter(event => isEventOverdue(event));
  };

  const getEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    events.forEach(event => {
      const dateKey = formatDate(event.startDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const totalPages = Math.ceil(totalEvents / pageSize);

  if (!canReadCalendar) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view the calendar.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">
              Manage your events, deadlines, and schedule
            </p>
          </div>
          <div className="flex space-x-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {canWriteCalendar && (
              <Link href="/calendar/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {getUpcomingEvents().length} upcoming
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deadlines</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter(e => e.type === 'deadline').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {getOverdueEvents().length} overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meetings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter(e => e.type === 'meeting').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter(e => e.priority === 'critical').length}
              </div>
              <p className="text-xs text-muted-foreground">
                High priority events
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="deadline">Deadlines</option>
                <option value="meeting">Meetings</option>
                <option value="audit">Audits</option>
                <option value="review">Reviews</option>
                <option value="submission">Submissions</option>
                <option value="reminder">Reminders</option>
                <option value="custom">Custom</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="upcoming"
                  checked={showUpcoming}
                  onChange={(e) => setShowUpcoming(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="upcoming" className="text-sm">Upcoming only</label>
              </div>

              <Button type="submit" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Events ({totalEvents})</CardTitle>
            <CardDescription>
              {selectedEvents.length > 0 && `${selectedEvents.length} selected • `}
              Manage your events and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upcoming Events Summary */}
                {getUpcomingEvents().length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Upcoming Events</h3>
                    <div className="space-y-2">
                      {getUpcomingEvents().map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {getTypeBadge(event.type)}
                            <span className="font-medium">{event.title}</span>
                          </div>
                          <span className="text-blue-700">
                            {formatRelativeTime(event.startDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overdue Events Alert */}
                {getOverdueEvents().length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-900 mb-2">Overdue Deadlines</h3>
                    <div className="space-y-2">
                      {getOverdueEvents().map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge('critical')}
                            <span className="font-medium text-red-900">{event.title}</span>
                          </div>
                          <span className="text-red-700">
                            {formatDate(event.endDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events List */}
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${isEventOverdue(event) ? 'border-red-200 bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(event.id)}
                            onChange={() => handleSelectEvent(event.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
                          />
                          
                          <div className="flex-shrink-0">
                            <CalendarIcon className={`h-5 w-5 ${isEventOverdue(event) ? 'text-red-500' : 'text-primary'}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className={`text-lg font-medium ${isEventOverdue(event) ? 'text-red-900' : 'text-gray-900'}`}>
                                {event.title}
                              </h3>
                              {getTypeBadge(event.type)}
                              {getPriorityBadge(event.priority)}
                              {isEventOverdue(event) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </span>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {event.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-6 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>
                                  {formatDateTime(event.startDate)}
                                  {!event.isAllDay && ` - ${formatDateTime(event.endDate)}`}
                                </span>
                              </div>
                              
                              {event.assignedToId.length > 0 && (
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  <span>{event.assignedToId.length} assigned</span>
                                </div>
                              )}
                              
                              {event.projectId && (
                                <div>
                                  <span>Project: {event.projectId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Link href={`/calendar/${event.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEventAction(event.id, 'complete')}
                            disabled={!canWriteCalendar}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEventAction(event.id, 'delete')}
                            disabled={!canDeleteCalendar}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEvents)} of {totalEvents} results
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {events.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No calendar events</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first calendar event.</p>
                    {canWriteCalendar && (
                      <div className="mt-6">
                        <Link href="/calendar/new">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Event
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}