import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export async function writeTextFile(fileName: string, content: string, directory: Directory = Directory.Data): Promise<boolean> {
  try {
    await Filesystem.writeFile({ path: fileName, data: content, directory, encoding: Encoding.UTF8 });
    return true;
  } catch (error) {
    return false;
  }
}

export async function readTextFile(fileName: string, directory: Directory = Directory.Data): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path: fileName, directory, encoding: Encoding.UTF8 });
    return result.data as string;
  } catch (error) {
    return null;
  }
}

export async function writeImageFile(fileName: string, base64Data: string, directory: Directory = Directory.Data): Promise<string | null> {
  try {
    const result = await Filesystem.writeFile({ path: fileName, data: base64Data, directory });
    return result.uri;
  } catch (error) {
    return null;
  }
}

export async function deleteFile(fileName: string, directory: Directory = Directory.Data): Promise<boolean> {
  try {
    await Filesystem.deleteFile({ path: fileName, directory });
    return true;
  } catch (error) {
    return false;
  }
}

export async function fileExists(fileName: string, directory: Directory = Directory.Data): Promise<boolean> {
  try {
    await Filesystem.stat({ path: fileName, directory });
    return true;
  } catch (error) {
    return false;
  }
}

export async function listFiles(path: string = '', directory: Directory = Directory.Data): Promise<string[]> {
  try {
    const result = await Filesystem.readdir({ path, directory });
    return result.files.map((file) => (typeof file === 'string' ? file : file.name));
  } catch (error) {
    return [];
  }
}

export async function createDirectory(path: string, directory: Directory = Directory.Data): Promise<boolean> {
  try {
    await Filesystem.mkdir({ path, directory, recursive: true });
    return true;
  } catch (error) {
    return false;
  }
}

export async function deleteDirectory(path: string, directory: Directory = Directory.Data): Promise<boolean> {
  try {
    await Filesystem.rmdir({ path, directory, recursive: true });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getFileInfo(fileName: string, directory: Directory = Directory.Data) {
  try {
    const stat = await Filesystem.stat({ path: fileName, directory });
    return { size: stat.size, modifiedTime: stat.mtime, createdTime: stat.ctime, type: stat.type, uri: stat.uri };
  } catch (error) {
    return null;
  }
}

export async function getCacheDirectory(): Promise<string | null> {
  try {
    const result = await Filesystem.getUri({ path: '', directory: Directory.Cache });
    return result.uri;
  } catch (error) {
    return null;
  }
}

export async function getDataDirectory(): Promise<string | null> {
  try {
    const result = await Filesystem.getUri({ path: '', directory: Directory.Data });
    return result.uri;
  } catch (error) {
    return null;
  }
}

export async function clearCache(): Promise<boolean> {
  try {
    const files = await listFiles('', Directory.Cache);
    for (const file of files) await deleteFile(file, Directory.Cache);
    return true;
  } catch (error) {
    return false;
  }
}
