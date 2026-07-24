import { SQLiteDatabase } from "expo-sqlite";

export async function loadChapterContent(db: SQLiteDatabase, bookId: number, chapterNumber: number) {
      try {
        const result = await db.getAllAsync<{ verse_text: string }>(
          `SELECT v.verse_text
           FROM books b
           JOIN chapters c ON b.book_id = c.book_id
           JOIN verses v ON c.chapter_id = v.chapter_id
           WHERE b.book_id = ? AND c.chapter_number = ?
           ORDER BY v.verse_number ASC;`,
          [bookId, chapterNumber]
        );

        if (result && result.length > 0) {
          const formatted = result
            .map((row, index) => `${index + 1}. ${row.verse_text}`)
            .join('\n');
          return formatted;
        }
      } catch (err) {
        console.error('Error reading database:', err);
        return '';                  
      }
    }
