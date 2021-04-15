import { promises } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";

export async function findFiles(dir: string, recursive: boolean = false): Promise<string[]> {
    try {
        if (recursive) return await (await findFilesRecursive(dir)).map(f => f.substr(join(dir).length))
        return await (promises.readdir(dir));
    } catch (err) {
        return [];
    }
}

export async function findFolders(dir: string): Promise<string[]> {
    const entries = await readdir(dir);
    return await Promise.all(entries.filter(async f => (await stat(`${dir}/${f}`)).isDirectory()));
}

async function findFilesRecursive(dir: string, allFiles: string[] = []): Promise<string[]> {
    const files = (await promises.readdir(dir)).map(f => join(dir, f))
    allFiles.push(...files)
    await Promise.all(files.map(async f => (await promises.stat(f)).isDirectory() && findFilesRecursive(f, allFiles)));
    return allFiles;
}
