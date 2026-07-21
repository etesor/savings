// Ambient types for the File System Access API pickers and permission methods,
// which are not part of the standard TypeScript DOM lib. Declared as optional so
// the code can feature-detect and fall back to localStorage on unsupported browsers.

export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemFileHandle {
    queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface Window {
    showOpenFilePicker?(options?: {
      multiple?: boolean;
      types?: FilePickerAcceptType[];
    }): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(options?: {
      suggestedName?: string;
      types?: FilePickerAcceptType[];
    }): Promise<FileSystemFileHandle>;
  }
}
