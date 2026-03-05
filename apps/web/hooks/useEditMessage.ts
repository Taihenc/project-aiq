import { useState, useRef, useEffect, useCallback } from 'react';
import type { FileRef } from '@/types/api';

interface UseEditMessageOptions {
  content: unknown;
  sentAttachments?: FileRef[];
  messageId?: string;
  isLoading?: boolean;
  onEditMessage?: (
    messageId: string,
    newContent: string,
    attachments?: FileRef[],
  ) => void;
}

export function useEditMessage({
  content,
  sentAttachments,
  messageId,
  isLoading,
  onEditMessage,
}: UseEditMessageOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editAttachments, setEditAttachments] = useState<FileRef[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cancel editing immediately if a response starts loading
  useEffect(() => {
    if (isLoading && isEditing) {
      setIsEditing(false);
      setEditValue('');
      setEditAttachments([]);
    }
  }, [isLoading, isEditing]);

  // Auto-focus + resize textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (isLoading) return;
    setEditValue(
      typeof content === 'string' ? content : JSON.stringify(content),
    );
    setEditAttachments(sentAttachments ? [...sentAttachments] : []);
    setIsEditing(true);
  }, [content, sentAttachments, isLoading]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
    setEditAttachments([]);
  }, []);

  const handleSubmitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed || !messageId || !onEditMessage) return;
    onEditMessage(
      messageId,
      trimmed,
      editAttachments.length > 0 ? editAttachments : undefined,
    );
    setIsEditing(false);
    setEditValue('');
    setEditAttachments([]);
  }, [editValue, messageId, onEditMessage, editAttachments]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSubmitEdit, handleCancelEdit],
  );

  const handleAddAttachment = useCallback((attachment: FileRef) => {
    setEditAttachments((prev) => {
      const idx = prev.findIndex((a) => a.file_path === attachment.file_path);
      if (idx !== -1) {
        const next = [...prev];
        const merged = [...next[idx].chunks];
        for (const c of attachment.chunks) {
          if (!merged.some((m) => m.chunk_number === c.chunk_number)) {
            merged.push(c);
          }
        }
        next[idx] = { ...next[idx], chunks: merged };
        return next;
      }
      return [...prev, attachment];
    });
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setEditAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveChunk = useCallback(
    (filePath: string, chunkNumber: number) => {
      setEditAttachments((prev) =>
        prev
          .map((a) =>
            a.file_path === filePath
              ? {
                  ...a,
                  chunks: a.chunks.filter(
                    (c) => c.chunk_number !== chunkNumber,
                  ),
                }
              : a,
          )
          .filter((a) => a.chunks.length > 0),
      );
    },
    [],
  );

  return {
    isEditing,
    editValue,
    setEditValue,
    editAttachments,
    textareaRef,
    handleStartEdit,
    handleCancelEdit,
    handleSubmitEdit,
    handleKeyDown,
    handleAddAttachment,
    handleRemoveAttachment,
    handleRemoveChunk,
  };
}
