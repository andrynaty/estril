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
  }

  interface Window {
    rubaDesktop?: RubaDesktopApi;
  }
}
