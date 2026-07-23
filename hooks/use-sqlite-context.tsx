import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Sqlite({ children }: { children: React.ReactNode }) {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <SQLiteProvider databaseName="bible.db" onInit={migrateDbIfNeeded}>
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
    console.log('migrateDbIfNeeded');
    const DATABASE_VERSION = 1;

    // 1. Fetch current version safely
    const dbResult = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
    );

    const currentVersion = dbResult?.user_version ?? 0;
    console.log('dbResult', currentVersion);

    // Fix: Proper operator precedence check
    if (currentVersion >= DATABASE_VERSION) {
        return console.log("Migration not needed!");
    }

    console.log(`migrating database from version ${currentVersion} to ${DATABASE_VERSION}`);

    // 2. Perform schema creation and initial inserts inside a transaction
    if (currentVersion === 1) {
        await db.execAsync(`PRAGMA journal_mode = WAL;`);

        await db.withTransactionAsync(async () => {
            await db.execAsync(`
                DROP TABLE books;
                CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY NOT NULL, 
                value TEXT NOT NULL, 
                intValue INTEGER
                );
            `);

            await db.runAsync('INSERT INTO books (value, intValue) VALUES (?, ?)', `መዝሙር 81\n\n1. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n2. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር። \n 3. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 4. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 5. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 6. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n`, 1);
            await db.runAsync('INSERT INTO books (value, intValue) VALUES (?, ?)', `መዝሙር 82\n\n1. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n2. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር። \n 3. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 4. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 5. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 6. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n`, 2);
            await db.runAsync('INSERT INTO books (value, intValue) VALUES (?, ?)', `መዝሙር 83\n\n1. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n2. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር። \n 3. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 4. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 5. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 6. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n`, 3);
            await db.runAsync('INSERT INTO books (value, intValue) VALUES (?, ?)', `መዝሙር 84\n\n1. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n2. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር። \n 3. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 4. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 5. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 6. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n`, 4);
            await db.runAsync('INSERT INTO books (value, intValue) VALUES (?, ?)', `መዝሙር 85\n\n1. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n2. መዝሙር አንሡ ከበሮንም ስጡ፥ ደስ የሚያሰኘውን በገና ከበገና ጋር። \n 3. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 4. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 5. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n 6. ለረዳታችን ለእግዚአብሔር እልል በሉ፥ ለያዕቆብ አምላክ እልል በሉ፤\n`, 5);
        });

    }

    // 3. Update PRAGMA user_version after transaction completes
    console.log('updating user_version to', DATABASE_VERSION);
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}
