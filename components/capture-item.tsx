// capture-item.tsx
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { makeImageFromView, SkImage } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CaptureItem({
  children,
  onCaptured,
}: {
  children: React.ReactNode;
  onCaptured: (img: SkImage) => void;
}) {
  const viewRef = useRef<View>(null);
  const isCaptured = useRef(false);

  const handleLayout = () => {
    if (isCaptured.current) return;
    isCaptured.current = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          if (viewRef.current) {
            const image = await makeImageFromView(viewRef as any);
            if (image) {
              onCaptured(image);
            }
          }
        } catch (e) {
          console.warn('Snapshot capture failed:', e);
        }
      });
    });
  };

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      collapsable={false}
      renderToHardwareTextureAndroid={true} // Prevents sub-pixel rendering jitter on Android
      style={styles.captureContainer}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  captureContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
