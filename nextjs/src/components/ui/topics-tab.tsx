'use client';

import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TopicCard } from '@/components/ui/topic-card';
import { TopicManagementModal } from '@/components/ui/topic-management-modal';
import { DraggableMaterialItem } from '@/components/ui/draggable-material-item';
import { Plus, FolderOpen, Users, CheckCircle2, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Topic } from '@/lib/types';

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  topic_tags: string[];
  created_at: string;
}

export interface TopicsTabProps {
  courseId: string;
  courseName: string;
  topics: Topic[];
  materials: Material[];
  loading: boolean;
  onRefresh: () => void;
  onMaterialTopicsUpdate: (materialId: string, topics: string[]) => void;
  onTopicsEdit?: (materialId: string) => void;
  onMaterialDelete: (materialId: string) => void;
  className?: string;
}

export function TopicsTab({
  courseId,
  courseName,
  topics,
  materials,
  loading,
  onRefresh,
  onMaterialTopicsUpdate,
  onTopicsEdit,
  onMaterialDelete,
  className
}: TopicsTabProps) {
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  // Group materials by topics
  const { topicsWithMaterials, uncategorizedMaterials, displayMaterials } = useMemo(() => {
    const topicsMap = new Map(topics.map(topic => [topic.name, { ...topic, materials: [] as Material[] }]));
    const uncategorized: Material[] = [];

    materials.forEach(material => {
      if (material.topic_tags.length === 0) {
        uncategorized.push(material);
      } else {
        material.topic_tags.forEach(tag => {
          const topic = topicsMap.get(tag);
          if (topic) {
            topic.materials.push(material);
          } else {
            // Material has a topic tag that doesn't exist in topics list
            uncategorized.push(material);
          }
        });
      }
    });

    // Determine which materials to display based on toggle
    const displayMaterials = showAllMaterials ? materials : uncategorized;

    return {
      topicsWithMaterials: Array.from(topicsMap.values()),
      uncategorizedMaterials: uncategorized,
      displayMaterials
    };
  }, [topics, materials, showAllMaterials]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !active.data.current) return;

    const activeData = active.data.current;
    
    if (activeData.type === 'material') {
      const material = activeData.material as Material;
      const overId = over.id as string;

      if (overId.startsWith('topic-')) {
        // Extract topic ID and find the topic
        const topicId = overId.replace('topic-', '');
        const targetTopic = topics.find(t => t.id === topicId);
        
        if (targetTopic) {
          // Add the topic to material's tags (don't replace existing ones)
          const newTopics = [...new Set([...material.topic_tags, targetTopic.name])];
          onMaterialTopicsUpdate(material.id, newTopics);
        }
      } else if (overId === 'uncategorized-zone') {
        // Remove all topic tags
        onMaterialTopicsUpdate(material.id, []);
      }
    }
  };

  const handleCreateTopic = () => {
    setEditingTopic(null);
    setShowTopicModal(true);
  };

  const handleEditTopic = (topicId: string, topicName: string) => {
    setEditingTopic({ id: topicId, name: topicName });
    setShowTopicModal(true);
  };

  const draggedMaterial = useMemo(() => {
    if (!activeId || !activeId.startsWith('material-')) return null;
    const materialId = activeId.replace('material-', '');
    return materials.find(m => m.id === materialId);
  }, [activeId, materials]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading topics..." size="md" />
      </div>
    );
  }

  // Empty states
  const hasTopics = topics.length > 0;
  const hasMaterials = materials.length > 0;
  const allMaterialsCategorized = uncategorizedMaterials.length === 0 && hasMaterials;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Topics Organization</h3>
          <p className="text-sm text-muted-foreground">
            Organize your materials by dragging them into topic categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasMaterials && (
            <Button 
              onClick={() => setShowAllMaterials(!showAllMaterials)}
              variant="outline"
              size="sm"
              className="bg-white text-black border-gray-300 hover:bg-gray-50"
            >
              {showAllMaterials ? 'Show Uncategorized Only' : 'Show All Materials'}
            </Button>
          )}
          <Button onClick={handleCreateTopic} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>

      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        {/* Topics Grid */}
        {hasTopics ? (
          <div className="space-y-6">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Topics ({topics.length})
            </h4>
            <div className="flex flex-wrap gap-4">
              {topicsWithMaterials.map((topic) => (
                <TopicCard
                  key={topic.id}
                  id={topic.id}
                  name={topic.name}
                  materialCount={topic.materials?.length || 0}
                  materials={topic.materials}
                  onEdit={() => handleEditTopic(topic.id, topic.name)}
                  onDelete={() => handleEditTopic(topic.id, topic.name)} // Will open modal in edit mode with delete option
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="text-center py-8">
            <CardContent>
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Topics Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add topics to get started organizing your materials.
              </p>
              <Button onClick={handleCreateTopic}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Topic
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Materials Section */}
        {hasMaterials && (
          <div className="space-y-6">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              {showAllMaterials ? (
                <>
                  <Users className="h-4 w-4" />
                  All Materials ({materials.length})
                </>
              ) : uncategorizedMaterials.length > 0 ? (
                <>
                  <Users className="h-4 w-4" />
                  Uncategorized Materials ({uncategorizedMaterials.length})
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  All Materials Organized!
                </>
              )}
            </h4>
            
            {displayMaterials.length > 0 ? (
              <Card className="p-4">
                <CardContent className="space-y-3 p-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    {showAllMaterials 
                      ? 'All your materials are shown below. Drag them into topics to organize or reorganize them.'
                      : 'Drag these materials into topics to organize them.'
                    }
                  </p>
                  {displayMaterials.map((material) => (
                    <DraggableMaterialItem
                      key={material.id}
                      material={material}
                      onDelete={onMaterialDelete}
                      onTopicsEdit={onTopicsEdit}
                    />
                  ))}
                </CardContent>
              </Card>
            ) : allMaterialsCategorized && !showAllMaterials ? (
              <Card className="text-center py-6 bg-green-50 border-green-200">
                <CardContent>
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-3" />
                  <p className="text-green-800 font-medium">
                    Perfect! All your materials are organized into topics.
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    You can always drag materials between topics to reorganize them.
                  </p>
                  <div className="mt-4">
                    <Button 
                      onClick={() => setShowAllMaterials(true)}
                      variant="outline"
                      size="sm"
                      className="bg-white text-black border-gray-300 hover:bg-gray-50"
                    >
                      Show All Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {/* Empty State - No Materials */}
        {!hasMaterials && hasTopics && (
          <Card className="text-center py-8">
            <CardContent>
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Materials Yet</h3>
              <p className="text-muted-foreground">
                Upload some materials to start organizing them into topics.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedMaterial && (
            <Card className="opacity-90 shadow-2xl border-2 border-primary/20 bg-background">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{draggedMaterial.file_name}</p>
                    <p className="text-sm text-muted-foreground">Dragging to topic...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Topic Management Modal */}
      <TopicManagementModal
        isOpen={showTopicModal}
        onClose={() => {
          setShowTopicModal(false);
          setEditingTopic(null);
        }}
        courseId={courseId}
        topicId={editingTopic?.id}
        initialTopicName={editingTopic?.name}
        mode={editingTopic ? 'edit' : 'create'}
        onTopicSaved={() => {
          onRefresh();
          setShowTopicModal(false);
          setEditingTopic(null);
        }}
      />
    </div>
  );
}