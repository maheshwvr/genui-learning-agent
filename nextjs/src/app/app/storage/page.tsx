"use client";

import React, { useState, useCallback } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Trash2, Loader2, FileIcon, AlertCircle, CheckCircle, Tag, Plus } from 'lucide-react';
import { CourseSelector } from '@/components/ui/course-selector';

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  topic_tags: string[];
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  description?: string | null;
  materialCount: number;
  created_at: string;
  updated_at: string;
}

export default function MaterialsManagementPage() {
    const { user } = useGlobal();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [topics, setTopics] = useState<{name: string; materialCount: number}[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadTopics, setUploadTopics] = useState<string>('');
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const loadCourseMaterials = useCallback(async (courseId: string) => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(`/api/courses/${courseId}/materials`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(data.materials || []);
                setTopics(data.topics || []);
            } else {
                setError('Failed to load course materials');
            }
        } catch (err) {
            setError('Failed to load course materials');
            console.error('Error loading materials:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        if (course) {
            loadCourseMaterials(course.id);
        } else {
            setMaterials([]);
            setTopics([]);
        }
    };

    const handleFileUpload = useCallback(async () => {
        if (!fileToUpload || !selectedCourse) return;

        try {
            setUploading(true);
            setError('');

            const formData = new FormData();
            formData.append('file', fileToUpload);
            
            const parsedTopics = uploadTopics
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
            
            formData.append('topicTags', JSON.stringify(parsedTopics));

            const response = await fetch(`/api/courses/${selectedCourse.id}/materials`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                await loadCourseMaterials(selectedCourse.id);
                setSuccess('Material uploaded successfully');
                setFileToUpload(null);
                setUploadTopics('');
                setShowUploadDialog(false);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to upload material');
            }
        } catch (err) {
            setError('Failed to upload material');
            console.error('Error uploading material:', err);
        } finally {
            setUploading(false);
        }
    }, [fileToUpload, selectedCourse, uploadTopics, loadCourseMaterials]);

    const deleteMaterial = async (materialId: string) => {
        if (!selectedCourse) return;

        try {
            const response = await fetch(`/api/courses/${selectedCourse.id}/materials?materialId=${materialId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await loadCourseMaterials(selectedCourse.id);
                setSuccess('Material deleted successfully');
            } else {
                setError('Failed to delete material');
            }
        } catch (err) {
            setError('Failed to delete material');
            console.error('Error deleting material:', err);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Materials Management</h1>
                <p className="text-muted-foreground">
                    Organize your learning materials by courses and topics for AI-assisted learning.
                </p>
            </div>

            {error && (
                <Alert className="mb-6 border-destructive bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="mb-6 border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            <div className="mb-8">
                <CourseSelector
                    onCourseSelect={handleCourseSelect}
                    selectedCourseId={selectedCourse?.id}
                    showCreateButton={true}
                    showMaterialCount={true}
                    showDeleteButton={true}
                />
            </div>

            {selectedCourse ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Materials for {selectedCourse.name}</span>
                            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Material
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Material</DialogTitle>
                                        <DialogDescription>
                                            Add a new learning material to {selectedCourse.name}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">File</label>
                                            <Input
                                                type="file"
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (files && files.length > 0) {
                                                        setFileToUpload(files[0]);
                                                    }
                                                }}
                                            />
                                            {fileToUpload && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Selected: {fileToUpload.name}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Topic Tags (Optional)</label>
                                            <Input
                                                value={uploadTopics}
                                                onChange={(e) => setUploadTopics(e.target.value)}
                                                placeholder="e.g., machine learning, statistics, visualization"
                                                className="mt-1"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Separate multiple topics with commas.
                                            </p>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowUploadDialog(false);
                                                    setFileToUpload(null);
                                                    setUploadTopics('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleFileUpload}
                                                disabled={!fileToUpload || uploading}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    'Upload Material'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardTitle>
                        <CardDescription>
                            {materials.length} material{materials.length !== 1 ? 's' : ''} 
                            {topics.length > 0 && ` • ${topics.length} topic${topics.length !== 1 ? 's' : ''}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topics.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-medium mb-2 flex items-center">
                                    <Tag className="h-4 w-4 mr-1" />
                                    Topics in this course
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {topics.map((topic) => (
                                        <span
                                            key={topic.name}
                                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border"
                                        >
                                            {topic.name} ({topic.materialCount})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading materials...
                            </div>
                        ) : materials.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileIcon className="h-12 w-12 mx-auto mb-4" />
                                <p>No materials uploaded yet</p>
                                <p className="text-sm">Upload your first learning material to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {materials.map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                                            <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{material.file_name}</p>
                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                    <span>{formatFileSize(material.file_size)}</span>
                                                    <span>{formatDate(material.created_at)}</span>
                                                    {material.topic_tags.length > 0 && (
                                                        <div className="flex items-center space-x-1">
                                                            <Tag className="h-3 w-3" />
                                                            <span>{material.topic_tags.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Material</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete "{material.file_name}"? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteMaterial(material.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className="text-center py-12">
                    <CardContent>
                        <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select a Course</h3>
                        <p className="text-muted-foreground">
                            Choose a course above to manage its learning materials.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
