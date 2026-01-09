import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';

export const downloadDB = async () => {
  try {
    // 1. Define the destination directory (standard SQLite location)
    const sqliteDir = new Directory(Paths.document, 'SQLite');

    // 2. Ensure the directory exists (idempotent)
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }

    // 3. Prepare the Asset
    const dbAsset = Asset.fromModule(require('./assets/bible.db'));
    await dbAsset.downloadAsync();

    // 4. Define the target file and copy the asset to it
    // Using the asset's localUri as the source
    if(!dbAsset.localUri) return new Error("URL NOT FOUND!")
    const assetFile = new File(dbAsset.localUri);
    const destinationFile = new File(sqliteDir, 'bible.db');

    // Copy the bundled asset to the SQLite folder
    await assetFile.copy(destinationFile);

    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  }
};