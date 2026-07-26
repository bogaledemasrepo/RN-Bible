// components/NavigationModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { books } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NavigationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTarget: (bookIndex: number, chapterNumber: number) => void;
}

export function NavigationModal({
  visible,
  onClose,
  onSelectTarget,
}: NavigationModalProps) {
  const [step, setStep] = useState<'book' | 'chapter'>('book');
  const [selectedBookIndex, setSelectedBookIndex] = useState<number>(0);

  const activeBook = books[selectedBookIndex];

  const handleBookSelect = (index: number) => {
    setSelectedBookIndex(index);
    setStep('chapter');
  };

  const handleChapterSelect = (chapNum: number) => {
    onSelectTarget(selectedBookIndex, chapNum);
    setStep('book'); // Reset step for next open
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {step === 'chapter' ? (
            <TouchableOpacity onPress={() => setStep('book')}>
              <Text style={styles.backButton}>‹ መጽሐፍት (Books)</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>መጽሐፍ ይምረጡ (Select Book)</Text>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Step 1: Select Book */}
        {step === 'book' && (
          <FlatList
            data={books}
            keyExtractor={(item) => item.book_id.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.bookRow}
                onPress={() => handleBookSelect(index)}
              >
                <Text style={styles.bookName}>{item.name_am}</Text>
                <Text style={styles.bookSub}>{item.name_en}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Step 2: Select Chapter Grid */}
        {step === 'chapter' && (
          <View style={styles.chapterWrapper}>
            <Text style={styles.sectionHeader}>{activeBook.name_am} - ምዕራፍ</Text>
            <FlatList
              data={Array.from({ length: activeBook.total_chapters||1 }, (_, i) => i + 1)}
              keyExtractor={(item) => item.toString()}
              numColumns={5}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.chapterBox}
                  onPress={() => handleChapterSelect(item)}
                >
                  <Text style={styles.chapterText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  backButton: { fontSize: 16, color: '#8B0000', fontWeight: '600' },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, color: '#64748B' },
  bookRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookName: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  bookSub: { fontSize: 14, color: '#94A3B8' },
  chapterWrapper: { flex: 1, padding: 16 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1E293B' },
  chapterBox: {
    flex: 1,
    margin: 6,
    height: 52,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chapterText: { fontSize: 16, fontWeight: 'bold', color: '#8B0000' },
});