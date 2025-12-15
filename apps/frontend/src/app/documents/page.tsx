"use client";

import { useState, useEffect, useRef } from "react";
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
  Upload, 
  Download,
  Edit, 
  Trash2, 
  FileText,
  File,
  Eye,
  Filter,
  Grid,
  List,
  Calendar,
  User,
  FolderOpen
} from "lucide-react";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import type { Document, QueryOptions } from "@accu/shared";

interface DocumentFilters extends QueryOptions {
  search?: string;
  status?: string;
  category?: string;
}

export default function DocumentsPage() {
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canReadDocuments = hasPermission("documents.read");
  const canWriteDocuments = hasPermission("documents.write");
  const canDeleteDocuments = hasPermission("documents.delete");

  useEffect(() => {
    if (canReadDocuments) {
      loadDocuments();
    }
  }, [currentPage, searchQuery, statusFilter, categoryFilter, canReadDocuments]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      
      const params: DocumentFilters = {
        page: currentPage,
        limit: pageSize,
        sort: 'updatedAt',
        order: 'desc',
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const response = await apiClient.get<{ documents: Document[], total: number }>('/documents', { 
        params 
      });

      if (response.success && response.data) {
        setDocuments(response.data.documents || []);
        setTotalDocuments(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadDocuments();
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const uploadId = Math.random().toString(36).substring(7);
      try {
        setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

        const response = await apiClient.uploadFile<Document>(
          '/documents/upload',
          file,
          (progress) => {
            setUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
          }
        );

        if (response.success) {
          // Upload successful, reload documents
          loadDocuments();
        }
      } catch (error) {
        console.error('Failed to upload file:', error);
      } finally {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }
    }
  };

  const handleDocumentAction = async (documentId: string, action: 'download' | 'delete') => {
    try {
      switch (action) {
        case 'download':
          const downloadResponse = await apiClient.get(`/documents/${documentId}/download`, {
            responseType: 'blob',
          });
          
          if (downloadResponse.success) {
            const blob = new Blob([downloadResponse.data as any]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = documents.find(d => d.id === documentId)?.fileName || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
          break;
          
        case 'delete':
          if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            await apiClient.delete(`/documents/${documentId}`);
            loadDocuments();
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
      alert(`Failed to ${action} document. Please try again.`);
    }
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {status}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryStyles = {
      methodology: 'bg-purple-100 text-purple-800',
      audit_report: 'bg-orange-100 text-orange-800',
      compliance_document: 'bg-teal-100 text-teal-800',
      evidence: 'bg-red-100 text-red-800',
      correspondence: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryStyles[category as keyof typeof categoryStyles] || categoryStyles.other}`}>
        {category.replace('_', ' ')}
      </span>
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType.includes('pdf')) {
      return '📄';
    } else if (mimeType.includes('word')) {
      return '📝';
    } else if (mimeType.includes('excel')) {
      return '📊';
    } else if (mimeType.includes('powerpoint')) {
      return '📋';
    } else {
      return '📁';
    }
  };

  const totalPages = Math.ceil(totalDocuments / pageSize);

  if (!canReadDocuments) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view documents.</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">
              Manage and organize your project documents
            </p>
          </div>
          <div className="flex space-x-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
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
            
            {selectedDocuments.length > 0 && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download ({selectedDocuments.length})
              </Button>
            )}
            
            {canWriteDocuments && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </>
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
                    placeholder="Search documents by name or description..."
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
                <option value="review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Categories</option>
                <option value="methodology">Methodology</option>
                <option value="audit_report">Audit Report</option>
                <option value="compliance_document">Compliance Document</option>
                <option value="evidence">Evidence</option>
                <option value="correspondence">Correspondence</option>
                <option value="other">Other</option>
              </select>

              <Button type="submit" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{progress}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Display */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({totalDocuments})</CardTitle>
            <CardDescription>
              {selectedDocuments.length > 0 && `${selectedDocuments.length} selected • `}
              Manage your document library
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* View Mode Toggle & Select All */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.length === documents.length && documents.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedDocuments.length > 0 ? `${selectedDocuments.length} selected` : 'Select all'}
                    </span>
                  </div>
                </div>

                {/* Documents Grid/List */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((document) => (
                      <div key={document.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(document.id)}
                            onChange={() => handleSelectDocument(document.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDocumentAction(document.id, 'download')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={!canWriteDocuments}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDocumentAction(document.id, 'delete')}
                              disabled={!canDeleteDocuments}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-center mb-3">
                          <div className="text-4xl mb-2">{getFileIcon(document.mimeType)}</div>
                          <h3 className="font-medium text-sm truncate" title={document.name}>
                            {document.name}
                          </h3>
                          <p className="text-xs text-gray-500">{formatFileSize(document.fileSize)}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-center space-x-1">
                            {getStatusBadge(document.status)}
                          </div>
                          <div className="flex justify-center">
                            {getCategoryBadge(document.category)}
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Version:</span>
                            <span>{document.version}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Updated:</span>
                            <span>{formatDate(document.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((document) => (
                      <div key={document.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={() => handleSelectDocument(document.id)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        
                        <div className="text-2xl">{getFileIcon(document.mimeType)}</div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {document.name}
                            </h3>
                            {getStatusBadge(document.status)}
                            {getCategoryBadge(document.category)}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>Version {document.version}</span>
                            <span>Updated {formatDateTime(document.updatedAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDocumentAction(document.id, 'download')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={!canWriteDocuments}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDocumentAction(document.id, 'delete')}
                            disabled={!canDeleteDocuments}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalDocuments)} of {totalDocuments} results
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

                {documents.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by uploading your first document.</p>
                    {canWriteDocuments && (
                      <div className="mt-6">
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
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