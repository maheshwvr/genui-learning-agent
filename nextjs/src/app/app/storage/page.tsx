"use client";

import React, { useState, useCallback } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { TopicAssociationDropdown } from '@/components/ui/topic-association-dropdown';
import { CourseTopicBanner } from '@/components/ui/course-topic-banner';
import { UploadProgress } from '@/components/ui/upload-progress';
import { Upload, Trash2, Loader2, FileIcon, AlertCircle, CheckCircle, Tag, Plus } from 'lucide-react';
import { CourseSelector } from '@/components/ui/course-selector';
import { formatFileSize } from '@/lib/utils/file-utils';
import { useTusUpload } from '@/hooks/use-tus-upload';

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadTopics, setUploadTopics] = useState<string>('');
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    // TUS upload hook
    const tusUpload = useTusUpload({
        courseId: selectedCourse?.id || '',
        existingFileNames: materials.map(m => m.file_name),
        topicTags: uploadTopics
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0),
        onUploadComplete: async (filePath: string, file: File) => {
            try {
                // Add material record to database after successful upload
                const parsedTopics = uploadTopics
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0);

                // Call API to create database record after TUS upload
                const response = await fetch(`/api/courses/${selectedCourse!.id}/materials`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        mime_type: file.type,
                        topic_tags: parsedTopics
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save material record');
                }

                console.log(`Upload completed for ${file.name}`);
            } catch (error) {
                console.error('Error adding material to database:', error);
                setError(`Upload succeeded but failed to save record for ${file.name}`);
            }
        },
        onAllUploadsComplete: async () => {
            // Refresh materials list after all uploads complete
            if (selectedCourse) {
                await loadCourseMaterials(selectedCourse.id);
                setSuccess(`${tusUpload.uploadQueue.filter(q => q.status === 'completed').length} material(s) uploaded successfully`);
                setFileToUpload(null);
                setUploadTopics('');
                setShowUploadDialog(false);
                tusUpload.clearCompleted();
            }
        },
        onError: (error: string, file: File) => {
            setError(`Upload failed for ${file.name}: ${error}`);
        },
        sequential: true
    });

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

    const handleFileUpload = useCallback(async (filesToUpload?: File[]) => {
        const files = filesToUpload || (fileToUpload ? [fileToUpload] : []);
        if (files.length === 0 || !selectedCourse) return;

        // Add files to TUS upload queue
        tusUpload.addFiles(files);
    }, [fileToUpload, selectedCourse, tusUpload]);

    // Wrapper for dialog upload button
    const handleDialogUpload = useCallback(() => {
        handleFileUpload();
    }, [handleFileUpload]);

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
                <PageHeader
                    title="Materials Management"
                    description="Organize your learning materials by courses and topics for AI-assisted learning."
                />
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
                                                onClick={handleDialogUpload}
                                                disabled={!fileToUpload || tusUpload.isUploading}
                                            >
                                                {tusUpload.isUploading ? (
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
                        <CourseTopicBanner
                            courseId={selectedCourse.id}
                            courseName={selectedCourse.name}
                            topics={topics}
                            onTopicsChange={() => loadCourseMaterials(selectedCourse.id)}
                        />

                        <DragDropZone
                            onFilesDropped={handleFileUpload}
                            disabled={tusUpload.isUploading}
                            className="min-h-[200px]"
                            maxSize={100 * 1024 * 1024} // 100MB
                        >
                            {/* Upload Progress Component */}
                            {tusUpload.uploadQueue.length > 0 && (
                                <div className="mb-6">
                                    <UploadProgress
                                        uploadQueue={tusUpload.uploadQueue}
                                        onPause={tusUpload.pauseUpload}
                                        onResume={tusUpload.resumeUpload}
                                        onCancel={tusUpload.cancelUpload}
                                        onRemove={tusUpload.removeFile}
                                        compact={true}
                                    />
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
                                    <p className="text-sm mt-2 text-blue-600">
                                        Drag and drop files here or use the "Add Material" button above
                                    </p>
                                    <p className="text-sm mt-1 text-gray-500">
                                        Supports files up to 100MB
                                    </p>
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
                                            <div className="flex items-center space-x-2">
                                                <TopicAssociationDropdown
                                                    materialId={material.id}
                                                    courseId={selectedCourse.id}
                                                    currentTopics={material.topic_tags}
                                                    onTopicsChange={() => loadCourseMaterials(selectedCourse.id)}
                                                />
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
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DragDropZone>
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
