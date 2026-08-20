export {};

declare global {
  interface RubaDesktopApi {
    getPaths: () => Promise<{
      userData: string;
      documents: string;
      downloads: string;
      desktop: string;
    }>;
    chooseDirectory: () => Promise<string | null>;
    chooseFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;
    saveFile: (payload: {
      fileName: string;
      data: string;
      encoding?: 'base64';
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
    readFile: (filePath: string) => Promise<{ filePath: string; data: string }>;
    captureWindow: () => Promise<{ canceled: boolean; filePath?: string }>;
    dbSummary: () => Promise<{ projects: number; files: number; deliveryPlans: number; breakdownRows: number }>;
    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<boolean>;
    getStorageRoot: () => Promise<string>;
    chooseStorageRoot: () => Promise<string | null>;
    listProjects: (query?: string) => Promise<any[]>;
    saveProject: (project: any) => Promise<any>;
    deleteProject: (id: string) => Promise<boolean>;
    listFiles: (filters?: { search?: string; fileKind?: string }) => Promise<any[]>;
    importFile: (options?: { projectId?: string; fileKind?: string; mimeType?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<any | null>;
    registerFile: (file: any) => Promise<any>;
    deleteFile: (id: string) => Promise<boolean>;
    listDeliveryPlans: (projectId: string) => Promise<any[]>;
    saveDeliveryPlan: (plan: any) => Promise<any>;
    replaceBreakdown: (payload: any) => Promise<any[]>;
    listAuditEvents: (limit?: number) => Promise<any[]>;
  }

  interface Window {
    rubaDesktop?: RubaDesktopApi;
  }
}
