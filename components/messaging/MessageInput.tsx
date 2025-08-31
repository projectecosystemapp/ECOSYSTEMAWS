'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, Image, FileText } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  supportAttachments?: boolean;
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  supportAttachments = false
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!content.trim() && attachments.length === 0) || isSending) return;

    setIsSending(true);
    try {
      // Handle file uploads first (placeholder for now)
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        // In production, upload files to S3 and get URLs
        console.log('Would upload files:', attachments);
        // For now, just use file names as placeholders
        attachmentUrls.push(...attachments.map(file => `placeholder://${file.name}`));
      }

      await onSendMessage(content.trim() || 'File attachment', attachmentUrls);
      setContent('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Allow images and documents up to 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      return file.size <= maxSize && allowedTypes.includes(file.type);
    });

    setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                {getFileIcon(file)}
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          {supportAttachments && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isSending || attachments.length >= 5}
              >
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Attach file</span>
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
          
          <Button
            type="submit"
            disabled={(!content.trim() && attachments.length === 0) || disabled || isSending}
            size="sm"
          >
            {isSending ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
        {supportAttachments && (
          <div className="text-xs text-gray-400">
            {attachments.length}/5 files • Max 10MB each
          </div>
        )}
      </div>
    </form>
  );
}