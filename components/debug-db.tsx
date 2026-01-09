import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

export function DatabaseDebugger() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ size: 0, rows: 0, path: '' });

  useEffect(() => {
    async function getStats() {
      try {
        const dbPath = `${FileSystem.documentDirectory}SQLite/bible.db`;
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        
        // Count total verses
        const result = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM books'
        );
        console.log(result)

        setStats({
          size: fileInfo.exists ? fileInfo.size : 0,
          rows: result?.count || 0,
          path: dbPath
        });
      } catch (e) {
        console.error("Debug Check Failed", e);
      }
    }
    getStats();
  }, []);

  return (
    <View style={styles.debugBadge}>
      <Text style={styles.debugText}>DB Size: {(stats.size / 1024 / 1024).toFixed(2)} MB</Text>
      <Text style={styles.debugText}>Total Verses: {stats.rows.toLocaleString()}</Text>
      {stats.rows === 0 && <Text style={styles.errorText}>⚠️ DATABASE IS EMPTY</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  debugBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    zIndex: 9999,
  },
  debugText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  errorText: { color: '#ff4444', fontSize: 14, marginTop: 5, fontWeight: '900' }
});