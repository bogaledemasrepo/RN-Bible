import {
  SQLiteProvider,
  useSQLiteContext,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Sqlite({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SQLiteProvider
        databaseName="bible.db"
        assetSource={{
          assetId: require('../assets/bible.db'),
          forceOverwrite: true,
        }}
        onInit={migrateDbIfNeeded}
      >
        <Header />
        {children}
      </SQLiteProvider>
    </SafeAreaView>
  );
}

export function Header() {
  const db = useSQLiteContext();
  const [version, setVersion] = useState('');
  useEffect(() => {
    async function setup() {
      const result = await db.getFirstAsync<{ 'sqlite_version()': string }>(
        'SELECT sqlite_version()'
      );
      setVersion(result?.['sqlite_version()'] || '');
    }
    setup();
  }, []);
  return <View></View>;
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2; // Bump database version

  const dbResult = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  const currentVersion = dbResult?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  // Create table to persist user reader progress
  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY DEFAULT 1,
      book_id INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      page_index INTEGER NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    PRAGMA user_version = ${DATABASE_VERSION};
  `);

  // Add inside your migrateDbIfNeeded function
  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS user_progress (
  id INTEGER PRIMARY KEY DEFAULT 1,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  page_index INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
}