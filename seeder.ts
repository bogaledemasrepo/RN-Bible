// async function seedData() {
//     setIsImporting(true);
//     try {
//       // 1. Create Tables
//       await db.execAsync(`
//         PRAGMA journal_mode = WAL;
//         CREATE TABLE IF NOT EXISTS books (
//             book_id INTEGER PRIMARY KEY,
//             name_am TEXT,
//             short_name_am TEXT,
//             name_en TEXT,
//             short_name_en TEXT,
//             testament TEXT
//         );
//         CREATE TABLE IF NOT EXISTS chapters (
//             chapter_id INTEGER PRIMARY KEY AUTOINCREMENT,
//             book_id INTEGER,
//             chapter_number INTEGER,
//             section_title TEXT,
//             FOREIGN KEY (book_id) REFERENCES books (book_id)
//         );
//         CREATE TABLE IF NOT EXISTS verses (
//             verse_id INTEGER PRIMARY KEY AUTOINCREMENT,
//             chapter_id INTEGER,
//             verse_number INTEGER,
//             verse_text TEXT,
//             FOREIGN KEY (chapter_id) REFERENCES chapters (chapter_id)
//         );
//       `);

//       // 2. Check if data already exists to avoid duplicates
//       const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM books') as {
//                 count: number;
//                 };
//       if (count.count > 0) {
//         console.log("Data already seeded.");
//         setIsImporting(false);
//         return;
//       }

//       // 3. Start Transaction
//       await db.withTransactionAsync(async () => {
//         for (const book of data) {
//           await db.runAsync(
//             `INSERT INTO books (book_id, name_am, short_name_am, name_en, short_name_en, testament) VALUES (?, ?, ?, ?, ?, ?)`,
//             [book.book_number, book.book_name_am, book.book_short_name_am, book.book_name_en, book.book_short_name_en, book.testament]
//           );

//           for (const ch of book.chapters) {
//             for (const section of ch.sections) {
//               const result = await db.runAsync(
//                 `INSERT INTO chapters (book_id, chapter_number, section_title) VALUES (?, ?, ?)`,
//                 [book.book_number, ch.chapter, section.title]
//               );

//               const chapterId = result.lastInsertRowId;

//               for (const v of section.verses) {
//                 await db.runAsync(
//                   `INSERT INTO verses (chapter_id, verse_number, verse_text) VALUES (?, ?, ?)`,
//                   [chapterId, v.verse, v.text]
//                 );
//               }
//             }
//           }
//         }
//       });

//       console.log("Data Import Successful!");
//     } catch (error) {
//       console.error("Error seeding data:", error);
//     } finally {
//       setIsImporting(false);
//     }
//   }