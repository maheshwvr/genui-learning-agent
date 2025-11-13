/**
 * Upload progress component for displaying TUS upload status
 * Shows progress bars, file info, and upload controls
 */

import React, { useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileIcon,
  Loader2 
} from 'lucide-react'
import { UploadQueueItem } from '@/hooks/use-tus-upload'
import { formatFileSize } from '@/lib/utils/file-utils'

interface UploadProgressProps {
  uploadQueue: UploadQueueItem[]
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRemove?: (id: string) => void
  className?: string
  showCompleted?: boolean
  compact?: boolean
}

interface UploadItemProps {
  item: UploadQueueItem
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRemove?: (id: string) => void
  compact?: boolean
}

const UploadItem = memo(function UploadItem({ 
  item, 
  onPause, 
  onResume, 
  onCancel, 
  onRemove,
  compact = false
}: UploadItemProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" aria-label="Upload completed" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" aria-label="Upload failed" />
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" aria-label="Uploading" />
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" aria-label="Upload paused" />
      default:
        return <FileIcon className="h-5 w-5 text-gray-500" aria-label="File queued" />
    }
  }

  const getStatusText = () => {
    switch (item.status) {
      case 'pending':
        return 'Waiting...'
      case 'uploading':
        return `Uploading... ${item.progress}%`
      case 'completed':
        return 'Complete'
      case 'error':
        return `Error: ${item.error}`
      case 'paused':
        return 'Paused'
      default:
        return 'Unknown'
    }
  }

  const getProgressColor = () => {
    switch (item.status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'paused':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  const canPause = item.status === 'uploading'
  const canResume = item.status === 'paused'
  const canCancel = item.status === 'uploading' || item.status === 'pending' || item.status === 'paused'
  const canRemove = item.status === 'completed' || item.status === 'error'

  const handlePause = () => onPause?.(item.id)
  const handleResume = () => onResume?.(item.id)
  const handleCancel = () => onCancel?.(item.id)
  const handleRemove = () => onRemove?.(item.id)

  if (compact) {
    return (
      <div 
        className="flex items-center space-x-3 p-3 border-b last:border-b-0"
        role="listitem"
        aria-label={`Upload progress for ${item.file.name}`}
      >
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {item.file.name}
            </p>
            <span className="text-xs text-gray-500">
              {formatFileSize(item.file.size)}
            </span>
          </div>
          
          <div className="mt-1">
            <Progress 
              value={item.progress} 
              className="h-2"
              indicatorClassName={getProgressColor()}
              aria-label={`Upload progress: ${item.progress}%`}
            />
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            {getStatusText()}
          </p>
        </div>

        <div className="flex-shrink-0 flex space-x-1">
          {canPause && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePause}
              className="h-8 w-8 p-0"
              aria-label={`Pause upload of ${item.file.name}`}
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          
          {canResume && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResume}
              className="h-8 w-8 p-0"
              aria-label={`Resume upload of ${item.file.name}`}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          {(canCancel || canRemove) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={canCancel ? handleCancel : handleRemove}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              aria-label={canCancel ? `Cancel upload of ${item.file.name}` : `Remove ${item.file.name} from list`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4" role="listitem" aria-label={`Upload progress for ${item.file.name}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {item.file.name}
              </h4>
              <span className="text-sm text-gray-500">
                {formatFileSize(item.file.size)}
              </span>
            </div>
            
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>{getStatusText()}</span>
                <span>{item.progress}%</span>
              </div>
              
              <Progress 
                value={item.progress} 
                className="h-3"
                indicatorClassName={getProgressColor()}
                aria-label={`Upload progress: ${item.progress}%`}
              />
            </div>
            
            {item.error && (
              <p className="mt-2 text-sm text-red-600">
                {item.error}
              </p>
            )}
          </div>
          
          <div className="flex-shrink-0 flex space-x-2">
            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                aria-label={`Pause upload of ${item.file.name}`}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            {canResume && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResume}
                aria-label={`Resume upload of ${item.file.name}`}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            
            {(canCancel || canRemove) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={canCancel ? handleCancel : handleRemove}
                aria-label={canCancel ? `Cancel upload of ${item.file.name}` : `Remove ${item.file.name} from list`}
              >
                <X className="h-4 w-4 mr-1" />
                {canCancel ? 'Cancel' : 'Remove'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export function UploadProgress({ 
  uploadQueue, 
  onPause,
  onResume,
  onCancel,
  onRemove,
  className,
  showCompleted = true,
  compact = false
}: UploadProgressProps) {
  const filteredQueue = useMemo(() => 
    showCompleted 
      ? uploadQueue 
      : uploadQueue.filter(item => item.status !== 'completed'),
    [uploadQueue, showCompleted]
  )

  const stats = useMemo(() => {
    const totalProgress = uploadQueue.length > 0
      ? uploadQueue.reduce((sum, item) => sum + item.progress, 0) / uploadQueue.length
      : 0

    const activeUploads = uploadQueue.filter(item => item.status === 'uploading').length
    const completedUploads = uploadQueue.filter(item => item.status === 'completed').length
    const errorUploads = uploadQueue.filter(item => item.status === 'error').length

    return {
      totalProgress,
      activeUploads,
      completedUploads,
      errorUploads
    }
  }, [uploadQueue])

  if (filteredQueue.length === 0) {
    return null
  }

  return (
    <div className={cn("w-full space-y-4", className)} role="region" aria-label="Upload progress">
      {/* Overall Progress Summary */}
      {uploadQueue.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                Upload Progress ({stats.completedUploads}/{uploadQueue.length} completed)
              </h3>
              <span className="text-sm text-gray-500">
                {Math.round(stats.totalProgress)}%
              </span>
            </div>
            
            <Progress 
              value={stats.totalProgress} 
              className="h-2" 
              aria-label={`Overall upload progress: ${Math.round(stats.totalProgress)}%`}
            />
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>
                {stats.activeUploads > 0 && `${stats.activeUploads} uploading`}
                {stats.activeUploads > 0 && stats.errorUploads > 0 && ', '}
                {stats.errorUploads > 0 && `${stats.errorUploads} failed`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual File Progress */}
      <div 
        className={cn(
          "space-y-3",
          compact && "space-y-0 border rounded-lg overflow-hidden"
        )}
        role="list"
        aria-label="Individual file upload progress"
      >
        {filteredQueue.map((item) => (
          <UploadItem
            key={item.id}
            item={item}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
            onRemove={onRemove}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}