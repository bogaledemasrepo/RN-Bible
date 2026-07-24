import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Sqlite({ children }: { children: React.ReactNode }) {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <SQLiteProvider 
            databaseName="bible.db" 
            assetSource={{ assetId: require('../assets/bible.db'), forceOverwrite: true }}
            onInit={migrateDbIfNeeded}>
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
    return (
        <View>
        </View>
    );
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
    const DATABASE_VERSION = 1;

    const dbResult = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
    );

    const currentVersion = dbResult?.user_version ?? 0;

    if (currentVersion >= DATABASE_VERSION) {
        return console.log("Database up to date!");
    }

    // Future version migrations (e.g. schema changes for existing users)
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}