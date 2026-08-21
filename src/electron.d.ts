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
    saveFileToStorage: (payload: {
      fileName: string;
      data: string;
      encoding?: 'base64';
      exportType?: 'pdf' | 'xlsx';
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
    saveFile: (payload: {
      fileName: string;
      data: string;
      encoding?: 'base64';
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
    readFile: (filePath: string) => Promise<{ filePath: string; data: string }>;
    captureWindow: () => Promise<{ canceled: boolean; filePath?: string }>;
    captureWindowData: () => Promise<{ canceled: boolean; data?: string }>;
    dbSummary: () => Promise<{ projects: number; packingLists: number; files: number; deliveryPlans: number; breakdownRows: number }>;
    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<boolean>;
    getStorageRoot: () => Promise<string>;
    syncDeliveryCsv: () => Promise<{ found: boolean; source?: string; modifiedAt?: string; rows?: number; candidates?: string[] }>;
    getDeliveryCsvStatus: () => Promise<{ found: boolean; source?: string; modifiedAt?: string; rows?: number; candidates?: string[] }>;
    chooseStorageRoot: () => Promise<string | null>;
    listProjects: (query?: string) => Promise<any[]>;
    getProject: (id: string) => Promise<any | null>;
    saveProject: (project: any) => Promise<any>;
    deleteProject: (id: string) => Promise<boolean>;
    listPackingLists: (query?: string) => Promise<any[]>;
    getPackingList: (id: string) => Promise<any | null>;
    savePackingList: (packingList: any) => Promise<any>;
    deletePackingList: (id: string) => Promise<boolean>;
    deleteAllPackingLists: () => Promise<number>;
    getTemplatesDbPath: () => Promise<string>;
    listTemplates: (category?: string) => Promise<any[]>;
    saveTemplate: (template: any) => Promise<any>;
    deleteTemplate: (id: string) => Promise<boolean>;
    seedTemplates: (templates: any[]) => Promise<any[]>;
    getExportFolders: () => Promise<{ root: string; pdf: string; xlsx: string }>;
    listExportFiles: (type?: string) => Promise<Array<{ name: string; type: string; filePath: string; sizeBytes: number; updatedAt: string }>>;
    openExportFolder: () => Promise<string>;
    openExportFile: (filePath: string) => Promise<string>;
    openStoredFile: (filePath: string) => Promise<string>;
    deleteExportFile: (filePath: string) => Promise<boolean>;
    saveWindowPdf: (payload: { fileName?: string }) => Promise<{ canceled: boolean; filePath?: string }>;
    listFiles: (filters?: { search?: string; fileKind?: string }) => Promise<any[]>;
    importFile: (options?: { projectId?: string; fileKind?: string; mimeType?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<any | null>;
    registerFile: (file: any) => Promise<any>;
    deleteFile: (id: string) => Promise<boolean>;
    listDeliveryPlans: (projectId: string) => Promise<any[]>;
    getDeliveryReferenceOptions: (orderNumber?: string) => Promise<{ rows: any[]; customers: string[]; pos: string[]; colors: string[]; destinations: string[]; dimensions: Array<{ orderNumber: string; po: string; customer: string; color: string; destination: string; length: number; width: number; height: number; cbm: number }> }>;
    saveDeliveryPlan: (plan: any) => Promise<any>;
    replaceBreakdown: (payload: any) => Promise<any[]>;
    listAuditEvents: (limit?: number) => Promise<any[]>;
  }

  interface Window {
    rubaDesktop?: RubaDesktopApi;
  }
}
