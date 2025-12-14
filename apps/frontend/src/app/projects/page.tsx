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
  Filter, 
  Edit, 
  Trash2, 
  FolderOpen,
  Calendar,
  User,
  MoreHorizontal,
  Download,
  Eye,
  Play,
  Pause,
  CheckCircle
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Project, QueryOptions } from "@accu/shared";

interface ProjectFilters extends QueryOptions {
  search?: string;
  status?: string;
  type?: string;
}

export default function ProjectsPage() {
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const canReadProjects = hasPermission("projects.read");
  const canWriteProjects = hasPermission("projects.write");
  const canDeleteProjects = hasPermission("projects.delete");

  useEffect(() => {
    if (canReadProjects) {
      loadProjects();
    }
  }, [currentPage, searchQuery, statusFilter, typeFilter, canReadProjects]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      
      const params: ProjectFilters = {
        page: currentPage,
        limit: pageSize,
        sort: 'updatedAt',
        order: 'desc',
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await apiClient.get<{ projects: Project[], total: number }>('/projects', { 
        params 
      });

      if (response.success && response.data) {
        setProjects(response.data.projects || []);
        setTotalProjects(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProjects();
  };

  const handleProjectAction = async (projectId: string, action: 'activate' | 'pause' | 'complete' | 'delete') => {
    try {
      let updateData = {};
      
      switch (action) {
        case 'activate':
          updateData = { status: 'active' };
          break;
        case 'pause':
          updateData = { status: 'on_hold' };
          break;
        case 'complete':
          updateData = { status: 'completed' };
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            await apiClient.delete(`/projects/${projectId}`);
          }
          break;
      }
      
      if (action !== 'delete' && Object.keys(updateData).length > 0) {
        await apiClient.patch(`/projects/${projectId}`, updateData);
      }
      
      // Reload projects after action
      loadProjects();
    } catch (error) {
      console.error(`Failed to ${action} project:`, error);
      alert(`Failed to ${action} project. Please try again.`);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(project => project.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeStyles = {
      methodology: 'bg-purple-100 text-purple-800',
      audit: 'bg-orange-100 text-orange-800',
      compliance: 'bg-teal-100 text-teal-800',
      research: 'bg-indigo-100 text-indigo-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyles[type as keyof typeof typeStyles] || typeStyles.methodology}`}>
        {type}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-4 w-4 text-green-600" />;
      case 'on_hold':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <FolderOpen className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalPages = Math.ceil(totalProjects / pageSize);

  if (!canReadProjects) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view projects.</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and track their progress
            </p>
          </div>
          <div className="flex space-x-2">
            {selectedProjects.length > 0 && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedProjects.length})
              </Button>
            )}
            {canWriteProjects && (
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </Link>
            )}
          </div>
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
                    placeholder="Search projects by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="methodology">Methodology</option>
                <option value="audit">Audit</option>
                <option value="compliance">Compliance</option>
                <option value="research">Research</option>
              </select>

              <Button type="submit" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Projects Grid/List */}
        <Card>
          <CardHeader>
            <CardTitle>Projects ({totalProjects})</CardTitle>
            <CardDescription>
              {selectedProjects.length > 0 && `${selectedProjects.length} selected • `}
              Track and manage all your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Projects List */}
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => handleSelectProject(project.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
                          />
                          
                          <div className="flex-shrink-0">
                            {getStatusIcon(project.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {project.name}
                              </h3>
                              {getStatusBadge(project.status)}
                              {getTypeBadge(project.type)}
                            </div>
                            
                            {project.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-6 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>Start: {formatDate(project.startDate)}</span>
                              </div>
                              
                              {project.endDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>End: {formatDate(project.endDate)}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span>Owner: {project.ownerId}</span>
                              </div>
                              
                              <div>
                                <span>Updated: {formatDateTime(project.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <Link href={`/projects/${project.id}/edit`}>
                            <Button variant="ghost" size="sm" disabled={!canWriteProjects}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          {project.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProjectAction(project.id, 'activate')}
                              disabled={!canWriteProjects}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {project.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProjectAction(project.id, 'pause')}
                              disabled={!canWriteProjects}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {(project.status === 'active' || project.status === 'on_hold') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProjectAction(project.id, 'complete')}
                              disabled={!canWriteProjects}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProjectAction(project.id, 'delete')}
                            disabled={!canDeleteProjects}
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
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProjects)} of {totalProjects} results
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

                {projects.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                    {canWriteProjects && (
                      <div className="mt-6">
                        <Link href="/projects/new">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
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